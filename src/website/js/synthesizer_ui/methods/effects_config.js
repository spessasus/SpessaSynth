import { closeNotification, showNotification } from "../../notification/notification.js";
import { SpessaSynthInfo } from "../../../../spessasynth_lib/utils/loggin.js";
import { consoleColors } from "../../../../spessasynth_lib/utils/other.js";
import { DEFAULT_CHORUS_CONFIG } from "../../../../spessasynth_lib/synthetizer/audio_effects/fancy_chorus.js";

const USER_CONFIG = {
    nodesAmount: DEFAULT_CHORUS_CONFIG.nodesAmount,
    defaultDelay: DEFAULT_CHORUS_CONFIG.defaultDelay,
    delayVariation: DEFAULT_CHORUS_CONFIG.delayVariation,
    stereoDifference: DEFAULT_CHORUS_CONFIG.stereoDifference,
    oscillatorFrequency: DEFAULT_CHORUS_CONFIG.oscillatorFrequency,
    oscillatorFrequencyVariation: DEFAULT_CHORUS_CONFIG.oscillatorFrequencyVariation,
    oscillatorGain: DEFAULT_CHORUS_CONFIG.oscillatorGain
};

/**
 * @param locale {LocaleManager}
 * @param path {string}
 * @param synth {Synthetizer}
 * @returns {NotificationType}
 */
export function showEffectsConfigWindow(locale, path, synth)
{
    const ACTUAL_PATH = path + "effectsConfig.";
    const nofification = showNotification(
        locale.getLocaleString(ACTUAL_PATH + "button.title"),
        [
            {
                type: "button",
                translatePathTitle: path + "disableCustomVibrato",
                onClick: (_, el) =>
                {
                    synth.disableGSNRPparams();
                    el.parentNode.removeChild(el);
                }
            },
            
            // REVERB
            {
                type: "text",
                translatePathTitle: ACTUAL_PATH + "reverbConfig",
                attributes: { "style": "margin-bottom: -0.5rem" }
            },
            {
                type: "file",
                translatePathTitle: ACTUAL_PATH + "reverbConfig.impulseResponse",
                attributes: { "accept": "audio/*" },
                listeners: {
                    "input": async e =>
                    {
                        if (e.target.files.length === 0)
                        {
                            return;
                        }
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        const btn = e.target.parentElement.parentElement;
                        btn.textContent = locale.getLocaleString("locale.synthInit.genericLoading");
                        const buffer = await synth.context.decodeAudioData(await e.target.files[0].arrayBuffer());
                        synth.setReverbResponse(buffer);
                        btn.textContent = locale.getLocaleString("locale.synthInit.done");
                        SpessaSynthInfo(
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
                attributes: { "style": "margin-bottom: -0.5rem" }
            },
            {
                type: "input",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.nodesAmount",
                attributes: {
                    "type": "number",
                    "min": "0",
                    "value": USER_CONFIG.nodesAmount,
                    "setting": "nodes"
                }
            },
            {
                type: "input",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.defaultDelay",
                attributes: {
                    "type": "number",
                    "min": "0",
                    "value": USER_CONFIG.defaultDelay,
                    "setting": "delay"
                }
            },
            {
                type: "input",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.delayVariation",
                attributes: {
                    "type": "number",
                    "min": "0",
                    "value": USER_CONFIG.delayVariation,
                    "setting": "delay-var"
                }
            },
            {
                type: "input",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.stereoDifference",
                attributes: {
                    "type": "number",
                    "min": "0",
                    "value": USER_CONFIG.stereoDifference,
                    "setting": "stereo"
                }
            },
            {
                type: "input",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.oscillatorFrequency",
                attributes: {
                    "type": "number",
                    "min": "0",
                    "value": USER_CONFIG.oscillatorFrequency,
                    "setting": "osc-freq"
                }
            },
            {
                type: "input",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.frequencyVariation",
                attributes: {
                    "type": "number",
                    "min": "0",
                    "value": USER_CONFIG.oscillatorFrequencyVariation,
                    "setting": "freq-var"
                }
            },
            {
                type: "input",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.oscillatorGain",
                attributes: {
                    "type": "number",
                    "min": "0",
                    "value": USER_CONFIG.oscillatorGain,
                    "setting": "osc-gain"
                }
            },
            {
                type: "button",
                translatePathTitle: ACTUAL_PATH + "chorusConfig.apply",
                onClick: n =>
                {
                    USER_CONFIG.nodesAmount = parseFloat(n.div.querySelector("input[setting='nodes']").value);
                    USER_CONFIG.defaultDelay = parseFloat(n.div.querySelector("input[setting='delay']").value);
                    USER_CONFIG.delayVariation = parseFloat(n.div.querySelector("input[setting='delay-var']").value);
                    USER_CONFIG.stereoDifference = parseFloat(n.div.querySelector("input[setting='stereo']").value);
                    USER_CONFIG.oscillatorFrequency = parseFloat(n.div.querySelector("input[setting='osc-freq']").value);
                    USER_CONFIG.defaultDelay = parseFloat(n.div.querySelector("input[setting='delay']").value);
                    USER_CONFIG.oscillatorFrequencyVariation = parseFloat(n.div.querySelector(
                        "input[setting='freq-var']").value);
                    USER_CONFIG.oscillatorGain = parseFloat(n.div.querySelector("input[setting='osc-gain']").value);
                    synth.setChorusConfig(USER_CONFIG);
                    closeNotification(n.id);
                }
            }
        ],
        999999,
        true,
        locale
    );
    nofification.div.onclick = e => e.stopImmediatePropagation();
    return nofification;
}