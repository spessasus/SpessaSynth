import type { MIDIPatch } from "spessasynth_core";
import type { Synthesizer } from "../utils/synthesizer.ts";
import type { Sequencer } from "spessasynth_lib";

/**
 * Track the current preset for each channel, limited to the first 16 channels.
 */
export class ProgramTracker {
    /**
     * The current preset names.
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
    private presetList;
    private readonly synth;
    private readonly seq;

    public constructor(synth: Synthesizer, seq: Sequencer) {
        this.synth = synth;
        this.seq = seq;
        // Initial 16 channels
        for (let i = 0; i < 16; i++) {
            this.addChannelTracker();
        }
        this.presetList = synth.presetList;
        this.updatePresetList();

        this.seq.eventHandler.addEvent(
            "songChange",
            "program-tracker-song-change",
            (e) => {
                this.usedChannels.clear();
                this.usedParts.clear();
                for (const t of e.tracks) {
                    const used = t.channels;
                    const port = t.port;
                    const offset = e.portChannelOffsetMap[port];
                    for (const v of used) {
                        this.usedParts.add(v);
                        this.usedChannels.add(v + offset);
                    }
                }
            }
        );

        this.synth.eventHandler.addEvent(
            "presetListChange",
            "program-tracker-preset-list-change",
            (e) => {
                this.presetList = e;
                this.updatePresetList();
            }
        );

        this.synth.eventHandler.addEvent(
            "newChannel",
            "program-tracker-new-channel",
            this.addChannelTracker.bind(this)
        );

        this.synth.eventHandler.addEvent(
            "programChange",
            "program-tracker-program-change",
            (e) => {
                const c = this.channelTrackers[e.channel];
                if (!c) {
                    console.warn(`No channel tracker found for ${e.channel}.`);
                    return;
                }
                c.bankLSB = e.bankLSB;
                c.bankMSB = e.bankMSB;
                c.program = e.program;
                c.isGMGSDrum = e.isGMGSDrum;
                const preset =
                    this.presetList.find(
                        (p) =>
                            p.bankMSB === c.bankMSB &&
                            p.program === c.program &&
                            p.bankLSB === c.bankLSB &&
                            p.isGMGSDrum === c.isGMGSDrum
                    ) ?? this.presetList[0];
                this.presetNames[e.channel] =
                    (preset.isAnyDrums ? "(D) " : "") + preset.name;
            }
        );
    }

    private addChannelTracker() {
        this.channelTrackers.push({
            program: 0,
            bankLSB: 0,
            bankMSB: 0,
            isGMGSDrum: this.channelTrackers.length % 16 === 9
        });
        this.presetNames.push("");
        this.usedChannels.add(this.channelTrackers.length - 1);
        this.usedParts.add((this.channelTrackers.length - 1) % 16);
    }

    private updatePresetList() {
        for (let i = 0; i < this.channelTrackers.length; i++) {
            const c = this.channelTrackers[i];
            const preset =
                this.presetList.find(
                    (p) =>
                        p.bankMSB === c.bankMSB &&
                        p.program === c.program &&
                        p.bankLSB === c.bankLSB &&
                        p.isGMGSDrum === c.isGMGSDrum
                ) ?? this.presetList[0];
            this.presetNames[i] =
                (preset.isAnyDrums ? "(D) " : "") + preset.name;
        }
    }
}
