import {
    BaseRenderer,
    browserCanvasFactory,
    type RendererCanvasFactory,
    type RendererLocaleBinder
} from "../base/renderer.ts";
import { BaseKeyboard } from "../../canvas_keyboard/base/base_keyboard.ts";
import type { VideoSettingsSnapshot } from "../../manager/export/video/snapshot_settings.ts";
import type { VideoInitialParams, VideoSynthData } from "./events.ts";
import {
    type BasicMIDI,
    MIDI_DRUM_CHANNEL,
    type NoteTime
} from "spessasynth_core";

/**
 * Tracked channel parameters used by the event replay. Only the parameters
 * that affect drawing are tracked. Mirrors the recorded initial channel
 * parameters, plus the drum state for the transpose chain.
 */
type RendererChannels = VideoInitialParams["channel"][number] & {
    isDrum: boolean;
};

/**
 * Tracked global parameters used by the event replay. Mirrors the recorded
 * initial global parameters without the system (applied to the renderer
 * directly).
 */
type RendererGlobalParams = Omit<VideoInitialParams["global"], "system">;

/**
 *  Offline renderer for rendering videos. Replays the recorded single-stream
 *  event log through the shared interpreters with a forward-only cursor,
 *  so every frame is a deterministic function of the log.
 */
export class OfflineRenderer extends BaseRenderer {
    private readonly frameWidth: number;
    private readonly frameHeight: number;
    private readonly eventLog: VideoSynthData;
    private readonly duration: number;
    private eventIndex = 0;
    /**
     * Pending transposed keyboard notes, keyed by `channel:midiNote`.
     */
    private readonly keyboardPending = new Map<string, number[]>();
    private readonly waveforms: Float32Array[];
    private readonly sampleRate: number;
    private readonly sampleCount: number;
    private readonly blackMIDIMode: boolean;
    /**
     * Event-sourced tracked state: raw parameter values accumulated from the
     * log, recomposed into `parts` after every relevant event. Live keeps no
     * tracked state and pulls the same values from the synthesizer instead.
     */
    private readonly channels: RendererChannels[] = Array.from(
        { length: 16 },
        // eslint-disable-next-line unicorn/consistent-function-scoping
        (_, i) => ({
            systemKeyShift: 0,
            systemFineTune: 0,
            midiKeyShift: 0,
            midiFineTune: 0,
            pitchWheel: 8192,
            pitchWheelRange: 2,
            isDrum: i === MIDI_DRUM_CHANNEL,
            efxAssign: false
        })
    );
    private readonly globalParams: RendererGlobalParams = {
        systemKeyShift: 0,
        systemFineTune: 0,
        midiKeyShift: 0,
        midiFineTune: 0
    };

    public constructor(
        snapshot: VideoSettingsSnapshot,
        waveforms: Float32Array[],
        sampleRate: number,
        eventLog: VideoSynthData,
        duration: number,
        loopCount: number,
        midi: BasicMIDI,
        frameWidth: number,
        frameHeight: number,
        locale: RendererLocaleBinder,
        canvasFactory: RendererCanvasFactory = browserCanvasFactory
    ) {
        const canvas = canvasFactory(frameWidth, frameHeight);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Failed to acquire drawing context.");
        }

        super(
            snapshot.keyboard.channelColors,
            canvas,
            ctx,
            locale,
            false,
            snapshot.renderer.version,
            new BaseKeyboard(ctx, snapshot.keyboard),
            canvasFactory
        );
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.eventLog = eventLog;
        this.duration = duration;
        this.playbackRate = snapshot.playbackRate;
        this.blackMIDIMode = snapshot.renderer.blackMIDIMode;

        this.programTracker.updateUsedFromMIDI(midi);

        // Build note times, adjusting for playback rate
        this.buildNoteTimes(midi, loopCount);

        this.applySnapshot(snapshot.renderer);
        this.showFps = false;
        this.showEngineMode = false;
        this.timeOffset = 0;
        this.workerMode = false;
        this.version = snapshot.renderer.version;

        // Apply the initial state
        const initial = this.eventLog.initialState;
        // HUD
        this.texts.timeSignature = "4/4";
        this.currentTempo = 120 * this.playbackRate;
        // Global parameters
        const global = this.globalParams;
        global.systemKeyShift = initial.global.systemKeyShift;
        global.systemFineTune = initial.global.systemFineTune;
        global.midiKeyShift = initial.global.midiKeyShift;
        global.midiFineTune = initial.global.midiFineTune;
        this.system = initial.global.system;
        // Channels
        for (let ch = 0; ch < this.parts.length; ch++) {
            const state = this.channels[ch];
            const src = initial.channel[ch];
            // The drum state comes from the render-time-zero programs;
            // Later changes are tracked via program changes.
            state.isDrum =
                initial.programs[ch]?.isDrum ?? ch === MIDI_DRUM_CHANNEL;
            if (src) {
                state.systemKeyShift = src.systemKeyShift;
                state.systemFineTune = src.systemFineTune;
                state.midiKeyShift = src.midiKeyShift;
                state.midiFineTune = src.midiFineTune;
                state.pitchWheel = src.pitchWheel;
                state.pitchWheelRange = src.pitchWheelRange;
                state.efxAssign = src.efxAssign;
            }
            this.updatePartState(ch);
        }
        // Preset names
        this.programTracker.loadPresetNames(initial.programs);

        this.waveforms = waveforms;
        this.sampleRate = sampleRate;
        const targetFft =
            snapshot.renderer.analyserFftSize *
            (snapshot.renderer.stabilizeWaveforms ? 4 : 1);
        const rateFactor = snapshot.renderer.sampleRate / 44_100;
        const fftSize = Math.min(
            32_768,
            1 << (31 - Math.clz32(targetFft * rateFactor))
        );
        this.sampleCount = Math.max(
            1,
            Math.min(
                32_768,
                Math.round(
                    (fftSize * this.sampleRate) / snapshot.renderer.sampleRate
                )
            )
        );
    }

    protected get highPerformanceMode() {
        return this.blackMIDIMode;
    }

    /**
     * Draws a full frame.
     * @param t Time, in seconds.
     */
    public drawFrame(t: number) {
        // Advance and process events
        const events = this.eventLog.events;
        while (
            this.eventIndex < events.length &&
            events[this.eventIndex].t <= t
        ) {
            const e = events[this.eventIndex++];
            switch (e.type) {
                case "noteOn": {
                    const data = e.data;
                    const inRange = data.channel >= 0 && data.channel < 16;
                    const note = inRange
                        ? Math.round(
                              data.midiNote + this.parts[data.channel].transpose
                          )
                        : data.midiNote;
                    const key = `${data.channel}:${data.midiNote}`;
                    const pending = this.keyboardPending.get(key);
                    if (pending) {
                        pending.push(note);
                    } else {
                        this.keyboardPending.set(key, [note]);
                    }
                    this.keyboard.pressKey(
                        note,
                        data.channel,
                        data.velocity,
                        e.t
                    );
                    break;
                }
                case "noteOff": {
                    const key = `${e.data.channel}:${e.data.midiNote}`;
                    const pending = this.keyboardPending.get(key);
                    const note = pending?.shift();
                    if (pending?.length === 0) {
                        this.keyboardPending.delete(key);
                    }
                    if (note !== undefined) {
                        this.keyboard.releaseKey(note, e.data.channel, e.t);
                    }
                    break;
                }
                case "channelParamChange": {
                    const data = e.data;
                    if (
                        data.channel < 0 ||
                        data.channel >= this.channels.length
                    ) {
                        break;
                    }
                    const state = this.channels[data.channel];
                    switch (data.parameter) {
                        case "pitchWheel": {
                            state.pitchWheel = data.value;
                            break;
                        }
                        case "pitchWheelRange": {
                            state.pitchWheelRange = data.value;
                            break;
                        }
                        case "keyShift": {
                            state.midiKeyShift = data.value;
                            break;
                        }
                        case "fineTune": {
                            state.midiFineTune = data.value;
                            break;
                        }
                        case "efxAssign": {
                            state.efxAssign = data.value;
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                    this.updatePartState(data.channel);
                    break;
                }
                case "globalParamChange": {
                    const data = e.data;
                    switch (data.parameter) {
                        case "system": {
                            this.system = data.value;
                            break;
                        }
                        case "keyShift": {
                            this.globalParams.midiKeyShift = data.value;
                            this.updateGlobalState();
                            break;
                        }
                        case "fineTune": {
                            this.globalParams.midiFineTune = data.value;
                            this.updateGlobalState();
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                    break;
                }
                case "programChange": {
                    const data = e.data;
                    if (data.channel >= 0 && data.channel < 16) {
                        this.channels[data.channel].isDrum = data.isDrum;
                        this.updatePartState(data.channel);
                    }
                    this.programTracker.programChange(data);
                    break;
                }
                case "metaEvent": {
                    this.handleMetaEvent(e.data.event);
                    break;
                }
                case "displayMessage": {
                    this.dotMatrix.displayMessage(e.data);
                    break;
                }
            }
        }

        for (let ch = 0; ch < this.parts.length; ch++) {
            this.loadWaveform(ch, t);
        }
        this.notesOnScreen = 0;
        this.renderFullFrame(t, t, false);
        this.ctx.drawImage(
            this.canvas,
            0,
            0,
            this.frameWidth,
            this.frameHeight
        );
    }

    protected override renderBigSpectrum() {
        this.renderStraightWaveforms();
    }

    protected override renderSplitSpectrum() {
        this.renderStraightWaveforms();
    }

    protected override clearFrame() {
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Builds render-time note times from the sequenced MIDI, converting song
     * time to render time and pasting copies for each loop iteration so the
     * entire timeline is covered without per-frame time switching.
     * @param midi The sequenced MIDI.
     * @param loopCount The number of loop iterations.
     */
    private buildNoteTimes(midi: BasicMIDI, loopCount: number) {
        const rate = this.playbackRate;
        const firstNoteOffset = midi.midiTicksToSeconds(midi.firstNoteOn);
        const loopStartSong = midi.midiTicksToSeconds(midi.loop.start);
        const loopEndSong = midi.midiTicksToSeconds(midi.loop.end);
        const songDuration = midi.duration;

        const songTimeNotes = midi.getNoteTimes(0.02);

        // Build the base note times in render time.
        const baseNoteTimes: NoteTime[][] = [];
        for (const channelNotes of songTimeNotes) {
            const renderNotes: NoteTime[] = [];
            for (const note of channelNotes) {
                const renderStart = (note.start - firstNoteOffset) / rate;
                renderNotes.push({
                    midiNote: note.midiNote,
                    start: renderStart,
                    length: note.length / rate,
                    velocity: note.velocity
                });
            }
            baseNoteTimes.push(renderNotes);
        }

        // Paste the loop region notes for each loop.
        if (loopCount > 0) {
            // First playthrough ends at (songDuration - firstNoteOffset) / rate
            // In render time, because the render time starts at the first note.
            const firstPlayDuration = (songDuration - firstNoteOffset) / rate;
            const loopDurationRender = (loopEndSong - loopStartSong) / rate;
            const loopStartRender = (loopStartSong - firstNoteOffset) / rate;
            const loopEndRender = (loopEndSong - firstNoteOffset) / rate;

            for (let ch = 0; ch < 16; ch++) {
                const notes = baseNoteTimes[ch];

                const loopNotes = notes.filter(
                    (n) => n.start >= loopStartRender && n.start < loopEndRender
                );

                for (let i = 1; i <= loopCount; i++) {
                    const offset =
                        firstPlayDuration + (i - 1) * loopDurationRender;
                    for (const note of loopNotes) {
                        const pastedStart = note.start + offset;

                        const pastedLength = Math.min(
                            note.length,
                            this.duration - pastedStart
                        );
                        if (pastedLength > 0) {
                            notes.push({
                                midiNote: note.midiNote,
                                start: pastedStart,
                                length: pastedLength,
                                velocity: note.velocity
                            });
                        }
                    }
                }
                notes.sort((a, b) => a.start - b.start);
            }
        }

        this.noteTimes = baseNoteTimes.map((notes) => ({
            notes,
            renderStartIndex: 0
        }));
    }

    private renderStraightWaveforms() {
        const waveWidth = this.width / 4;
        const waveHeight = this.height / 4;
        for (let ch = 0; ch < this.parts.length; ch++) {
            this.renderSingleWaveform(ch, true, waveWidth, waveHeight);
        }
    }

    private loadWaveform(ch: number, t: number) {
        const end = Math.floor(t * this.sampleRate);
        const start = end - this.sampleCount;
        const waveform = this.parts[ch].waveform;
        const data = this.waveforms[ch];
        if (data === undefined || data.length === 0) {
            waveform.fill(0);
            this.parts[ch].waveformLength = 0;
            return;
        }
        const len = Math.min(this.sampleCount, data.length);
        const sliceStart = Math.max(0, start);
        const sliceEnd = Math.min(start + len, data.length);
        waveform.fill(0);
        if (sliceEnd > sliceStart) {
            const offset = sliceStart - start;
            waveform.set(data.slice(sliceStart, sliceEnd), offset);
        }
        this.parts[ch].waveformLength = len;
    }

    /**
     * Updates all part (channel) states.
     */
    private updateGlobalState() {
        for (let ch = 0; ch < this.parts.length; ch++) {
            this.updatePartState(ch);
        }
    }

    /**
     * Updates the current part (channel) state.
     * @param channel The channel (0-15).
     */
    private updatePartState(channel: number) {
        const state = this.channels[channel];
        const global = this.globalParams;
        const part = this.parts[channel];
        part.isDrum = state.isDrum;
        part.visualPitchTranspose =
            state.pitchWheelRange * ((state.pitchWheel - 8192) / 8192);
        const local =
            state.systemKeyShift +
            state.systemFineTune / 100 +
            state.midiKeyShift +
            state.midiFineTune / 100;
        part.transpose = state.isDrum
            ? local
            : local +
              global.systemKeyShift +
              global.systemFineTune / 100 +
              global.midiKeyShift +
              global.midiFineTune / 100;
        part.efxAssign = state.efxAssign;
    }
}
