import { Meter } from './synthui_meter.js'
import { VOICE_CAP } from '../../../../spessasynth_lib/synthetizer/synthetizer.js'
import { LOCALE_PATH } from '../synthetizer_ui.js'

/**
 * @this {SynthetizerUI}
 */
export function createMainSynthController()
{
    // controls wrapper
    let controlsWrapper = document.createElement("div");
    controlsWrapper.classList.add("controls_wrapper");

    /**
     * Voice meter
     * @type {Meter}
     */
    this.voiceMeter = new Meter("#206",
        LOCALE_PATH + "mainVoiceMeter",
        this.locale,
        [],
        0,
        VOICE_CAP);
    this.voiceMeter.bar.classList.add("voice_meter_bar_smooth");

    /**
     * Volume controller
     * @type {Meter}
     */
    this.volumeController = new Meter("#206",
        LOCALE_PATH + "mainVolumeMeter",
        this.locale,
        [],
        0,
        100,
        true,
        v => {
            this.synth.setMainVolume(Math.round(v) / 100);
            this.volumeController.update(v);
        });
    this.volumeController.bar.classList.add("voice_meter_bar_smooth");
    this.volumeController.update(100);

    /**
     * Pan controller
     * @type {Meter}
     */
    this.panController = new Meter("#206",
        LOCALE_PATH + "mainPanMeter",
        this.locale,
        [],
        -1,
        1,
        true,
        v => {
            // use roland gs master pan
            this.synth.setMasterPan(v);
            this.panController.update(v);
        });
    this.panController.bar.classList.add("voice_meter_bar_smooth");
    this.panController.update(0);

    /**
     * Transpose controller
     * @type {Meter}
     */
    this.transposeController = new Meter("#206",
        LOCALE_PATH + "mainTransposeMeter",
        this.locale,
        [],
        -12,
        12,
        true,
        v => {
            // limit to half semitone precision
            this.synth.transpose(Math.round(v * 2 ) / 2);
            this.transposeController.update(Math.round(v * 2) / 2)
        });
    this.transposeController.bar.classList.add("voice_meter_bar_smooth");
    this.transposeController.update(0);

    // note killer
    let midiPanicButton = document.createElement("button");
    this.locale.bindObjectProperty(midiPanicButton, "textContent", LOCALE_PATH + "midiPanic.title");
    this.locale.bindObjectProperty(midiPanicButton, "title", LOCALE_PATH + "midiPanic.description");

    midiPanicButton.classList.add("synthui_button");
    midiPanicButton.onclick = () => this.synth.stopAll(true);

    let resetCCButton = document.createElement("button");
    this.locale.bindObjectProperty(resetCCButton, "textContent", LOCALE_PATH + "systemReset.title");
    this.locale.bindObjectProperty(resetCCButton, "title", LOCALE_PATH + "systemReset.description");

    resetCCButton.classList.add("synthui_button");
    resetCCButton.onclick = () => this.synth.resetControllers();

    // create the main controller now, to give the button a variable to work with
    let controller = document.createElement("div");
    controller.classList.add("synthui_controller");
    this.uiDiv.appendChild(controller);

    // channel controller shower
    let showControllerButton = document.createElement("button");
    this.locale.bindObjectProperty(showControllerButton, "textContent", LOCALE_PATH + "toggleButton.title");
    this.locale.bindObjectProperty(showControllerButton, "title", LOCALE_PATH + "toggleButton.description");
    showControllerButton.classList.add("synthui_button");
    showControllerButton.onclick = () => {
        this.hideOnDocClick = false;
        this.toggleVisibility();
    }

    // black midi mode toggle
    const highPerfToggle = document.createElement("button");
    this.locale.bindObjectProperty(highPerfToggle, "textContent", LOCALE_PATH + "blackMidiMode.title");
    this.locale.bindObjectProperty(highPerfToggle, "title", LOCALE_PATH + "blackMidiMode.description");

    highPerfToggle.classList.add("synthui_button");
    highPerfToggle.onclick = () => {
        this.synth.highPerformanceMode = !this.synth.highPerformanceMode;
    }

    // vibrato reset
    const vibratoReset = document.createElement("button");
    this.locale.bindObjectProperty(vibratoReset, "textContent", LOCALE_PATH + "disableCustomVibrato.title");
    this.locale.bindObjectProperty(vibratoReset, "title", LOCALE_PATH + "disableCustomVibrato.description");

    vibratoReset.classList.add("synthui_button");
    vibratoReset.onclick = () => {
        this.synth.lockAndResetChannelVibrato();
        vibratoReset.parentNode.removeChild(vibratoReset);
    }

    // meters
    controlsWrapper.appendChild(this.volumeController.div);
    controlsWrapper.appendChild(this.panController.div);
    controlsWrapper.appendChild(this.transposeController.div);
    // buttons
    controlsWrapper.appendChild(midiPanicButton);
    controlsWrapper.appendChild(resetCCButton);
    controlsWrapper.appendChild(highPerfToggle);
    controlsWrapper.appendChild(vibratoReset);

    /**
     * @type {Meter[]}
     */
    this.mainMeters = [
        this.volumeController,
        this.panController,
        this.transposeController,
        this.voiceMeter,
    ];
    /**
     * @type {HTMLElement[]}
     */
    this.mainButtons = [
        midiPanicButton,
        resetCCButton,
        highPerfToggle,
        vibratoReset,
        showControllerButton];
    // main synth div
    this.uiDiv.appendChild(this.voiceMeter.div);
    this.uiDiv.appendChild(showControllerButton);
    controller.appendChild(controlsWrapper);
    this.mainControllerDiv = controller;
    // stop propagation to not hide
    this.mainControllerDiv.onclick = e => e.stopPropagation();
    // hide if clicked outside
    document.addEventListener("click", () => {
        if(!this.hideOnDocClick)
        {
            this.hideOnDocClick = true;
            return;
        }
        controller.classList.remove("synthui_controller_show");
        controlsWrapper.classList.remove("controls_wrapper_show");
        this.isShown = false;
        this.hideControllers();
    })
}