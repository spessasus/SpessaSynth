/**
 * @this {SynthetizerUI}
 */
export function toggleDarkMode()
{
    this.mainControllerDiv.classList.toggle("synthui_controller_light");
    this.mainButtons.forEach(b =>
    {
        b.classList.toggle("synthui_button");
        b.classList.toggle("synthui_button_light");
    });
    
    this.mainMeters.forEach(meter =>
    {
        meter.toggleMode(true);
    });
    
    this.controllers.forEach(controller =>
    {
        controller.voiceMeter.toggleMode();
        controller.pitchWheel.toggleMode();
        Object.values(controller.controllerMeters).forEach(c =>
        {
            c.toggleMode();
        });
        controller.preset.toggleMode();
        controller.drumsToggle.classList.toggle("mute_button_light");
        controller.muteButton.classList.toggle("mute_button_light");
    });
}