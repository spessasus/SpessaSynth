import { getEvent, messageTypes, midiControllers } from '../midi_parser/midi_message.js'
import { Synthetizer } from '../synthetizer/synthetizer.js'
import { ShiftableByteArray } from '../utils/shiftable_array.js'
import { consoleColors } from '../utils/other.js'


export class MIDIDeviceHandler
{
    constructor()
    {}
    async createMIDIDeviceHandler()
    {
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
        input.onmidimessage = event => {
            // discard as soon as possible if high perf
            const statusByteData = getEvent(event.data[0]);


            // process the event
            switch (statusByteData.status)
            {
                case messageTypes.noteOn:
                    const velocity = event.data[2];
                    if(velocity > 0) {
                        synth.noteOn(statusByteData.channel, event.data[1], velocity);
                    }
                    else
                    {
                        synth.noteOff(statusByteData.channel, event.data[1]);
                    }
                    break;

                case messageTypes.noteOff:
                    synth.noteOff(statusByteData.channel, event.data[1]);
                    break;

                case messageTypes.pitchBend:
                    synth.pitchWheel(statusByteData.channel, event.data[2], event.data[1]);
                    break;

                case messageTypes.controllerChange:
                    synth.controllerChange(statusByteData.channel, midiControllers[event.data[1]], event.data[2]);
                    break;

                case messageTypes.programChange:
                    synth.programChange(statusByteData.channel, event.data[1]);
                    break;

                case messageTypes.systemExclusive:
                    synth.systemExclusive(new ShiftableByteArray(event.data.slice(1)));
                    break;

                case messageTypes.reset:
                    synth.stopAll();
                    synth.resetControllers();
                    break;

                default:
                    break;
            }
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
        input.onmidimessage = undefined;
        console.log(`%cDisconnected from %c${input.name}`,
            consoleColors.info,
            consoleColors.recognized);
    }

    disconnectAllDevicesFromSynth()
    {
        for(const i of this.inputs)
        {
            i[1].onmidimessage = undefined;
        }
    }
}