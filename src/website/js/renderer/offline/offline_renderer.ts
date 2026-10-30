import {
    BaseRenderer,
    browserCanvasFactory,
    type RendererCanvasFactory
} from "../base/renderer.ts";
import {
    createXGRouting,
    getXGInsertionLabels
} from "../base/xg_insertion_labels.ts";
import { gsInsertionEffectData } from "../../synthesizer_ui/methods/gs_effect_params.ts";
import { ProgramTracker } from "../base/program_tracker.ts";
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
 * The maximum waveform length, in samples.
 */
export const MAX_WAVEFORM_SAMPLES = 32_768;

/**
 * The data the offline renderer needs from the sequenced MIDI.
 */
export interface OfflineMIDIData {
    /**
     * Note times in render time, for all loop iterations.
     */
    noteTimes: NoteTime[][];
    usedChannels: Set<number>;
    usedParts: Set<number>;
}

/**
 * Everything needed to construct an offline renderer.
 * Plain data, so it can be sent to a worker.
 */
export interface OfflineRendererData {
    snapshot: VideoSettingsSnapshot;
    /**
     * Per-channel waveforms, starting at `waveformOffset`.
     */
    waveforms: Float32Array[];
    /**
     * The sample index of the first waveform sample.
     */
    waveformOffset: number;
    /**
     * The full length of the waveforms, in samples.
     */
    waveformLength: number;
    sampleRate: number;
    eventLog: VideoSynthData;
    midi: OfflineMIDIData;
    width: number;
    height: number;
    /**
     * The background image, drawn to cover the frame under a dark overlay.
     */
    background?: ImageBitmap;
}

/**
 * The locale is not needed, the texts come from the snapshot.
 */
const noLocale = {
    bindObjectProperty: () => {
        // Nothing to bind
    }
};

/**
 * Prepares the MIDI data for the offline renderer.
 * Builds render-time note times from the sequenced MIDI, converting song
 * time to render time and pasting copies for each loop iteration so the
 * entire timeline is covered without per-frame time switching.
 * @param midi The sequenced MIDI.
 * @param loopCount The number of loop iterations.
 * @param playbackRate The playback rate.
 * @param duration The render duration, in seconds.
 */
export function getOfflineMIDIData(
    midi: BasicMIDI,
    loopCount: number,
    playbackRate: number,
    duration: number
) {
    const rate = playbackRate;
    const firstNoteOffset = midi.midiTicksToSeconds(midi.firstNoteOn);
    const loopStartSong = midi.midiTicksToSeconds(midi.loop.start);
    const loopEndSong = midi.midiTicksToSeconds(midi.loop.end);

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
        // The sequencer jumps back to the loop start when it reaches the loop end,
        // So every iteration starts one loop duration after the previous one.
        // Render time starts at the first note.
        const loopDurationRender = (loopEndSong - loopStartSong) / rate;
        const loopStartRender = (loopStartSong - firstNoteOffset) / rate;
        const loopEndRender = (loopEndSong - firstNoteOffset) / rate;

        for (let ch = 0; ch < 16; ch++) {
            const notes = baseNoteTimes[ch];

            const loopNotes = notes.filter(
                (n) => n.start >= loopStartRender && n.start < loopEndRender
            );
            // The notes after the loop end only play once all loops are done
            for (const note of notes) {
                if (note.start >= loopEndRender) {
                    note.start += loopDurationRender * loopCount;
                }
            }

            for (let i = 1; i <= loopCount; i++) {
                const offset = i * loopDurationRender;
                for (const note of loopNotes) {
                    const pastedStart = note.start + offset;

                    const pastedLength = Math.min(
                        note.length,
                        duration - pastedStart
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

    const tracker = new ProgramTracker();
    tracker.updateUsedFromMIDI(midi);
    return {
        noteTimes: baseNoteTimes,
        usedChannels: tracker.usedChannels,
        usedParts: tracker.usedParts
    };
}

/**
 *  Offline renderer for rendering videos. Replays the recorded single-stream
 *  event log through the shared interpreters with a forward-only cursor,
 *  so every frame is a deterministic function of the log.
 */
export class OfflineRenderer extends BaseRenderer {
    private readonly eventLog: VideoSynthData;
    private eventIndex = 0;
    /**
     * Pending transposed keyboard notes, keyed by `channel:midiNote`.
     */
    private readonly keyboardPending = new Map<string, number[]>();
    private waveforms: Float32Array[];
    private waveformOffset: number;
    private readonly waveformLength: number;
    private readonly sampleRate: number;
    private readonly sampleCount: number;
    private readonly blackMIDIMode: boolean;
    private readonly background?: ImageBitmap;
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
    // The render synthesizer is fresh, so every block starts with its defaults
    private readonly xgRouting = createXGRouting();
    private readonly globalParams: RendererGlobalParams = {
        systemKeyShift: 0,
        systemFineTune: 0,
        midiKeyShift: 0,
        midiFineTune: 0
    };

    public constructor(
        data: OfflineRendererData,
        canvasFactory: RendererCanvasFactory = browserCanvasFactory
    ) {
        const snapshot = data.snapshot;
        const canvas = canvasFactory(data.width, data.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Failed to acquire drawing context.");
        }

        super(
            snapshot.keyboard.channelColors,
            canvas,
            ctx,
            noLocale,
            false,
            snapshot.renderer.version,
            new BaseKeyboard(ctx, snapshot.keyboard, canvasFactory),
            canvasFactory
        );
        this.eventLog = data.eventLog;
        this.background = data.background;
        this.playbackRate = snapshot.playbackRate;
        this.blackMIDIMode = snapshot.renderer.blackMIDIMode;

        this.programTracker.setUsed(
            data.midi.usedChannels,
            data.midi.usedParts
        );
        this.noteTimes = data.midi.noteTimes.map((notes) => ({
            notes,
            renderStartIndex: 0
        }));

        this.applySnapshot(snapshot.renderer);
        this.showFps = false;
        this.showEngineMode = false;
        // Firefox draws offscreen canvases in software,
        // Where splitting makes the waveforms 3x faster
        this.waveformStrokeChunk = 64;
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
        this.texts.efxName = "Thru";
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

        this.waveforms = data.waveforms;
        this.waveformOffset = data.waveformOffset;
        this.waveformLength = data.waveformLength;
        this.sampleRate = data.sampleRate;
        const targetFft =
            snapshot.renderer.analyserFftSize *
            (snapshot.renderer.stabilizeWaveforms ? 4 : 1);
        const rateFactor = snapshot.renderer.sampleRate / 44_100;
        const fftSize = Math.min(
            MAX_WAVEFORM_SAMPLES,
            1 << (31 - Math.clz32(targetFft * rateFactor))
        );
        this.sampleCount = Math.max(
            1,
            Math.min(
                MAX_WAVEFORM_SAMPLES,
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
        this.processEvents(t);
        for (let ch = 0; ch < this.parts.length; ch++) {
            this.loadWaveform(ch, t);
        }
        this.notesOnScreen = 0;
        this.renderFullFrame(t, t, false);
    }

    /**
     * Advances the state to a frame without drawing it.
     * The following frames are then drawn the same as if this frame was drawn.
     * @param t Time, in seconds.
     */
    public skipFrame(t: number) {
        this.processEvents(t);
        // The skipped waveforms are not available, so the history is stale
        for (const trigger of this.waveformTriggers) {
            trigger.reset();
        }
        if (this.renderDotDisplay) {
            this.dotMatrix.advance(t);
        }
        this.keyboard.pruneReleasedKeys(t);
    }

    /**
     * Replaces the waveforms with a slice of them.
     * It must contain the samples of the frames drawn until the next call.
     * @param waveforms The per-channel waveform slices.
     * @param offset The sample index of the first slice sample.
     */
    public setWaveforms(waveforms: Float32Array[], offset: number) {
        this.waveforms = waveforms;
        this.waveformOffset = offset;
    }

    protected override renderBigSpectrum() {
        this.renderStraightWaveforms();
    }

    protected override renderSplitSpectrum() {
        this.renderStraightWaveforms();
    }

    protected override clearFrame() {
        this.updateCanvasColors();
        // Same 45 degree canvas background as the live canvas CSS
        const gradient = this.ctx.createLinearGradient(
            0,
            this.canvas.height,
            this.canvas.width,
            0
        );
        gradient.addColorStop(0, this.canvasBackgroundStart);
        gradient.addColorStop(1, this.canvasBackgroundEnd);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        const bg = this.background;
        if (!bg) {
            return;
        }
        // Equivalent of CSS "background-size: cover", centered
        const scale = Math.max(
            this.canvas.width / bg.width,
            this.canvas.height / bg.height
        );
        const w = bg.width * scale;
        const h = bg.height * scale;
        this.ctx.drawImage(
            bg,
            (this.canvas.width - w) / 2,
            (this.canvas.height - h) / 2,
            w,
            h
        );
        // Same dim overlay as the live canvas
        this.ctx.fillStyle = this.canvasOverlayColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Processes the events up to the given time.
     * @param t Time, in seconds.
     */
    private processEvents(t: number) {
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
                case "effectChange": {
                    const data = e.data;
                    switch (data.effect) {
                        case "gsInsertion": {
                            if (data.parameter === "type") {
                                this.texts.efxName =
                                    gsInsertionEffectData.find(
                                        (fx) => fx.type === data.value
                                    )?.name ?? "Thru";
                            }
                            break;
                        }
                        case "xgInsertion": {
                            const block =
                                this.xgRouting.insertions[data.insertionNumber];
                            if (data.parameter === "partNumber") {
                                block.part = data.value;
                            } else if (data.parameter === "type") {
                                block.type = data.value;
                            } else {
                                break;
                            }
                            this.updateXGLabels();
                            break;
                        }
                        case "xgVariation": {
                            const variation = this.xgRouting.variation;
                            switch (data.parameter) {
                                case "partNumber": {
                                    variation.part = data.value;
                                    break;
                                }
                                case "type": {
                                    variation.type = data.value;
                                    break;
                                }
                                case "connection": {
                                    variation.insertionMode =
                                        data.value === "insertion";
                                    break;
                                }
                                default: {
                                    break;
                                }
                            }
                            this.updateXGLabels();
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
        if (data === undefined || this.waveformLength === 0) {
            waveform.fill(0);
            this.parts[ch].waveformLength = 0;
            return;
        }
        const len = Math.min(this.sampleCount, this.waveformLength);
        const sliceStart = Math.max(0, start);
        const sliceEnd = Math.min(start + len, this.waveformLength);
        waveform.fill(0);
        if (sliceEnd > sliceStart) {
            const offset = sliceStart - start;
            waveform.set(
                data.subarray(
                    sliceStart - this.waveformOffset,
                    sliceEnd - this.waveformOffset
                ),
                offset
            );
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

    private updateXGLabels() {
        const labels = getXGInsertionLabels(this.xgRouting);
        for (const [channel, label] of labels.entries()) {
            this.parts[channel].xgInsertion = label;
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
