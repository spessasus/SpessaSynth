import type { Manager } from "../../manager.ts";
import type { RendererSnapshot } from "../../../renderer/base/renderer.ts";
import type { KeyboardOptions } from "../../../canvas_keyboard/base/base_keyboard.ts";

export interface VideoRendererSnapshot extends RendererSnapshot {
    analyserFftSize: number;
    version: string;
    sampleRate: number;
    blackMIDIMode: boolean;
}

export interface VideoSettingsSnapshot {
    renderer: VideoRendererSnapshot;
    keyboard: KeyboardOptions;
    playbackRate: number;
}

export function getVideoSettingsSnapshot(this: Manager): VideoSettingsSnapshot {
    const renderer = this.renderer;
    if (!renderer) {
        throw new Error("Unexpected lack of renderer!");
    }

    return {
        keyboard: renderer.keyboard.getSnapshot(),
        renderer: {
            ...renderer.getSnapshot(),
            analyserFftSize: renderer.analyserFftSize,
            version: window.SPESSASYNTH_VERSION ?? "",
            sampleRate: this.synth?.context.sampleRate ?? 44_100,
            blackMIDIMode: this.synth?.systemParameters.blackMIDIMode ?? false
        },
        playbackRate: this.seq?.playbackRate ?? 1
    };
}
