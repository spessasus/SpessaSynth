import { closeNotification, showNotification } from "../notification/notification.js";
import { EXTRA_BANK_ID } from "./extra_bank_id.js";
import type { Manager } from "./manager.ts";

export function prepareExtraBankUpload(this: Manager) {
    let extraBankName = "";
    const extra = document.getElementById("extra_bank_button")!;
    this.localeManager.bindObjectProperty(
        extra,
        "title",
        "locale.extraBank.button"
    );
    extra.onclick = () => {
        const notification = showNotification(
            this.localeManager.getLocaleString("locale.extraBank.title"),
            [
                {
                    type: "input",
                    attributes: {
                        type: "number",
                        min: "0",
                        max: "127",
                        value: "1"
                    },
                    translatePathTitle: "locale.extraBank.offset"
                },
                {
                    type: "file",
                    translatePathTitle: "locale.extraBank.file",
                    attributes: {
                        value: "",
                        name: "bank",
                        accept: ".dls,.sf2,.sf3,.sfogg"
                    }
                },
                {
                    type: "button",
                    translatePathTitle: "locale.extraBank.confirm",
                    onClick: async (n) => {
                        const getEl = (q: string) => {
                            const e = n.div.querySelector(q);
                            return e as HTMLInputElement;
                        };

                        const bank =
                            parseInt(getEl("input[type='number']").value) || 0;
                        const file = getEl("input[type='file']").files?.[0];
                        if (!file) {
                            return;
                        }
                        if (!this.synth) {
                            return;
                        }
                        const b = await file.arrayBuffer();
                        // Add bank and rearrange
                        await this.synth?.soundBankManager.addSoundBank(
                            b,
                            EXTRA_BANK_ID,
                            bank
                        );
                        this.synth.soundBankManager.priorityOrder = [
                            EXTRA_BANK_ID,
                            "main"
                        ];
                        this.extraBankName = extraBankName;
                        this.extraBankOffset = bank;
                        if (this.seq?.paused === false) {
                            this.seq.currentTime -= 0.1;
                        }
                        closeNotification(n.id);
                    }
                },
                {
                    type: "button",
                    translatePathTitle: "locale.extraBank.clear",
                    onClick: async (n) => {
                        await this.synth!.soundBankManager.deleteSoundBank(
                            EXTRA_BANK_ID
                        );
                        this.extraBankName = "";
                        this.extraBankOffset = 0;
                        if (this.seq?.paused === false) {
                            this.seq.currentTime -= 0.1;
                        }
                        closeNotification(n.id);
                    }
                }
            ],
            999999,
            true,
            this.localeManager
        );
        const i = notification.div.querySelector("input[type='file']")!;
        const input = i as HTMLInputElement;
        if (this.extraBankName) {
            input.parentElement!.firstChild!.textContent = this.extraBankName;
        }
        input.oninput = () => {
            if (input?.files?.[0]) {
                extraBankName = input.files[0].name;
                input.parentElement!.firstChild!.textContent = extraBankName;
            }
        };
    };
}
