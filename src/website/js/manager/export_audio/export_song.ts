import {
    closeNotification,
    showNotification
} from "../../notification/notification.js";
import type { Manager } from "../manager.ts";

export function exportSong(this: Manager) {
    const path = "locale.exportAudio.formats.";
    showNotification(
        this.localeManager.getLocaleString(path + "title"),
        [
            {
                type: "button",
                translatePathTitle: path + "formats.wav.button",
                onClick: (n) => {
                    closeNotification(n.id);
                    void this._exportAudioData();
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
                        this.exportSoundBank();
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
                        void this._exportDLS();
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
                        void this._exportRMIDI();
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
