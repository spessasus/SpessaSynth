import type { SynthesizerUI } from "../synthetizer_ui.ts";

export function hideControllers(this: SynthesizerUI) {
    for (const c of this.controllers) {
        c.voiceMeter.hide();
        for (const meter of c.controllerMeters.values()) {
            meter.hide();
        }
    }
}

export function showControllers(this: SynthesizerUI) {
    for (const c of this.controllers) {
        c.voiceMeter.show();
        for (const meter of c.controllerMeters.values()) {
            meter.show();
        }
    }
}
