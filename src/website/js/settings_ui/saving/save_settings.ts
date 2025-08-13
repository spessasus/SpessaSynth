// If window.saveSettings function is exposed, call it with _serializeSettings
import type { SpessaSynthSettings } from "../settings.ts";

export function _saveSettings(this: SpessaSynthSettings) {
    const serialized = this._serializeSettings();
    window.saveSettings(serialized);
}
