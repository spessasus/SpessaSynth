import { showNotification } from "../../../notification/notification.ts";
import type { LocaleManager } from "../../locale_manager.ts";

export function showOutOfMemoryWarning(
    localeManager: LocaleManager,
    error: unknown
) {
    console.error(error);
    showNotification("Warning", [
        {
            type: "text",
            textContent: localeManager.getLocaleString(
                "locale.warnings.outOfMemory"
            )
        }
    ]);
}
