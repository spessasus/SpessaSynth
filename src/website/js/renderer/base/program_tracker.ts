import {
    type BasicMIDI,
    MIDI_DRUM_CHANNEL,
    type MIDIPatch,
    type MIDIPatchFull,
    type ProgramChangeEvent
} from "spessasynth_core";

/**
 * Track the current preset for each channel, limited to the first 16 channels.
 */
export class ProgramTracker {
    /**
     * The current preset names for each channel.
     */
    public readonly presetNames: string[] = [];
    /**
     * All used channels (multiport) for the current MIDI or all if no MIDI is playing.
     */
    public readonly usedChannels = new Set<number>();
    /**
     * Same as usedChannels, except only 0-15 MIDI channels.
     */
    public readonly usedParts = new Set<number>();
    private readonly channelTrackers: MIDIPatch[] = [];
    private presetList: MIDIPatchFull[] = [];

    public constructor() {
        // Initial 16 channels
        for (let i = 0; i < 16; i++) {
            this.addChannelTracker();
        }
    }

    /**
     * Processes a preset list change from the synthesizer.
     * @param patches The new preset list.
     */
    public presetListChange(patches: MIDIPatchFull[]) {
        this.presetList = patches.map((p) => ({
            ...p,
            name: p.name.replace(/\d{3}:\d{3}/, "") // Remove those pesky "000:001"
        }));
        this.updatePresetList();
    }

    /**
     * Loads default preset names from a given list.
     * @param programs The initial program list.
     */
    public loadPresetNames(programs: { name: string; isDrum: boolean }[]) {
        for (const [i, program] of programs.entries()) {
            // Grow the name slots for initial programs of multi-port files.
            if (i >= this.presetNames.length) {
                this.presetNames.push("");
            }
            this.presetNames[i] =
                (program.isDrum ? "(D) " : "") +
                program.name.replace(/\d{3}:\d{3}/, "");
        }
    }

    /**
     * Processes a program change on any channel.
     * @param event The program change event.
     */
    public programChange(event: ProgramChangeEvent) {
        this.ensureChannelTracker(event.channel);
        const c = this.channelTrackers[event.channel];
        c.bankLSB = event.bankLSB;
        c.bankMSB = event.bankMSB;
        c.program = event.program;
        c.isGMGSDrum = event.isGMGSDrum;
        const preset = this.presetList.find(
            (p) =>
                p.bankMSB === c.bankMSB &&
                p.program === c.program &&
                p.bankLSB === c.bankLSB &&
                p.isGMGSDrum === c.isGMGSDrum
        );
        // https://github.com/spessasus/SpessaSynth/issues/219
        if (!preset) {
            if (this.presetList.length === 0) {
                // No patch list to resolve from (offline renderer approach):
                // Fall back to the patch's own name.
                this.presetNames[event.channel] =
                    (event.isDrum ? "(D) " : "") +
                    event.name.replace(/\d{3}:\d{3}/, "");
            }
            return;
        }
        this.presetNames[event.channel] =
            (preset.isDrum ? "(D) " : "") + preset.name;
    }

    /**
     * Updates the used channels and parts from the given MIDI.
     * @param midi The MIDI to update from.
     */
    public updateUsedFromMIDI(midi: BasicMIDI) {
        this.usedChannels.clear();
        this.usedParts.clear();
        for (const track of midi.tracks) {
            const offset = midi.portChannelOffsetMap[track.port] ?? 0;
            for (const channel of track.channels) {
                this.usedParts.add(channel);
                this.usedChannels.add(channel + offset);
            }
        }
    }

    public addChannelTracker() {
        this.ensureChannelTracker(this.channelTrackers.length);
        this.usedChannels.add(this.channelTrackers.length - 1);
        this.usedParts.add((this.channelTrackers.length - 1) % 16);
    }

    /**
     * Grows the channel trackers up to and including the given channel,
     * without marking the new parts as used.
     * @param channel The absolute channel number to ensure.
     */
    private ensureChannelTracker(channel: number) {
        while (channel >= this.channelTrackers.length) {
            this.channelTrackers.push({
                program: 0,
                bankLSB: 0,
                bankMSB: 0,
                isGMGSDrum:
                    this.channelTrackers.length % 16 === MIDI_DRUM_CHANNEL
            });
            this.presetNames.push("");
        }
    }

    private updatePresetList() {
        for (let i = 0; i < this.channelTrackers.length; i++) {
            const c = this.channelTrackers[i];
            const preset = this.presetList.find(
                (p) =>
                    p.bankMSB === c.bankMSB &&
                    p.program === c.program &&
                    p.bankLSB === c.bankLSB &&
                    p.isGMGSDrum === c.isGMGSDrum
            );
            // https://github.com/spessasus/SpessaSynth/issues/219
            if (!preset) {
                continue;
            }
            this.presetNames[i] = (preset.isDrum ? "(D) " : "") + preset.name;
        }
    }
}
