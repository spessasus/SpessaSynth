/**
 * The channel colors are taken from synthui
 * @param keyboard {MidiKeyboard}
 * @param synthui {SynthetizerUI}
 * @param renderer {Renderer}
 * @this {SpessaSynthSettings}
 * @private
 */
export function _createKeyboardHandler( keyboard, synthui, renderer)
{
    let channelNumber = 0;

    const keyboardControls = this.htmlControls.keyboard;

    const createChannel = () =>
    {
        const option = document.createElement("option");

        option.value = channelNumber.toString();
        // Channel: {0} gets formatred to channel number
        this.locale.bindObjectProperty(option, "textContent", "locale.settings.keyboardSettings.selectedChannel.channelOption", [channelNumber + 1]);

        option.style.background = synthui.channelColors[channelNumber % synthui.channelColors.length];
        option.style.color = "rgb(0, 0, 0)";

        keyboardControls.channelSelector.appendChild(option);
        channelNumber++;
    }

    // create the initial synth channels+
    for (let i = 0; i <synthui.synth.channelsAmount; i++)
    {
        createChannel();
    }
    keyboardControls.channelSelector.onchange = () => {
        keyboard.selectChannel(parseInt(keyboardControls.channelSelector.value));
    }

    keyboardControls.sizeSelector.onchange = () => {
        if(this.musicMode.visible)
        {
            this.musicMode.setVisibility(false, this.renderer.canvas, keyboard.keyboard);
            setTimeout(() => {
                keyboard.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
                renderer.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
                this._saveSettings();
            }, 600);
            return;
        }
        keyboard.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
        renderer.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
        this._saveSettings();
    }

    // listen for new channels
    synthui.synth.eventHandler.addEvent("newchannel", "settings-new-channel",  () => {
        createChannel();
    });

    // QoL: change keyboard channel to the changed one when user changed it: adjust selector here
    synthui.synth.eventHandler.addEvent("programchange", "settings-keyboard-program-change", e => {
        if(e.userCalled)
        {
            keyboard.selectChannel(e.channel);
            keyboardControls.channelSelector.value = e.channel;
        }
    });

    // QoL: change selected channel if the given channel is muted
    synthui.synth.eventHandler.addEvent("mutechannel", "settings-keuboard-mute-channel", e => {
        if(e.isMuted)
        {
            if(e.channel === keyboard.channel)
            {
                // find the first non selected channel
                let channelNumber = 0;
                while(synthui.synth.channelProperties[channelNumber].isMuted)
                {
                    channelNumber++;
                }
                if(channelNumber < synthui.synth.channelsAmount)
                {
                    keyboard.selectChannel(channelNumber);
                    keyboardControls.channelSelector.value = channelNumber;
                }
            }
        }
    })

    // dark mode toggle
    keyboardControls.modeSelector.onclick = () => {
        if(this.musicMode.visible)
        {
            this.musicMode.setVisibility(false, this.renderer.canvas, keyboard.keyboard);
            setTimeout(() => {
                keyboard.toggleMode();
                this._saveSettings();
            }, 600);
            return;
        }
        keyboard.toggleMode();
        this._saveSettings();
    }

}