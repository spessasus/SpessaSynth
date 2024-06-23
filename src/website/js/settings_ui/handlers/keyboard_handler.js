/**
 * The channel colors are taken from synthui
 * @param keyboard {MidiKeyboard}
 * @param synthui {SynthetizerUI}
 * @param renderer {Renderer}
 * @this {Settings}
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
        keyboard.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
        renderer.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
        this._saveSettings();
    }

    // listen for new channels
    synthui.synth.eventHandler.addEvent("newchannel", "settings-new-channel",  () => {
        createChannel();
    });

    // dark mode toggle
    keyboardControls.modeSelector.onclick = () => {
        keyboard.toggleMode();
        this._saveSettings();
    }
}