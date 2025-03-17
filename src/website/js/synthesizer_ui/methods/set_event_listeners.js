import { getDrumsSvg, getNoteSvg } from "../../utils/icons.js";

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
    
    this.synth.eventHandler.addEvent("allcontrollerreset", "synthui-all-controller-reset", () =>
    {
        for (const controller of this.controllers)
        {
            for (const meter of Object.values(controller.controllerMeters))
            {
                meter.update(meter.defaultValue);
            }
        }
    });
    
    this.synth.eventHandler.addEvent("controllerchange", "synthui-controller-change", e =>
    {
        const controller = e.controllerNumber;
        const channel = e.channel;
        const value = e.controllerValue;
        const con = this.controllers[channel];
        if (con === undefined)
        {
            return;
        }
        const meter = con.controllerMeters[controller];
        if (meter !== undefined)
        {
            meter.update(value);
        }
    });
    
    this.synth.eventHandler.addEvent("pitchwheel", "synthui-pitch-wheel", e =>
    {
        const val = (e.MSB << 7) | e.LSB;
        // pitch wheel
        this.controllers[e.channel].pitchWheel.update(val - 8192);
    });
    
    this.synth.eventHandler.addEvent("drumchange", "synthui-drum-change", e =>
    {
        this.controllers[e.channel].drumsToggle.innerHTML = (e.isDrumChannel ? getDrumsSvg(32) : getNoteSvg(32));
        this.controllers[e.channel].preset.reload(e.isDrumChannel ? this.percussionList : this.instrumentList);
    });
    
    this.synth.eventHandler.addEvent("newchannel", "synthui-new-channel", () =>
    {
        const controller = this.createChannelController(this.controllers.length);
        this.controllers.push(controller);
        dropdownDiv.appendChild(controller.controller);
        this.hideControllers();
    });
}