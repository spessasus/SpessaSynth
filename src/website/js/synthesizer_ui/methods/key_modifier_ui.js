import { closeNotification, showNotification } from "../../notification/notification.js";


const LOCALE_PATH = "locale.synthesizerController.keyModifiers.";

/**
 * @param locale {LocaleManager}
 * @param keyboard {MidiKeyboard}
 * @returns {Promise<number>}
 */
async function getKey(locale, keyboard)
{
    return new Promise(r =>
    {
        const notification = showNotification(
            locale.getLocaleString(LOCALE_PATH + "selectKey.title"),
            [
                {
                    type: "text",
                    textContent: locale.getLocaleString(LOCALE_PATH + "selectKey.prompt")
                }
            ],
            999999,
            false,
            locale
        );
        
        keyboard.onNotePressed = note =>
        {
            closeNotification(notification.id);
            keyboard.onNotePressed = undefined;
            r(note);
        };
    });
}

/**
 * @param synth {Synthetizer}
 * @param locale {LocaleManager}
 * @param keyboard {MidiKeyboard}
 * @param presetList {{presetName: string, program: number, bank: number}[]}
 */
async function doModifyKey(synth, locale, keyboard, presetList)
{
    const key = await getKey(locale, keyboard);
    const getInput = (name, min, max, val) =>
    {
        const obj = {
            "type": "number",
            "min": min.toString(),
            "max": max.toString(),
            "value": val.toString()
        };
        obj[name] = "true";
        return obj;
    };
    const presetOptions = {};
    presetOptions["unchanged"] = locale.getLocaleString(LOCALE_PATH + "modifyKey.preset.unchanged");
    for (const p of presetList.toSorted((p1, p2) =>
    {
        if (p1.presetName < p2.presetName)
        {
            return -1;
        }
        if (p1.presetName > p2.presetName)
        {
            return 1;
        }
        return 0;
    }))
    {
        presetOptions[p.presetName] = p.presetName;
    }
    /**
     * @type {KeyModifier}
     */
    const mod = synth.keyModifierManager.getModifier(keyboard.channel, key);
    const vel = mod?.velocity ?? -1;
    const n = showNotification(
        locale.getLocaleString(LOCALE_PATH + "modifyKey.title"),
        [
            {
                type: "text",
                translatePathTitle: LOCALE_PATH + "selectedKey",
                translatePathTitleProps: [key.toString()]
            },
            {
                type: "button",
                textContent: locale.getLocaleString(LOCALE_PATH + "selectKey.change"),
                onClick: async n =>
                {
                    closeNotification(n.id);
                    await doModifyKey(synth, locale, keyboard, presetList);
                }
            },
            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "selectedChannel",
                attributes: getInput("chan", 0, (synth.channelsAmount - 1).toString(), keyboard.channel.toString())
            },
            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "modifyKey.velocity",
                attributes: getInput("vel", 0, 127, vel)
            },
            {
                type: "select",
                translatePathTitle: LOCALE_PATH + "modifyKey.preset",
                attributes: { "preset-selector": "true" },
                selectOptions: presetOptions
            },
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "modifyKey.apply",
                onClick: n =>
                {
                    const channel = parseInt(n.div.querySelector("input[chan]").value) ?? -1;
                    const velocity = parseInt(n.div.querySelector("input[vel]").value) ?? -1;
                    const presetName = n.div.querySelector("select[preset-selector]").value;
                    let bank = -1;
                    let program = -1;
                    if (presetName !== "unchanged")
                    {
                        const preset = presetList.find(p => p.presetName === presetName);
                        bank = preset.bank;
                        program = preset.program;
                    }
                    synth.keyModifierManager.addModifier(channel, key, {
                        velocity: velocity,
                        patch: {
                            program: program,
                            bank: bank
                        }
                    });
                    closeNotification(n.id);
                }
            }
        ],
        99999,
        true,
        locale
    );
    const prog = mod?.patch?.program ?? -1;
    const bank = mod?.patch?.bank ?? -1;
    if (bank !== -1 && prog !== -1)
    {
        n.div.querySelector("select[preset-selector]").value = presetList.find(p => p.bank === bank && p.program === prog).presetName;
    }
}

/**
 * @param synth {Synthetizer}
 * @param locale {LocaleManager}
 * @param keyboard {MidiKeyboard}
 */
async function doRemoveModification(synth, locale, keyboard)
{
    const key = await getKey(locale, keyboard);
    showNotification(
        locale.getLocaleString(LOCALE_PATH + "removeModification.title"),
        [
            {
                type: "text",
                translatePathTitle: LOCALE_PATH + "selectedKey",
                translatePathTitleProps: [key.toString()]
            },
            {
                type: "button",
                textContent: locale.getLocaleString(LOCALE_PATH + "selectKey.change"),
                onClick: async n =>
                {
                    closeNotification(n.id);
                    await doRemoveModification(synth, locale, keyboard);
                }
            },
            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "selectedChannel",
                attributes: {
                    "chan": "true",
                    "type": "number",
                    "value": keyboard.channel.toString(),
                    "min": "0",
                    "max": (synth.channelsAmount - 1).toString()
                }
            },
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "removeModification.remove",
                onClick: n =>
                {
                    const channel = parseInt(n.div.querySelector("input[chan]").value) ?? -1;
                    synth.keyModifierManager.deleteModifier(channel, key);
                    closeNotification(n.id);
                }
            }
        ],
        99999,
        true,
        locale
    );
}

/**
 * @param synth {Synthetizer}
 * @param locale {LocaleManager}
 * @param keyboard {MidiKeyboard}
 * @param presetList {{presetName: string, program: number, bank: number}[]}
 */
export function startKeyModifiersMenu(synth, locale, keyboard, presetList)
{
    showNotification(
        locale.getLocaleString(LOCALE_PATH + "mainTitle"),
        [
            {
                type: "text",
                textContent: locale.getLocaleString(LOCALE_PATH + "detailedDescription"),
                attributes: { "style": "white-space: pre; font-style: italic;" }
            },
            {
                type: "text",
                textContent: locale.getLocaleString(LOCALE_PATH + "prompt")
            },
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "modifyKey",
                onClick: n =>
                {
                    closeNotification(n.id);
                    doModifyKey(synth, locale, keyboard, presetList).then();
                }
            },
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "removeModification",
                onClick: n =>
                {
                    closeNotification(n.id);
                    doRemoveModification(synth, locale, keyboard).then();
                }
            },
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "resetModifications",
                onClick: n =>
                {
                    closeNotification(n.id);
                    showNotification(
                        locale.getLocaleString(LOCALE_PATH + "resetModifications.confirmation.title"),
                        [
                            {
                                type: "text",
                                textContent: locale.getLocaleString(LOCALE_PATH + "resetModifications.confirmation.description")
                            },
                            {
                                type: "button",
                                textContent: locale.getLocaleString("locale.yes"),
                                onClick: n =>
                                {
                                    closeNotification(n.id);
                                    synth.keyModifierManager.clearModifiers();
                                }
                            },
                            {
                                type: "button",
                                textContent: locale.getLocaleString("locale.no"),
                                onClick: n =>
                                {
                                    closeNotification(n.id);
                                }
                            }
                        ],
                        99999,
                        true,
                        locale
                    );
                }
            }
        ],
        9999999,
        true,
        locale
    );
}