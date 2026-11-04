import {
    type GSEqualizerController,
    gsEqualizerEffectData,
    type GSEqualizerParams
} from "./gs_effect_params.ts";
import { Meter } from "./synthui_meter.ts";
import { LOCALE_PATH, type SynthesizerUI } from "../synthetizer_ui.ts";
import { Ut } from "../../utils/other.js";
import { MIDIUtils } from "spessasynth_core";

export function createGSEqualizerController(
    this: SynthesizerUI
): GSEqualizerController {
    const path = LOCALE_PATH + "effectsConfig.equalizer.";
    let isLocked = false;

    const wrapper = document.createElement("div");
    wrapper.classList.add("effect_wrapper", "synthui_tab");
    Ut.hide(wrapper);
    // Title
    const effectTitle = document.createElement("h2");
    this.locale.bindObjectProperty(effectTitle, "textContent", path + "title");
    wrapper.append(effectTitle);

    // Subtitle
    const effectSubtitle = document.createElement("h4");
    this.locale.bindObjectProperty(
        effectSubtitle,
        "textContent",
        path + "description"
    );
    wrapper.append(effectSubtitle);

    // Lock
    const lockWrapper = document.createElement("div");
    lockWrapper.style.display = "flex";
    lockWrapper.style.flexWrap = "wrap";
    wrapper.append(lockWrapper);
    const lock = document.createElement("button");
    lock.classList.add("synthui_button");
    this.locale.bindObjectProperty(
        lock,
        "textContent",
        LOCALE_PATH + "effectsConfig.toggleLock.title"
    );
    this.locale.bindTooltip(
        lock,
        LOCALE_PATH + "effectsConfig.toggleLock.description"
    );
    const toggleLock = () => {
        isLocked = !isLocked;
        this.synth.setSystemParameter("gsEqualizerLock", isLocked);
        lock.style.color = isLocked ? "red" : "";
        // The equalizer lock does not cover the channel switches
        for (const channel of this.synth.midiChannels) {
            channel.lockMIDIParameter("eqEnabled", isLocked);
        }
    };
    lock.addEventListener("click", toggleLock);
    lockWrapper.append(lock);

    // Parameters
    const paramWrapper = document.createElement("div");
    paramWrapper.classList.add("effect_wrapper_params");
    wrapper.append(paramWrapper);
    const meters: Partial<Record<GSEqualizerParams, Meter>> = {};
    for (const param of gsEqualizerEffectData) {
        const meter = new Meter({
            color: "",
            localePath: path + param.p,
            locale: this.locale,
            min: param.r?.min ?? 0,
            max: param.r?.max ?? 127,
            def: param.d,
            onEdit: (v) => {
                if (isLocked) {
                    this.synth.setSystemParameter("gsEqualizerLock", false);
                }
                this.synth.systemExclusive(
                    MIDIUtils.setGSEqualizerParameter(0, param.p, Math.round(v))
                        .data
                );
                if (isLocked) {
                    this.synth.setSystemParameter("gsEqualizerLock", true);
                }
            },
            transform: param.td
        });
        paramWrapper.append(meter.div);
        meters[param.p] = meter;
    }

    // Active channels title
    const channelsTitle = document.createElement("h2");
    this.locale.bindObjectProperty(
        channelsTitle,
        "textContent",
        path + "activeChannels.title"
    );
    wrapper.append(channelsTitle);

    // Active channels subtitle
    const channelsSubtitle = document.createElement("h4");
    this.locale.bindObjectProperty(
        channelsSubtitle,
        "textContent",
        path + "activeChannels.description"
    );
    wrapper.append(channelsSubtitle);

    const eqEnabledButtons = new Array<HTMLDivElement>();
    let channelNumber = 0;
    let buttonWrapper: HTMLDivElement | undefined;
    const addNewChannel = () => {
        if (channelNumber % 16 === 0) {
            // A new port (new row)
            buttonWrapper = document.createElement("div");
            buttonWrapper.classList.add("effect_wrapper_params", "efx_assign");
            wrapper.append(buttonWrapper);
        }
        if (!buttonWrapper) {
            return;
        }
        // Copied, so the channel number stays as set
        const channel = channelNumber;
        const button = document.createElement("div");
        button.innerHTML = `<pre>${channel + 1}</pre>`;
        this.locale.bindTooltip(button, path + "activeChannels.channelButton", [
            channel + 1
        ]);
        button.classList.add("controller_element", "mute_button");
        button.style.setProperty(
            "--btn-border-color",
            this.channelColors[channel % 16]
        );
        button.classList.toggle(
            "red",
            this.synth.midiChannels[channel]?.midiParameters.eqEnabled ?? true
        );

        button.addEventListener("click", () => {
            const ch = channel % 16;
            const midiChannel = this.synth.midiChannels[channel];
            if (isLocked) {
                midiChannel.lockMIDIParameter("eqEnabled", false);
            }
            for (const message of MIDIUtils.setChannelMIDIParameter(
                0,
                ch,
                "gs",
                "eqEnabled",
                !button.classList.contains("red")
            )) {
                this.synth.systemExclusive(message.data, channel - ch);
            }
            if (isLocked) {
                midiChannel.lockMIDIParameter("eqEnabled", true);
            }
        });
        buttonWrapper.append(button);
        eqEnabledButtons.push(button);
        channelNumber++;
    };
    for (let i = 0; i < 16; i++) {
        addNewChannel();
    }

    return {
        ...(meters as Record<GSEqualizerParams, Meter>),
        wrapper,
        toggleLock,
        addNewChannel,
        eqEnabledButtons
    };
}
