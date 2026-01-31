import type { SynthetizerUI } from "../synthetizer_ui.ts";

export function hideControllers(this: SynthetizerUI) {
    for (const c of this.controllers) {
        c.voiceMeter.hide();
        c.pitchWheel.hide();
        for (const meter of Object.values(c.controllerMeters)) {
            meter.hide();
        }
        c.transpose.hide();
    }
}

export function showControllers(this: SynthetizerUI) {
    for (const c of this.controllers) {
        c.voiceMeter.show();
        c.pitchWheel.show();
        for (const meter of Object.values(c.controllerMeters)) {
            meter.show();
        }
        c.transpose.show();
    }
}
