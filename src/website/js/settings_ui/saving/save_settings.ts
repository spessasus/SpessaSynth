// If window.saveSettings function is exposed, call it with serializeSettings
import type { SpessaSynthSettings } from "../settings.ts";

export function _saveSettings(this: SpessaSynthSettings) {
    const serialized = this.serializeSettings();
    window.saveSettings(serialized);
}
