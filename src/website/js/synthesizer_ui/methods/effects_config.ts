import type { LocaleManager } from "../../locale/locale_manager.js";
import {
    type NotificationType,
    showNotification
} from "../../notification/notification.js";
import { consoleColors } from "../../utils/console_colors.js";
import { type WorkerSynthesizer } from "spessasynth_lib";

export function showEffectsConfigWindow(
    locale: LocaleManager,
    path: string,
    synth: WorkerSynthesizer
): NotificationType {
    const ACTUAL_PATH = path + "effectsConfig.";
    const chorus = synth.chorusProcessor?.config;
    if (!chorus) {
        throw new Error("Unexpected lack of chorus!");
    }
    const nofification = showNotification(
        locale.getLocaleString(ACTUAL_PATH + "button.title"),
        [
            {
                type: "button",
                translatePathTitle: path + "disableCustomVibrato",
                onClick: (_, el) => {
                    synth.disableGSNPRNParams();
                    el.parentNode?.removeChild(el);
                }
            },

            // REVERB
            {
                type: "text",
                translatePathTitle: ACTUAL_PATH + "reverbConfig",
                attributes: { style: "margin-bottom: -0.5rem" }
            },
            {
                type: "file",
                translatePathTitle:
                    ACTUAL_PATH + "reverbConfig.impulseResponse",
                attributes: { accept: "audio/*" },
                listeners: {
                    input: async (e) => {
                        if (!e.target) {
                            return;
                        }
                        const target = e.target as HTMLInputElement;
                        if (!target?.files?.length) {
                            return;
                        }
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        const btn =
                            target.parentElement?.parentElement?.getElementsByTagName(
                                "label"
                            )[0];
                        if (!btn) {
                            return;
                        }
                        btn.textContent = locale.getLocaleString(
                            "locale.synthInit.genericLoading"
                        );
                        const buffer = await synth.context.decodeAudioData(
                            await target.files[0].arrayBuffer()
                        );
                        synth.reverbProcessor?.update({
                            impulseResponse: buffer
                        });
                        btn.textContent = locale.getLocaleString(
                            "locale.synthInit.done"
                        );
                        console.info(
                            "%cReverb response set!",
                            consoleColors.info
                        );
                    }
                }
            },

            // CHORUS
            {
                type: "text",
                translatePathTitle: ACTUAL_PATH + "chorusConfig",
                attributes: { style: "margin-bottom: -0.5rem" }
            },
            {
                type: "input",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.nodesAmount",
                attributes: {
                    type: "number",
                    min: "0",
                    value: chorus.nodesAmount.toString(),
                    setting: "nodes"
                }
            },
            {
                type: "input",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.defaultDelay",
                attributes: {
                    type: "number",
                    min: "0",
                    value: chorus.defaultDelay.toString(),
                    setting: "delay"
                }
            },
            {
                type: "input",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.delayVariation",
                attributes: {
                    type: "number",
                    min: "0",
                    value: chorus.delayVariation.toString(),
                    setting: "delay-var"
                }
            },
            {
                type: "input",
                translatePathTitle:
                    ACTUAL_PATH + "chorusConfig.stereoDifference",
                attributes: {
                    type: "number",
                    min: "0",
                    value: chorus.stereoDifference.toString(),
                    setting: "stereo"
                }
            },
            {
                type: "input",
                translatePathTitle:
                    ACTUAL_PATH + "chorusConfig.oscillatorFrequency",
                attributes: {
                    type: "number",
                    min: "0",
                    value: chorus.oscillatorFrequency.toString(),
                    setting: "osc-freq"
                }
            },
            {
                type: "input",
                translatePathTitle:
                    ACTUAL_PATH + "chorusConfig.frequencyVariation",
                attributes: {
                    type: "number",
                    min: "0",
                    value: chorus.oscillatorFrequencyVariation.toString(),
                    setting: "freq-var"
                }
            },
            {
                type: "input",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.oscillatorGain",
                attributes: {
                    type: "number",
                    min: "0",
                    value: chorus.oscillatorGain.toString(),
                    setting: "osc-gain"
                }
            },
            {
                type: "button",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.apply",
                onClick: (n) => {
                    const getVal = (q: string) => {
                        const e = n.div.querySelector(q);
                        return parseFloat((e as HTMLInputElement).value);
                    };

                    const config = { ...chorus };
                    config.nodesAmount = getVal("input[setting='nodes']");
                    config.defaultDelay = getVal("input[setting='nodes']");
                    config.delayVariation = getVal(
                        "input[setting='delay-var']"
                    );
                    config.stereoDifference = getVal("input[setting='stereo']");
                    config.oscillatorFrequency = getVal(
                        "input[setting='osc-freq']"
                    );
                    config.defaultDelay = getVal("input[setting='delay']");
                    config.oscillatorFrequencyVariation = getVal(
                        "input[setting='freq-var']"
                    );
                    config.oscillatorGain = getVal("input[setting='osc-gain']");
                    synth.chorusProcessor?.update(config);
                }
            }
        ],
        999999,
        true,
        locale
    );
    nofification.div.onclick = (e) => e.stopImmediatePropagation();
    return nofification;
}
