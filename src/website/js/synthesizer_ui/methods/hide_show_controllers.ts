import type { SynthetizerUI } from "../synthetizer_ui.ts";

export function hideControllers(this: SynthetizerUI) {
    this.controllers.forEach((c) => {
        c.voiceMeter.hide();
        c.pitchWheel.hide();
        for (const meter of Object.values(c.controllerMeters)) {
            meter.hide();
        }
        c.transpose.hide();
    });
}

export function showControllers(this: SynthetizerUI) {
    this.controllers.forEach((c) => {
        c.voiceMeter.show();
        c.pitchWheel.show();
        for (const meter of Object.values(c.controllerMeters)) {
            meter.show();
        }
        c.transpose.show();
    });
}
