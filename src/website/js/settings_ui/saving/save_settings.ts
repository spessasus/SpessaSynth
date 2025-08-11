// If window.saveSettings function is exposed, call it with _serializeSettings
import type { SpessaSynthSettings } from "../settings.ts";

export function _saveSettings(this: SpessaSynthSettings) {
    if ("saveSettings" in window) {
        const serialized = this._serializeSettings();

        // @ts-expect-error No, thank you TSC, I got it.
        window.saveSettings(serialized);
    }
}
