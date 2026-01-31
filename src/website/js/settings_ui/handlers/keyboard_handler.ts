import type { SpessaSynthSettings } from "../settings.ts";
import type { MIDIPatch, MIDIPatchNamed } from "spessasynth_core";

export const USE_MIDI_RANGE = "midi range";

/**
 * The channel colors are taken from synthui
 */
export function _createKeyboardHandler(this: SpessaSynthSettings) {
    let channelNumber = 0;

    const keyboardControls = this.htmlControls.keyboard;

    const nameDisplays: HTMLParagraphElement[] = [];

    const channelTrackers: MIDIPatch[] = [];

    let presetList: MIDIPatchNamed[] = [];

    const updateChannel = (channel: number) => {
        const chan = channelTrackers[channel];
        let preset = presetList.find(
            (p) => p.bankMSB === chan.bankMSB && p.program === chan.program
        );
        preset ??= presetList[0];
        nameDisplays[channel].textContent = ": " + preset.name;
    };

    const updateChannels = () => {
        if (!presetList) {
            return;
        }
        for (let channel = 0; channel < nameDisplays.length; channel++) {
            updateChannel(channel);
        }
    };

    const createChannel = () => {
        const option = document.createElement("option");

        option.value = channelNumber.toString();
        const channelDisplay = document.createElement("p");
        // Channel: {0} gets formatted to channel number
        this.locale.bindObjectProperty(
            channelDisplay,
            "textContent",
            "locale.settings.keyboardSettings.selectedChannel.channelOption",
            [channelNumber + 1]
        );

        const nameDisplay = document.createElement("p");
        nameDisplay.textContent = ": UNKNOWN";
        nameDisplays.push(nameDisplay);
        channelTrackers.push({
            program: 0,
            bankMSB: 0,
            bankLSB: 0,
            isGMGSDrum: channelNumber % 16 === 9
        });
        updateChannels();

        option.append(channelDisplay);
        option.append(nameDisplay);
        option.style.background =
            this.synthui.channelColors[
                channelNumber % this.synthui.channelColors.length
            ];
        option.style.color = "rgb(0, 0, 0)";

        keyboardControls.channelSelector.append(option);
        channelNumber++;
    };

    this.synth.eventHandler.addEvent(
        "presetListChange",
        "settings-preset-list-change",
        (e) => {
            presetList = e;
            updateChannels();
        }
    );
    if (this.synth.presetList.length > 0) {
        presetList = this.synth.presetList;
    }
    this.synth.eventHandler.addEvent(
        "newChannel",
        "settings-new-channel",
        () => {
            createChannel();
        }
    );
    this.synth.eventHandler.addEvent(
        "programChange",
        "settings-program-change",
        (e) => {
            const c = channelTrackers[e.channel];
            c.bankLSB = e.bankLSB;
            c.bankMSB = e.bankMSB;
            c.program = e.program;
            c.isGMGSDrum = e.isGMGSDrum;
            updateChannel(e.channel);
        }
    );

    // Create the initial synth channels
    for (let i = 0; i < this.synth.channelsAmount; i++) {
        createChannel();
    }
    keyboardControls.channelSelector.addEventListener("change", () => {
        this.midiKeyboard.selectChannel(
            Number.parseInt(keyboardControls.channelSelector.value)
        );
    });

    keyboardControls.sizeSelector.addEventListener("change", () => {
        if (this.musicMode.visible) {
            this.musicMode.setVisibility(
                false,
                document.querySelector("#keyboard_canvas_wrapper")!
            );
            setTimeout(() => {
                if (keyboardControls.sizeSelector.value === USE_MIDI_RANGE) {
                    this.autoKeyRange = true;
                    if (this?.seq?.midiData) {
                        this.midiKeyboard.keyRange = this.seq.midiData.keyRange;
                        this.renderer.keyRange = this.seq.midiData.keyRange;
                    }
                } else {
                    this.autoKeyRange = false;
                    this.midiKeyboard.keyRange =
                        this.keyboardSizes[
                            keyboardControls.sizeSelector
                                .value as keyof typeof this.keyboardSizes
                        ];
                    this.renderer.keyRange =
                        this.keyboardSizes[
                            keyboardControls.sizeSelector
                                .value as keyof typeof this.keyboardSizes
                        ];
                }
                this.saveSettings();
            }, 600);
            return;
        }
        if (keyboardControls.sizeSelector.value === USE_MIDI_RANGE) {
            this.autoKeyRange = true;
            if (this?.seq.midiData) {
                this.midiKeyboard.keyRange = this.seq.midiData.keyRange;
                this.renderer.keyRange = this.seq.midiData.keyRange;
            }
        } else {
            this.autoKeyRange = false;
            this.midiKeyboard.keyRange =
                this.keyboardSizes[
                    keyboardControls.sizeSelector
                        .value as keyof typeof this.keyboardSizes
                ];
            this.renderer.keyRange =
                this.keyboardSizes[
                    keyboardControls.sizeSelector
                        .value as keyof typeof this.keyboardSizes
                ];
        }
        this.saveSettings();
    });

    this.seq.eventHandler.addEvent(
        "songChange",
        "settings-keyboard-handler-song-change",
        (mid) => {
            if (this.autoKeyRange) {
                this.midiKeyboard.keyRange = mid.keyRange;
                this.renderer.keyRange = mid.keyRange;
            }
            if (
                mid.rmidiInfo?.picture !== undefined && // Switch to music mode if picture available
                !this.musicMode.visible
            ) {
                this.toggleMusicPlayerMode();
            }
        }
    );

    // Listen for new channels
    this.synth.eventHandler.addEvent(
        "newChannel",
        "settings-new-channel",
        () => {
            createChannel();
        }
    );

    // QoL: change selected channel if the given channel is muted
    this.synth.eventHandler.addEvent(
        "muteChannel",
        "settings-keuboard-mute-channel",
        (e) => {
            if (e.isMuted && e.channel === this.midiKeyboard.channel) {
                // Find the first non-selected channel
                let channelNumber = 0;
                while (this.synth.channelProperties[channelNumber].isMuted) {
                    channelNumber++;
                    if (
                        this.synth.channelProperties[channelNumber] ===
                        undefined
                    ) {
                        return;
                    }
                }
                if (channelNumber < this.synth.channelsAmount) {
                    this.midiKeyboard.selectChannel(channelNumber);
                    keyboardControls.channelSelector.value =
                        channelNumber.toString();
                }
            }
        }
    );

    // Dark mode toggle
    keyboardControls.modeSelector.addEventListener("click", () => {
        if (this.musicMode.visible) {
            this.musicMode.setVisibility(
                false,
                document.querySelector("#keyboard_canvas_wrapper")!
            );
            setTimeout(() => {
                this.midiKeyboard.toggleMode();
                this.saveSettings();
                this.renderer.updateSize();
            }, 600);
            return;
        }
        this.midiKeyboard.toggleMode();
        this.saveSettings();
    });

    // Keyboard show toggle
    keyboardControls.showSelector.addEventListener("click", () => {
        this.midiKeyboard.shown = !this.midiKeyboard.shown;
        this.saveSettings();
    });
}
