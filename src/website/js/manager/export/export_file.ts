import {
    closeNotification,
    showNotification
} from "../../notification/notification.js";
import type { Manager } from "../manager.ts";
import { _exportDLS } from "./export_dls.ts";
import { _exportRMIDI } from "./export_rmidi.ts";
import { exportAndSaveSF2 } from "./export_soundfont.ts";

export function showExportMenu(this: Manager) {
    const path = "locale.exportFile.formats.";
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
                translatePathTitle: path + "formats.video.button",
                onClick: (n) => {
                    closeNotification(n.id);
                    void this.showVideoExportMenu();
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
                    exportAndSaveSF2.call(this);
                }
            },
            {
                type: "button",
                translatePathTitle: path + "formats.dls.button",
                onClick: (n) => {
                    closeNotification(n.id);
                    _exportDLS.call(this);
                }
            },
            {
                type: "button",
                translatePathTitle: path + "formats.rmidi.button",
                onClick: (n) => {
                    closeNotification(n.id);
                    _exportRMIDI.call(this);
                }
            }
        ],
        999_999,
        true,
        this.localeManager,
        {
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center"
        }
    );
}
