/**
 * @this {SynthetizerUI}
 */
export function toggleDarkMode()
{
    this.mainControllerDiv.classList.toggle("synthui_controller_light");
    this.mainButtons.forEach(b => {
        b.classList.toggle("synthui_button");
        b.classList.toggle("synthui_button_light");
    })

    this.mainMeters.forEach(meter => {
        meter.toggleMode(true);
    });

    this.controllers.forEach(controller => {
        controller.voiceMeter.toggleMode();
        controller.pitchWheel.toggleMode();
        controller.pan.toggleMode();
        controller.expression.toggleMode();
        controller.volume.toggleMode();
        controller.mod.toggleMode();
        controller.chorus.toggleMode();
        controller.preset.toggleMode();
        controller.presetReset.classList.toggle("voice_reset_light");
        controller.drumsToggle.classList.toggle("mute_button_light");
        controller.muteButton.classList.toggle("mute_button_light");
    })
}