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
 */
async function doModifyKey(synth, locale, keyboard)
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
    showNotification(
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
                    await doModifyKey(synth, locale, keyboard);
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
                attributes: getInput("vel", 0, 127, -1)
            },
            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "modifyKey.program",
                attributes: getInput("prog", 0, 127, -1)
            },
            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "modifyKey.bank",
                attributes: getInput("bank", 0, 127, -1)
            },
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "modifyKey.apply",
                onClick: n =>
                {
                    const channel = parseInt(n.div.querySelector("input[chan]").value) ?? -1;
                    const velocity = parseInt(n.div.querySelector("input[vel]").value) ?? -1;
                    const program = parseInt(n.div.querySelector("input[prog]").value) ?? -1;
                    const bank = parseInt(n.div.querySelector("input[bank]").value) ?? -1;
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
                    await doModifyKey(synth, locale, keyboard);
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
 */
export function startKeyModifiersMenu(synth, locale, keyboard)
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
                    doModifyKey(synth, locale, keyboard).then();
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