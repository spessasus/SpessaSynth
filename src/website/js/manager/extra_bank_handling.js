import { getSf2LogoSvg } from "../utils/icons.js";
import { closeNotification, showNotification } from "../notification/notification.js";

const EXTRA_BANK_ID = "spessasynth-extra-bank";

/**
 * @this {Manager}
 */
export function prepareExtraBankUpload()
{
    this.extraBankName = "";
    /**
     * @type {ArrayBuffer}
     */
    this.extraBankBuffer = undefined;
    this.extraBankOffset = 0;
    let extraBankName = "";
    const extra = document.getElementById("extra_bank_button");
    extra.innerHTML = getSf2LogoSvg(24);
    this.localeManager.bindObjectProperty(extra, "title", "locale.extraBank.button");
    extra.onclick = () =>
    {
        const notification = showNotification(
            this.localeManager.getLocaleString("locale.extraBank.title"),
            [
                {
                    type: "input",
                    attributes: {
                        "type": "number",
                        "min": "0",
                        "max": "127",
                        "value": "1"
                    },
                    translatePathTitle: "locale.extraBank.offset"
                },
                {
                    type: "file",
                    translatePathTitle: "locale.extraBank.file",
                    attributes: {
                        "value": "",
                        "name": "bank",
                        "accept": ".dls,.sf2,.sf3,.sfogg"
                    }
                },
                {
                    type: "button",
                    translatePathTitle: "locale.extraBank.confirm",
                    onClick: async n =>
                    {
                        const bank = parseInt(n.div.querySelector("input[type='number']").value) || 0;
                        /**
                         * @type {File}
                         */
                        const file = notification.div.querySelector("input[type='file']").files[0];
                        if (!file)
                        {
                            return;
                        }
                        const b = await file.arrayBuffer();
                        // add bank and rearrange
                        await this.synth.soundfontManager.addNewSoundFont(b, EXTRA_BANK_ID, bank);
                        await this.synth.soundfontManager.rearrangeSoundFonts([EXTRA_BANK_ID, "main"]);
                        this.extraBankName = extraBankName;
                        this.extraBankBuffer = b;
                        this.extraBankOffset = bank;
                        if (this.seq?.paused === false)
                        {
                            this.seq.currentTime -= 0.1;
                        }
                        closeNotification(n.id);
                    }
                },
                {
                    type: "button",
                    translatePathTitle: "locale.extraBank.clear",
                    onClick: async n =>
                    {
                        await this.synth.soundfontManager.deleteSoundFont(EXTRA_BANK_ID);
                        this.extraBankName = "";
                        this.extraBankBuffer = undefined;
                        this.extraBankOffset = 0;
                        if (this.seq?.paused === false)
                        {
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
        const input = notification.div.querySelector("input[type='file']");
        if (this.extraBankName)
        {
            input.parentElement.firstChild.textContent = this.extraBankName;
        }
        input.oninput = () =>
        {
            if (input.files[0])
            {
                extraBankName = input.files[0].name;
                input.parentElement.firstChild.textContent = extraBankName;
            }
        };
    };
}