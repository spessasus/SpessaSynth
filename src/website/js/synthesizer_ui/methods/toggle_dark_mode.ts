import type { SynthetizerUI } from "../synthetizer_ui.ts";

export function toggleDarkMode(this: SynthetizerUI) {
    this.uiDiv.classList.toggle("light_mode");

    for (const controller of this.controllers) {
        controller.preset.toggleMode();
        controller.drumsToggle.classList.toggle("mute_button_light");
        controller.muteButton.classList.toggle("mute_button_light");
    }
}
