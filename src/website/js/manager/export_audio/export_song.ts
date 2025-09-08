import {
    closeNotification,
    showNotification
} from "../../notification/notification.js";
import type { Manager } from "../manager.ts";
import { _exportDLS } from "./export_dls.ts";
import { _exportRMIDI } from "./export_rmidi.ts";
import { exportAndSaveSF2 } from "./export_soundfont.ts";

export function showExportMenu(this: Manager) {
    const path = "locale.exportAudio.formats.";
    showNotification(
        this.localeManager.getLocaleString(path + "title"),
        [
            {
                type: "button",
                translatePathTitle: path + "formats.wav.button",
                onClick: (n) => {
                    closeNotification(n.id);
                    void this.showAudioExportMenu();
                }
            },
            {
                type: "button",
                translatePathTitle: path + "formats.midi.button",
                onClick: (n) => {
                    closeNotification(n.id);
                    void this.exportMidi();
                }
            },
            {
                type: "button",
                translatePathTitle: path + "formats.soundfont.button",
                onClick: (n) => {
                    closeNotification(n.id);
                    try {
                        exportAndSaveSF2.call(this);
                    } catch (e) {
                        console.error(e);
                        showNotification("Warning", [
                            {
                                type: "text",
                                textContent: this.localeManager.getLocaleString(
                                    "locale.warnings.outOfMemory"
                                )
                            }
                        ]);
                    }
                }
            },
            {
                type: "button",
                translatePathTitle: path + "formats.dls.button",
                onClick: (n) => {
                    closeNotification(n.id);
                    try {
                        void _exportDLS.call(this);
                    } catch (e) {
                        console.error(e);
                        showNotification("Warning", [
                            {
                                type: "text",
                                textContent: this.localeManager.getLocaleString(
                                    "locale.warnings.outOfMemory"
                                )
                            }
                        ]);
                    }
                }
            },
            {
                type: "button",
                translatePathTitle: path + "formats.rmidi.button",
                onClick: (n) => {
                    closeNotification(n.id);
                    try {
                        void _exportRMIDI.call(this);
                    } catch (e) {
                        console.error(e);
                        showNotification("Warning", [
                            {
                                type: "text",
                                textContent: this.localeManager.getLocaleString(
                                    "locale.warnings.outOfMemory"
                                )
                            }
                        ]);
                    }
                }
            }
        ],
        999999,
        true,
        this.localeManager,
        {
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center"
        }
    );
}
