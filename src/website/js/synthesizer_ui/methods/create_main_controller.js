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
    this.voiceMeter = new Meter("",
        LOCALE_PATH + "mainVoiceMeter",
        this.locale,
        [],
        0,
        VOICE_CAP);
    this.voiceMeter.bar.classList.add("voice_meter_bar_smooth");
    this.voiceMeter.div.classList.add("main_controller_element");

    /**
     * Volume controller
     * @type {Meter}
     */
    this.volumeController = new Meter("",
        LOCALE_PATH + "mainVolumeMeter",
        this.locale,
        [],
        0,
        200,
        true,
        v => {
            this.synth.setMainVolume(Math.round(v) / 100);
            this.volumeController.update(v);
        });
    this.volumeController.bar.classList.add("voice_meter_bar_smooth");
    this.volumeController.div.classList.add("main_controller_element");
    this.volumeController.update(100);

    /**
     * Pan controller
     * @type {Meter}
     */
    this.panController = new Meter("",
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
    this.panController.div.classList.add("main_controller_element");
    this.panController.update(0);

    /**
     * Transpose controller
     * @type {Meter}
     */
    this.transposeController = new Meter("",
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
    this.transposeController.div.classList.add("main_controller_element");
    this.transposeController.update(0);

    // note killer
    let midiPanicButton = document.createElement("button");
    this.locale.bindObjectProperty(midiPanicButton, "textContent", LOCALE_PATH + "midiPanic.title");
    this.locale.bindObjectProperty(midiPanicButton, "title", LOCALE_PATH + "midiPanic.description");

    midiPanicButton.classList.add("synthui_button");
    midiPanicButton.classList.add("main_controller_element");
    midiPanicButton.onclick = () => this.synth.stopAll(true);

    // system reset button
    let resetCCButton = document.createElement("button");
    this.locale.bindObjectProperty(resetCCButton, "textContent", LOCALE_PATH + "systemReset.title");
    this.locale.bindObjectProperty(resetCCButton, "title", LOCALE_PATH + "systemReset.description");

    resetCCButton.classList.add("synthui_button");
    resetCCButton.classList.add("main_controller_element");
    resetCCButton.onclick = () => this.synth.resetControllers();



    // black midi mode toggle
    const highPerfToggle = document.createElement("button");
    this.locale.bindObjectProperty(highPerfToggle, "textContent", LOCALE_PATH + "blackMidiMode.title");
    this.locale.bindObjectProperty(highPerfToggle, "title", LOCALE_PATH + "blackMidiMode.description");

    highPerfToggle.classList.add("synthui_button");
    highPerfToggle.classList.add("main_controller_element");
    highPerfToggle.onclick = () => {
        this.synth.highPerformanceMode = !this.synth.highPerformanceMode;
    }

    // vibrato reset
    const vibratoReset = document.createElement("button");
    this.locale.bindObjectProperty(vibratoReset, "textContent", LOCALE_PATH + "disableCustomVibrato.title");
    this.locale.bindObjectProperty(vibratoReset, "title", LOCALE_PATH + "disableCustomVibrato.description");

    vibratoReset.classList.add("synthui_button");
    vibratoReset.classList.add("main_controller_element");
    vibratoReset.onclick = () => {
        this.synth.disableGSNRPparams();
        vibratoReset.parentNode.removeChild(vibratoReset);
    }

    // help button
    const helpButton = document.createElement("a");
    helpButton.href = "https://github.com/spessasus/SpessaSynth/wiki/How-To-Use-App#synthesizer-controller";
    helpButton.target = "#";
    helpButton.classList.add("main_controller_element");
    helpButton.classList.add("synthui_button");
    this.locale.bindObjectProperty(helpButton, "textContent", LOCALE_PATH + "helpButton.title");
    this.locale.bindObjectProperty(helpButton, "title", LOCALE_PATH + "helpButton.description");

    /**
     * interpolation type
     * @type {HTMLSelectElement}
     */
    const interpolation = document.createElement("select");
    interpolation.classList.add("main_controller_element");
    interpolation.classList.add("synthui_button");
    this.locale.bindObjectProperty(interpolation, "title", LOCALE_PATH + "interpolation.description");

    // interpolation types
    {
        /**
         * linear (default)
         * @type {HTMLOptionElement}
         */
        const linear = document.createElement("option");
        linear.value = "0";
        linear.selected = true;
        this.locale.bindObjectProperty(linear, "textContent", LOCALE_PATH + "interpolation.linear");
        interpolation.appendChild(linear);

        /**
         * nearest neighbor
         * @type {HTMLOptionElement}
         */
        const nearest = document.createElement("option");
        nearest.value = "1";
        this.locale.bindObjectProperty(nearest, "textContent", LOCALE_PATH + "interpolation.nearestNeighbor");
        interpolation.appendChild(nearest);

        interpolation.onchange = () => {
            this.synth.setInterpolationType(parseInt(interpolation.value));
        }
    }

    // main controller
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

    // meters
    controlsWrapper.appendChild(this.volumeController.div);
    controlsWrapper.appendChild(this.panController.div);
    controlsWrapper.appendChild(this.transposeController.div);
    // buttons
    controlsWrapper.appendChild(midiPanicButton);
    controlsWrapper.appendChild(resetCCButton);
    controlsWrapper.appendChild(highPerfToggle);
    controlsWrapper.appendChild(vibratoReset);
    controlsWrapper.appendChild(helpButton);
    controlsWrapper.appendChild(interpolation);

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
        showControllerButton,
        helpButton,
        interpolation
    ];
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
        this.isShown = false;
        this.hideControllers();
    })
}