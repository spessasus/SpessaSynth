import {
    closeNotification,
    showNotification
} from "../../notification/notification.js";
import type { LocaleManager } from "../../locale/locale_manager.ts";
import type { MidiKeyboard } from "../../midi_keyboard/midi_keyboard.ts";
import type { WorkerSynthesizer } from "spessasynth_lib";

const LOCALE_PATH = "locale.synthesizerController.keyModifiers.";

async function getKey(
    locale: LocaleManager,
    keyboard: MidiKeyboard
): Promise<number> {
    return new Promise((r) => {
        const notification = showNotification(
            locale.getLocaleString(LOCALE_PATH + "selectKey.title"),
            [
                {
                    type: "text",
                    textContent: locale.getLocaleString(
                        LOCALE_PATH + "selectKey.prompt"
                    )
                }
            ],
            999999,
            false,
            locale
        );

        keyboard.onNotePressed = (note) => {
            closeNotification(notification.id);
            keyboard.onNotePressed = undefined;
            r(note);
        };
    });
}

async function doModifyKey(
    synth: WorkerSynthesizer,
    locale: LocaleManager,
    keyboard: MidiKeyboard,
    presetList: { name: string; program: number; bank: number }[]
) {
    const key = await getKey(locale, keyboard);
    const getInput = (name: string, min: number, max: number, val: number) => {
        return {
            type: "number",
            min: min.toString(),
            max: max.toString(),
            value: val.toString(),
            [name]: "true"
        };
    };
    const presetOptions: Record<string, string> = {
        unchanged: locale.getLocaleString(
            LOCALE_PATH + "modifyKey.preset.unchanged"
        )
    };
    for (const p of presetList.toSorted((p1, p2) => {
        if (p1.name < p2.name) {
            return -1;
        }
        if (p1.name > p2.name) {
            return 1;
        }
        return 0;
    })) {
        presetOptions[p.name] = p.name;
    }
    const mod = synth.keyModifierManager.getModifier(keyboard.channel, key);
    const vel = mod?.velocity ?? -1;
    const gain = mod?.gain ?? 1;
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
                textContent: locale.getLocaleString(
                    LOCALE_PATH + "selectKey.change"
                ),
                onClick: async (n) => {
                    closeNotification(n.id);
                    await doModifyKey(synth, locale, keyboard, presetList);
                }
            },
            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "selectedChannel",
                attributes: getInput(
                    "chan",
                    0,
                    synth.channelsAmount - 1,
                    keyboard.channel
                )
            },
            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "modifyKey.velocity",
                attributes: getInput("vel", 0, 127, vel)
            },
            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "modifyKey.gain",
                attributes: getInput("gain", 0, 10, gain)
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
                onClick: (n) => {
                    const getVal = (q: string) => {
                        const e = n.div.querySelector(q);
                        if (!e) {
                            return null;
                        }
                        return parseInt((e as HTMLInputElement).value);
                    };
                    const channel = getVal("input[chan]") ?? -1;
                    const velocity = getVal("input[vel]") ?? -1;
                    const gain = getVal("input[gain]") ?? 1;
                    const selector = n.div.querySelector(
                        "select[preset-selector]"
                    )!;
                    const presetName = (selector as HTMLSelectElement).value;
                    let bank = -1;
                    let program = -1;
                    if (presetName !== "unchanged") {
                        const preset = presetList.find(
                            (p) => p.name === presetName
                        );
                        if (!preset) {
                            throw new Error("Unexpected lack of preset!");
                        }
                        bank = preset.bank;
                        program = preset.program;
                    }
                    synth.keyModifierManager.addModifier(channel, key, {
                        velocity: velocity,
                        patch: {
                            program: program,
                            bank: bank
                        },
                        gain: gain
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
    if (bank !== -1 && prog !== -1) {
        const selector = n.div.querySelector("select[preset-selector]")!;
        (selector as HTMLSelectElement).value =
            presetList.find((p) => p.bank === bank && p.program === prog)
                ?.name ?? "-";
    }
}

async function doRemoveModification(
    synth: WorkerSynthesizer,
    locale: LocaleManager,
    keyboard: MidiKeyboard
) {
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
                textContent: locale.getLocaleString(
                    LOCALE_PATH + "selectKey.change"
                ),
                onClick: async (n) => {
                    closeNotification(n.id);
                    await doRemoveModification(synth, locale, keyboard);
                }
            },
            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "selectedChannel",
                attributes: {
                    chan: "true",
                    type: "number",
                    value: keyboard.channel.toString(),
                    min: "0",
                    max: (synth.channelsAmount - 1).toString()
                }
            },
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "removeModification.remove",
                onClick: (n) => {
                    const input = n.div.querySelector("input[chan]")!;
                    const channel =
                        parseInt((input as HTMLInputElement).value) ?? -1;
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

export function startKeyModifiersMenu(
    synth: WorkerSynthesizer,
    locale: LocaleManager,
    keyboard: MidiKeyboard,
    presetList: { name: string; program: number; bank: number }[]
) {
    showNotification(
        locale.getLocaleString(LOCALE_PATH + "mainTitle"),
        [
            {
                type: "text",
                textContent: locale.getLocaleString(
                    LOCALE_PATH + "detailedDescription"
                ),
                attributes: { style: "white-space: pre; font-style: italic;" }
            },
            {
                type: "text",
                textContent: locale.getLocaleString(LOCALE_PATH + "prompt")
            },
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "modifyKey",
                onClick: (n) => {
                    closeNotification(n.id);
                    void doModifyKey(synth, locale, keyboard, presetList);
                }
            },
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "removeModification",
                onClick: (n) => {
                    closeNotification(n.id);
                    void doRemoveModification(synth, locale, keyboard);
                }
            },
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "resetModifications",
                onClick: (n) => {
                    closeNotification(n.id);
                    showNotification(
                        locale.getLocaleString(
                            LOCALE_PATH +
                                "resetModifications.confirmation.title"
                        ),
                        [
                            {
                                type: "text",
                                textContent: locale.getLocaleString(
                                    LOCALE_PATH +
                                        "resetModifications.confirmation.description"
                                )
                            },
                            {
                                type: "button",
                                textContent:
                                    locale.getLocaleString("locale.yes"),
                                onClick: (n) => {
                                    closeNotification(n.id);
                                    synth.keyModifierManager.clearModifiers();
                                }
                            },
                            {
                                type: "button",
                                textContent:
                                    locale.getLocaleString("locale.no"),
                                onClick: (n) => {
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
