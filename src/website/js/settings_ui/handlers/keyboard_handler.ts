export const USE_MIDI_RANGE = "midi range";

/**
 * The channel colors are taken from synthui
 * @param keyboard {MidiKeyboard}
 * @param synthui {SynthetizerUI}
 * @param renderer {Renderer}
 * @this {SpessaSynthSettings}
 * @private
 */
export function _createKeyboardHandler(keyboard, synthui, renderer)
{
    let channelNumber = 0;
    
    const keyboardControls = this.htmlControls.keyboard;
    
    /**
     * @type {HTMLParagraphElement[]}
     */
    const nameDisplays = [];
    /**
     * @type {{
     *     program: number,
     *     bank: number,
     *     drum: boolean
     * }[]}
     */
    const channelTrackers = [];
    
    /**
     * @type {{
     *     presetName: string,
     *     program: number,
     *     bank: number
     * }[]}
     */
    let presetList = undefined;
    
    const updateChannel = channel =>
    {
        const chan = channelTrackers[channel];
        let bank = chan.drum ? 128 : chan.bank;
        let preset = presetList.find(p => p.bank === bank && p.program === chan.program);
        if (!preset)
        {
            preset = presetList[0];
        }
        nameDisplays[channel].textContent = ": " + preset.presetName;
    };
    
    const updateChannels = () =>
    {
        if (!presetList)
        {
            return;
        }
        for (let channel = 0; channel < nameDisplays.length; channel++)
        {
            updateChannel(channel);
        }
    };
    
    const createChannel = () =>
    {
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
            bank: 0,
            drum: channelNumber % 16 === 9
        });
        updateChannels();
        
        option.appendChild(channelDisplay);
        option.appendChild(nameDisplay);
        option.style.background = synthui.channelColors[channelNumber % synthui.channelColors.length];
        option.style.color = "rgb(0, 0, 0)";
        
        keyboardControls.channelSelector.appendChild(option);
        channelNumber++;
    };
    
    const syn = this.synthui.synth;
    syn.eventHandler.addEvent("presetlistchange", "settings-preset-list-change", e =>
    {
        presetList = e;
        updateChannels();
    });
    if (syn.presetList.length > 0)
    {
        presetList = syn.presetList;
    }
    syn.eventHandler.addEvent("newchannel", "settings-new-channel", () =>
    {
        createChannel();
    });
    syn.eventHandler.addEvent("programchange", "settings-program-change", e =>
    {
        const c = channelTrackers[e.channel];
        c.bank = e.bank;
        c.program = e.program;
        updateChannel(e.channel);
    });
    syn.eventHandler.addEvent("drumchange", "settings-drum-change", e =>
    {
        channelTrackers[e.channel].drum = e.isDrumChannel;
        updateChannel(e.channel);
    });
    
    // create the initial synth channels
    for (let i = 0; i < synthui.synth.channelsAmount; i++)
    {
        createChannel();
    }
    keyboardControls.channelSelector.onchange = () =>
    {
        keyboard.selectChannel(parseInt(keyboardControls.channelSelector.value));
    };
    
    keyboardControls.sizeSelector.onchange = () =>
    {
        if (this.musicMode.visible)
        {
            this.musicMode.setVisibility(false, document.getElementById("keyboard_canvas_wrapper"));
            setTimeout(() =>
            {
                if (keyboardControls.sizeSelector.value === USE_MIDI_RANGE)
                {
                    this.autoKeyRange = true;
                    if (this?.sequi?.seq)
                    {
                        keyboard.keyRange = this.sequi.seq.midiData.keyRange;
                        renderer.keyRange = this.sequi.seq.midiData.keyRange;
                    }
                }
                else
                {
                    this.autoKeyRange = false;
                    keyboard.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
                    renderer.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
                }
                this._saveSettings();
            }, 600);
            return;
        }
        if (keyboardControls.sizeSelector.value === USE_MIDI_RANGE)
        {
            this.autoKeyRange = true;
            if (this?.sequi?.seq)
            {
                keyboard.keyRange = this.sequi.seq.midiData.keyRange;
                renderer.keyRange = this.sequi.seq.midiData.keyRange;
            }
        }
        else
        {
            this.autoKeyRange = false;
            keyboard.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
            renderer.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
        }
        this._saveSettings();
    };
    
    /**
     * @param seq {CustomSeq}
     */
    this.addSequencer = seq =>
    {
        seq.addOnSongChangeEvent(mid =>
        {
            if (this.autoKeyRange)
            {
                keyboard.keyRange = mid.keyRange;
                renderer.keyRange = mid.keyRange;
            }
            if (mid.RMIDInfo?.["IPIC"] !== undefined)
            {
                // switch to music mode if picture available
                if (this.musicMode.visible === false)
                {
                    this.toggleMusicPlayerMode().then();
                }
            }
        }, "settings-keyboard-handler-song-change");
    };
    
    // listen for new channels
    synthui.synth.eventHandler.addEvent("newchannel", "settings-new-channel", () =>
    {
        createChannel();
    });
    
    // QoL: change selected channel if the given channel is muted
    synthui.synth.eventHandler.addEvent("mutechannel", "settings-keuboard-mute-channel", e =>
    {
        if (e.isMuted)
        {
            if (e.channel === keyboard.channel)
            {
                // find the first non-selected channel
                let channelNumber = 0;
                while (synthui.synth.channelProperties[channelNumber].isMuted)
                {
                    channelNumber++;
                    if (synthui.synth.channelProperties[channelNumber] === undefined)
                    {
                        return;
                    }
                }
                if (channelNumber < synthui.synth.channelsAmount)
                {
                    keyboard.selectChannel(channelNumber);
                    keyboardControls.channelSelector.value = channelNumber;
                }
            }
        }
    });
    
    // dark mode toggle
    keyboardControls.modeSelector.onclick = () =>
    {
        if (this.musicMode.visible)
        {
            this.musicMode.setVisibility(false, document.getElementById("keyboard_canvas_wrapper"));
            setTimeout(() =>
            {
                keyboard.toggleMode();
                this._saveSettings();
                this.renderer.updateSize();
            }, 600);
            return;
        }
        keyboard.toggleMode();
        this._saveSettings();
    };
    
    // keyboard show toggle
    keyboardControls.showSelector.onclick = () =>
    {
        keyboard.shown = !keyboard.shown;
        this._saveSettings();
    };
    
}