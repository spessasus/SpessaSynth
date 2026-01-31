import type { SynthetizerUI } from "../synthetizer_ui.ts";

export function toggleDarkMode(this: SynthetizerUI) {
    this.mainControllerDiv.classList.toggle("synthui_controller_light");
    for (const b of this.mainButtons) {
        b.classList.toggle("synthui_button");
        b.classList.toggle("synthui_button_light");
    }

    for (const meter of this.mainMeters) {
        meter.toggleMode(true);
    }

    for (const controller of this.controllers) {
        controller.voiceMeter.toggleMode();
        controller.pitchWheel.toggleMode();
        for (const c of Object.values(controller.controllerMeters)) {
            c.toggleMode();
        }
        controller.preset.toggleMode();
        controller.drumsToggle.classList.toggle("mute_button_light");
        controller.muteButton.classList.toggle("mute_button_light");
    }
}
