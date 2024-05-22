import {
    DEFAULT_GAIN,
    DEFAULT_PERCUSSION,
    Synthetizer,
    VOICE_CAP,
} from '../../../spessasynth_lib/synthetizer/synthetizer.js'
import { getDrumsSvg, getLoopSvg, getMuteSvg, getNoteSvg, getVolumeSvg } from '../icons.js'
import { ShiftableByteArray } from '../../../spessasynth_lib/utils/shiftable_array.js'
import { Meter } from './synthui_meter.js'
import { Selector } from './synthui_selector.js'
import { midiControllers } from '../../../spessasynth_lib/midi_parser/midi_message.js'

/**
 * synthesizer_ui.js
 * purpose: manages the graphical user interface for the synthesizer
 */

export class SynthetizerUI
{
    /**
     * Creates a new instance of synthetizer UI
     * @param colors {string[]}
     * @param element {HTMLElement} the element to create synthui in
     */
    constructor(colors, element) {
        this.channelColors = colors;
        const wrapper = element;
        this.uiDiv = document.createElement("div");
        this.uiDiv.classList.add("wrapper");
        wrapper.appendChild(this.uiDiv);
        this.uiDiv.style.visibility = "visible";
        this.isShown = false;
    }

    toggleDarkMode()
    {
        this.mainControllerDiv.classList.toggle("synthui_controller_light");
        this.mainButtons.forEach(b => {
            b.classList.toggle("synthui_button");
            b.classList.toggle("synthui_button_light");
        })

        this.mainMeters.forEach(meter => {
            meter.toggleMode(true);
        });

        this.controllers.forEach(controller => {
            controller.voiceMeter.toggleMode();
            controller.pitchWheel.toggleMode();
            controller.pan.toggleMode();
            controller.expression.toggleMode();
            controller.volume.toggleMode();
            controller.mod.toggleMode();
            controller.chorus.toggleMode();
            controller.preset.toggleMode();
            controller.presetReset.classList.toggle("voice_reset_light");
            controller.drumsToggle.classList.toggle("mute_button_light");
            controller.muteButton.classList.toggle("mute_button_light");
        })
    }

    /**
     * Connects the synth to UI
     * @param synth {Synthetizer}
     */
    connectSynth(synth)
    {
        this.synth = synth;

        this.getInstrumentList();

        this.createMainSynthController();
        this.createChannelControllers();

        document.addEventListener("keydown", e => {
            switch (e.key.toLowerCase())
            {
                case "s":
                    e.preventDefault();
                    const controller = this.uiDiv.getElementsByClassName("synthui_controller")[0];
                    controller.classList.toggle("synthui_controller_show");
                    controller.getElementsByClassName("controls_wrapper")[0].classList.toggle("controls_wrapper_show");
                    this.isShown = !this.isShown;
                    if(this.isShown)
                    {
                        this.showControllers();
                    }
                    else
                    {
                        this.hideControllers()
                    }
                    break;

                case "b":
                    e.preventDefault();
                    this.synth.highPerformanceMode = !this.synth.highPerformanceMode;
                    break;

                case "backspace":
                    e.preventDefault();
                    this.synth.stopAll(true);
                    break;
            }
        })
    }

    createMainSynthController()
    {
        // controls wrapper
        let controlsWrapper = document.createElement("div");
        controlsWrapper.classList.add("controls_wrapper");

        /**
         * Voice meter
         * @type {Meter}
         */
        this.voiceMeter = new Meter("#206",
            "Voices: ",
            0,
             VOICE_CAP,
            "The total amount of voices currently playing");
        this.voiceMeter.bar.classList.add("voice_meter_bar_smooth");

        /**
         * Volume controller
         * @type {Meter}
         */
        this.volumeController = new Meter("#206",
            "Volume: ",
            0,
            100,
            "The current master volume of the synthesizer",
            true,
                v => {
            this.synth.setMainVolume(Math.round(v) / 100);
        });
        this.volumeController.bar.classList.add("voice_meter_bar_smooth");

        /**
         * Pan controller
         * @type {Meter}
         */
        this.panController = new Meter("#206",
            "Pan: ",
            -1,
            1,
            "The current master stereo panning of the synthesizer",
            true,
            v => {
            // use roland gs master pan
            this.synth.systemExclusive(new ShiftableByteArray([0x41, 0x10, 0x42, 0x12, 0x40, 0x00, 0x06, ((v + 1) / 2) * 127]));
        });
        this.panController.bar.classList.add("voice_meter_bar_smooth");

        /**
         * Transpose controller
         * @type {Meter}
         */
        this.transposeController = new Meter("#206",
            "Transpose: ",
            -12,
            12,
            "Allows to transpose the synthesizer by semitones",
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
        midiPanicButton.innerText = "MIDI Panic";
        midiPanicButton.title = "Stops all voices immediately";
        midiPanicButton.classList.add("synthui_button");
        midiPanicButton.onclick = () => this.synth.stopAll(true);

        let resetCCButton = document.createElement("button");
        resetCCButton.innerText = "System Reset";
        resetCCButton.title = "Resets all controllers to their default values"
        resetCCButton.classList.add("synthui_button");
        resetCCButton.onclick = () => this.synth.resetControllers();

        // create the main controller now, to give the button a variable to work with
        let controller = document.createElement("div");
        controller.classList.add("synthui_controller");
        this.uiDiv.appendChild(controller);

        // channel controller shower
        let showControllerButton = document.createElement("button");
        showControllerButton.innerText = this.synth.synthesisMode === "legacy" ? "Synth controller (legacy mode)" : "Synthesizer controller";
        if(showControllerButton.innerText !== "Synthesizer controller")
        {
            showControllerButton.style.color = "red";
            showControllerButton.style.fontWeight = "bolder";
        }
        showControllerButton.title = "Shows the synthesizer controller"
        showControllerButton.classList.add("synthui_button");
        showControllerButton.onclick = () => {
            controller.classList.toggle("synthui_controller_show");
            controlsWrapper.classList.toggle("controls_wrapper_show");
            this.isShown = !this.isShown;
            if(this.isShown)
            {
                this.showControllers();
            }
            else
            {
                this.hideControllers()
            }
        }

        // black midi mode toggle
        const highPerfToggle = document.createElement("button");
        highPerfToggle.innerText = "Black MIDI mode";
        highPerfToggle.title = "Toggles the High Performance Mode, simplifying the look and killing the notes faster"
        highPerfToggle.classList.add("synthui_button");
        highPerfToggle.onclick = () => {
            this.synth.highPerformanceMode = !this.synth.highPerformanceMode;
        }

        // vibrato reset
        const vibratoReset = document.createElement("button");
        vibratoReset.innerText = "Disable custom vibrato";
        vibratoReset.title = "Disables the custom (NRPN) Vibrato permamently. Reload the website to reenable it"
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
    }

    createChannelControllers()
    {
        const dropdownDiv = this.uiDiv.getElementsByClassName("synthui_controller")[0];

        /**
         * @type {ChannelController[]}
         */
        this.controllers = [];
        for(const chan of this.synth.synthesisSystem.midiChannels)
        {
            const controller = this.createChannelController(chan, this.controllers.length);
            this.controllers.push(controller);
            dropdownDiv.appendChild(controller.controller);
        }

        this.setEventListeners();

        setInterval(this.updateVoicesAmount.bind(this), 100);
        this.hideControllers();
    }

    /**
     * @typedef {{
     *     controller: HTMLDivElement,
     *     voiceMeter: Meter,
     *     pitchWheel: Meter,
     *     pan: Meter,
     *     expression: Meter,
     *     volume: Meter,
     *     mod: Meter,
     *     chorus: Meter,
     *     reverb: Meter,
     *     preset: Selector,
     *     presetReset: HTMLDivElement,
     *     drumsToggle: HTMLDivElement,
     *     muteButton: HTMLDivElement
     * }} ChannelController
     */

    /**
     * Creates a new channel controller ui
     * @param channel {WorkletChannel}
     * @param channelNumber {number}
     * @returns {ChannelController}
     */
    createChannelController(channel, channelNumber)
    {
        // controller
        const controller = document.createElement("div");
        controller.classList.add("channel_controller");

        // voice meter
        const voiceMeter = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            "Voices: ",
            0,
            100,
            `The current amount of voices playing on channel ${channelNumber + 1}`);
        voiceMeter.bar.classList.add("voice_meter_bar_smooth");
        controller.appendChild(voiceMeter.div);

        // pitch wheel
        const pitchWheel = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            "Pitch: ",
            -8192,
            8192,
            `The current pitch bend of channel ${channelNumber + 1}`,
            true,
            val => {
                val = Math.round(val) + 8192;
                // get bend values
                const msb = val >> 7;
                const lsb = val & 0x7F;
                this.synth.pitchWheel(channelNumber, msb, lsb);
            });
        pitchWheel.update(0);
        controller.appendChild(pitchWheel.div);

        /**
         * @param cc {number}
         * @param val {number}
         * @param meter {Meter}
         */
        let changeCCUserFunction = (cc, val, meter) => {
            if(meter.isLocked)
            {
                this.synth.lockController(channelNumber, cc, false);
                this.synth.controllerChange(channelNumber, cc, val);
                this.synth.lockController(channelNumber, cc, true);
            }
            else {
                this.synth.controllerChange(channelNumber, cc, val);
            }
        }

        // pan controller
        const pan = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            "Pan: ",
            -1,
            1,
            `The current stereo panning of channel ${channelNumber + 1}`,
            true,
            val => {
                changeCCUserFunction(midiControllers.pan, (val / 2 + 0.5) * 127, pan);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.pan, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.pan, false);
            });
        pan.update(0);
        controller.appendChild(pan.div);

        // expression controller
        const expression = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            "Expression: ",
            0,
            127,
            `The current expression (loudness) of channel ${channelNumber + 1}`,
            true,
            val => {
                changeCCUserFunction(midiControllers.expressionController, val, expression);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.expressionController, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.expressionController, false);
            });
        expression.update(127);
        controller.appendChild(expression.div);

        // volume controller
        const volume = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            "Volume: ",
            0,
            127,
            `The current volume of channel ${channelNumber + 1}`,
            true,
            val => {
                changeCCUserFunction(midiControllers.mainVolume, val, volume);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.mainVolume, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.mainVolume, false);
            });
        volume.update(100);
        controller.appendChild(volume.div);

        // modulation wheel
        const modulation = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            "Mod Wheel: ",
            0,
            127,
            `The current modulation (vibrato) depth of channel ${channelNumber + 1}`,
            true,
            val => {
                changeCCUserFunction(midiControllers.modulationWheel, val, modulation);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.modulationWheel, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.modulationWheel, false);
            });
        modulation.update(0);
        controller.appendChild(modulation.div);

        // chorus
        const chorus = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            "Chorus: ",
            0,
            127, `The current level of chorus effect applied to channel ${channelNumber + 1}`,
            true,
            val => {
                changeCCUserFunction(midiControllers.effects3Depth, val, chorus);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.effects3Depth, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.effects3Depth, false);
            });
        chorus.update(0);
        controller.appendChild(chorus.div);

        // reverb
        const reverb = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            "Reverb: ",
            0,
            127, `The current level of reverb effect applied to channel ${channelNumber + 1}`,
            true,
            val => {
                changeCCUserFunction(midiControllers.effects1Depth, val, reverb);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.effects1Depth, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.effects1Depth, false);
            });
        reverb.update(0);
        controller.appendChild(reverb.div);

        // transpose
        const transpose = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            "Transpose: ",
            -36,
            36, `The pitch tuning applied to channel ${channelNumber + 1}`,
            true,
            val => {
                val = Math.round(val);
                // adjust to synth's transposition
                let transposition = this.synth.transposition + val;
                this.synth.synthesisSystem.transposeChannel(channelNumber, transposition, true);
                transpose.update(val);
            });
        transpose.update(0);
        controller.appendChild(transpose.div);

        // create it here so we can use it in the callback function
        const presetReset = document.createElement("div");

        // preset controller
        const presetSelector = new Selector((
                channel.percussionChannel ? this.percussionList : this.instrumentList
            ),
            `Change the instrument that channel ${channelNumber + 1} is using`,
            presetName => {
                const data = JSON.parse(presetName);
                this.synth.synthesisSystem.midiChannels[channelNumber].lockPreset = false;
                const sys = this.synth.system;
                this.synth.system = "gs";
                this.synth.controllerChange(channelNumber, midiControllers.bankSelect, data[0]);
                this.synth.programChange(channelNumber, data[1], true);
                presetSelector.mainDiv.classList.add("locked_selector");
                this.synth.synthesisSystem.midiChannels[channelNumber].lockPreset = true;
                this.synth.system = sys;
            }
        );
        controller.appendChild(presetSelector.mainDiv);

        // preset reset
        presetReset.innerHTML = getLoopSvg(32);
        presetReset.title = `Unlock channel ${channelNumber + 1} to allow program changes`
        presetReset.classList.add("controller_element");
        presetReset.classList.add("voice_reset");
        presetReset.onclick = () => {
            this.synth.synthesisSystem.midiChannels[channelNumber].lockPreset = false;
            presetSelector.mainDiv.classList.remove("locked_selector");
        }
        controller.appendChild(presetReset);

        // mute button
        const muteButton = document.createElement("div");
        muteButton.innerHTML = getVolumeSvg(32);
        muteButton.title = `Mute channel ${channelNumber + 1}`;
        muteButton.classList.add("controller_element");
        muteButton.classList.add("mute_button");
        muteButton.onclick = () => {
            if(this.synth.synthesisSystem.midiChannels[channelNumber].isMuted)
            {
                this.synth.muteChannel(channelNumber, false);
                muteButton.innerHTML = getVolumeSvg(32);
            }
            else
            {
                this.synth.muteChannel(channelNumber, true);
                muteButton.innerHTML = getMuteSvg(32);
            }
        }
        controller.appendChild(muteButton);

        // drums toggle
        const drumsToggle = document.createElement("div");
        drumsToggle.innerHTML = channelNumber === DEFAULT_PERCUSSION ? getDrumsSvg(32) : getNoteSvg(32);
        drumsToggle.title = `Toggle drums on channel ${channelNumber + 1}`;
        drumsToggle.classList.add("controller_element");
        drumsToggle.classList.add("mute_button");
        drumsToggle.onclick = () => {
            // correct the channel number
            const sysexChannelNumber = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 10, 11, 12, 13, 14, 15][channelNumber];
            this.synth.systemExclusive(new ShiftableByteArray([ // roland gs drum sysex
                0x41, // roland
                0x10, // device id (doesn't matter, really)
                0x42, // gs
                0x12,
                0x40, // drums
                0x10 | sysexChannelNumber,
                0x15, /// drums
                this.synth.synthesisSystem.midiChannels[channelNumber].percussionChannel ? 0x00 : 0x01,
                0x11,
                0xF7
            ]));
        }
        controller.appendChild(drumsToggle);

        return {
            controller: controller,
            voiceMeter: voiceMeter,
            pitchWheel: pitchWheel,
            pan: pan,
            expression: expression,
            volume: volume,
            mod: modulation,
            chorus: chorus,
            reverb: reverb,
            preset: presetSelector,
            presetReset: presetReset,
            drumsToggle: drumsToggle,
            muteButton: muteButton
        };

    }

    updateVoicesAmount()
    {
        this.voiceMeter.update(this.synth.voicesAmount);

        this.controllers.forEach((controller, i) => {
            // update channel
            let voices = this.synth.synthesisSystem.midiChannels[i].voicesAmount;
            controller.voiceMeter.update(voices);
            if(voices < 1 && this.synth.voicesAmount > 0)
            {
                controller.controller.classList.add("no_voices");
            }
            else
            {
                controller.controller.classList.remove("no_voices");
            }
        });
        this.volumeController.update((this.synth.volumeController.gain.value * (1 / DEFAULT_GAIN)) * 100);
        this.panController.update(this.synth.panController.pan.value);
    }

    setEventListeners()
    {
        const dropdownDiv = this.uiDiv.getElementsByClassName("synthui_controller")[0];
        // add event listeners
        this.synth.eventHandler.addEvent("programchange", "synthui-program-change", e =>
        {
            if(this.synth.synthesisSystem.midiChannels[e.channel].lockPreset)
            {
                return;
            }
            this.controllers[e.channel].preset.set(JSON.stringify([e.preset.bank, e.preset.program]));
        });

        this.synth.eventHandler.addEvent("controllerchange", "synthui-controller-change",e => {
            const controller = e.controllerNumber;
            const channel = e.channel;
            const value = e.controllerValue;
            switch (controller)
            {
                default:
                    break;

                case midiControllers.expressionController:
                    // expression
                    this.controllers[channel].expression.update(Math.round(value));
                    break;

                case midiControllers.mainVolume:
                    // volume
                    this.controllers[channel].volume.update(Math.round(value));
                    break;

                case midiControllers.pan:
                    // pan
                    this.controllers[channel].pan.update((value - 63) / 64);
                    break;

                case midiControllers.modulationWheel:
                    // mod wheel
                    this.controllers[channel].mod.update(value);
                    break;

                case midiControllers.effects3Depth:
                    // chorus
                    this.controllers[channel].chorus.update(value);
                    break;

                case midiControllers.effects1Depth:
                    // reverb
                    this.controllers[channel].reverb.update(value);
            }
        });

        this.synth.eventHandler.addEvent("pitchwheel", "synthui-pitch-wheel", e => {
            const val = (e.MSB << 7) | e.LSB;
            // pitch wheel
            this.controllers[e.channel].pitchWheel.update(val - 8192);
        });

        this.synth.eventHandler.addEvent("drumchange", "synthui-drum-change", e => {
            if(this.synth.synthesisSystem.midiChannels[e.channel].lockPreset)
            {
                return;
            }
            this.controllers[e.channel].drumsToggle.innerHTML = (e.isDrumChannel ? getDrumsSvg(32) : getNoteSvg(32));
            this.controllers[e.channel].preset.reload(e.isDrumChannel ? this.percussionList : this.instrumentList);
        });

        this.synth.eventHandler.addEvent("newchannel", "synthui-new-channel", channel => {
            const controller = this.createChannelController(channel, this.controllers.length);
            this.controllers.push(controller);
            dropdownDiv.appendChild(controller.controller);
            this.hideControllers();
        });
    }

    hideControllers()
    {
        this.controllers.forEach(c => {
            c.voiceMeter.hide();
            c.pitchWheel.hide();
            c.pan.hide();
            c.expression.hide();
            c.volume.hide();
            c.mod.hide();
            c.chorus.hide();
            c.preset.hide();
        })
    }
    showControllers()
    {
        this.controllers.forEach(c => {
            c.voiceMeter.show();
            c.pitchWheel.show();
            c.pan.show();
            c.expression.show();
            c.volume.show();
            c.mod.show();
            c.chorus.show();
            c.preset.show();
        })
    }

    getInstrumentList()
    {
        /**
         * @type {{name: string, program: number, bank: number}[]}
         */
        this.instrumentList = this.synth.soundFont.presets.filter(p => p.bank !== 128)
            .sort((a, b) => {
                if(a.program === b.program)
                {
                    return a.bank - b.bank;
                }
                return a.program - b.program;
            })
            .map(p => {
                return {
                    name: p.presetName,
                    bank: p.bank,
                    program: p.program
                };
            });

        /**
         * @type {{name: string, program: number, bank: number}[]}
         */
        this.percussionList = this.synth.soundFont.presets.filter(p => p.bank === 128)
            .sort((a, b) => a.program - b.program)
            .map(p => {
                return {
                    name: p.presetName,
                    bank: p.bank,
                    program: p.program
                };
            })
    }

    reloadSelectors()
    {
        this.getInstrumentList();
        this.controllers.forEach((controller, i) => {
            controller.preset.reload(this.synth.synthesisSystem.midiChannels[i].percussionChannel ? this.percussionList : this.instrumentList);
        })
    }
}