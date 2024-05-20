import { Synthetizer } from '../synthetizer/synthetizer.js'
import { consoleColors } from '../utils/other.js';

/**
 * midi_handler.js
 * purpose: handles the connection between MIDI devices and synthesizer/sequencer via Web MIDI API
 */

const NO_INPUT = null;

export class MIDIDeviceHandler
{
    constructor()
    {}
    async createMIDIDeviceHandler()
    {
        /**
         * @type {MIDIInput}
         */
        this.selectedInput = NO_INPUT;
        /**
         * @type {MIDIOutput}
         */
        this.selectedOutput = NO_INPUT;
        if(navigator.requestMIDIAccess) {
            // prepare the midi access
            try
            {
                const response = await navigator.requestMIDIAccess({ sysex: true, software: true });
                this.inputs = response.inputs;
                this.outputs = response.outputs;
                console.log("%cMIDI handler created!", consoleColors.recognized);
            }
            catch (e) {
                console.warn(`Could not get MIDI Devices:`, e);
                this.inputs = [];
                this.outputs = [];
            }
        }
        else
        {
            this.inputs = [];
            this.outputs = [];
        }
    }

    /**
     * Connects the sequencer to a given MIDI output port
     * @param output {MIDIOutput}
     * @param seq {Sequencer}
     */
    connectMIDIOutputToSeq(output, seq)
    {
        this.selectedOutput = output;
        seq.connectMidiOutput(output);
        console.log(`%cPlaying MIDI to %c${output.name}`,
            consoleColors.info,
            consoleColors.recognized);
    }

    /**
     * Disconnects a midi output port from the sequencer
     * @param seq {Sequencer}
     */
    disconnectSeqFromMIDI(seq)
    {
        this.selectedOutput = NO_INPUT;
        seq.connectMidiOutput(undefined);
        console.log("%cDisconnected from MIDI out.",
            consoleColors.info);
    }

    /**
     * Connects a MIDI input to the synthesizer
     * @param input {MIDIInput}
     * @param synth {Synthetizer}
     */
    connectDeviceToSynth(input, synth)
    {
        this.selectedInput = input;
        input.onmidimessage = event => {
            synth.sendMessage(event.data);
        }
        console.log(`%cListening for messages on %c${input.name}`,
            consoleColors.info,
            consoleColors.recognized);
    }

    /**
     * @param input {MIDIInput}
     */
    disconnectDeviceFromSynth(input)
    {
        this.selectedInput = NO_INPUT;
        input.onmidimessage = undefined;
        console.log(`%cDisconnected from %c${input.name}`,
            consoleColors.info,
            consoleColors.recognized);
    }

    disconnectAllDevicesFromSynth()
    {
        this.selectedInput = NO_INPUT;
        for(const i of this.inputs)
        {
            i[1].onmidimessage = undefined;
        }
    }
}