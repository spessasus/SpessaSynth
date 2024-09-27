import { midiControllers } from '../../../../spessasynth_lib/midi_parser/midi_message.js'
import { getDrumsSvg, getNoteSvg } from '../../utils/icons.js'

/**
 * @this {SynthetizerUI}
 */
export function setEventListeners()
{
    const dropdownDiv = this.uiDiv.getElementsByClassName("synthui_controller")[0];
    // add event listeners
    this.synth.eventHandler.addEvent("programchange", "synthui-program-change", e =>
    {
        this.controllers[e.channel].preset.set(`${e.bank}:${e.program}`);
    });

    this.synth.eventHandler.addEvent("allcontrollerreset", "synthui-all-controller-reset", () => {
        for (const controller of this.controllers) {
            controller.pan.update(64);
            controller.mod.update(0);
            controller.chorus.update(0);
            controller.pitchWheel.update(0);
            controller.expression.update(127);
            controller.volume.update(100);
            controller.reverb.update(0);
            controller.brightness.update(64);
        }
    });

    this.synth.eventHandler.addEvent("controllerchange", "synthui-controller-change",e => {
        const controller = e.controllerNumber;
        const channel = e.channel;
        const value = e.controllerValue;
        switch (controller)
        {
            default:
                break;

            case midiControllers.expressionController:
                // expression
                this.controllers[channel].expression.update(value);
                break;

            case midiControllers.mainVolume:
                // volume
                this.controllers[channel].volume.update(value);
                break;

            case midiControllers.pan:
                // pan
                this.controllers[channel].pan.update(value);
                break;

            case midiControllers.modulationWheel:
                // mod wheel
                this.controllers[channel].mod.update(value);
                break;

            case midiControllers.effects3Depth:
                // chorus
                this.controllers[channel].chorus.update(value);
                break;

            case midiControllers.effects1Depth:
                // reverb
                this.controllers[channel].reverb.update(value);
                break;

            case midiControllers.brightness:
                // brightness
                this.controllers[channel].brightness.update(value);
        }
    });

    this.synth.eventHandler.addEvent("pitchwheel", "synthui-pitch-wheel", e => {
        const val = (e.MSB << 7) | e.LSB;
        // pitch wheel
        this.controllers[e.channel].pitchWheel.update(val - 8192);
    });

    this.synth.eventHandler.addEvent("drumchange", "synthui-drum-change", e => {
        this.controllers[e.channel].drumsToggle.innerHTML = (e.isDrumChannel ? getDrumsSvg(32) : getNoteSvg(32));
        this.controllers[e.channel].preset.reload(e.isDrumChannel ? this.percussionList : this.instrumentList);
    });

    this.synth.eventHandler.addEvent("newchannel", "synthui-new-channel", () => {
        const controller = this.createChannelController(this.controllers.length);
        this.controllers.push(controller);
        dropdownDiv.appendChild(controller.controller);
        this.hideControllers();
    });
}