import { MIDIDeviceHandler } from '../../spessasynth_lib/midi_handler/midi_handler.js'
import { midiControllers } from '../../spessasynth_lib/midi_parser/midi_message.js'

export class SequencePlayer
{
    /**
     * @param synth {Synthetizer}
     * @param recorder {SequenceRecorder}
     */
    constructor(synth, recorder) {
        this.synth = synth;
        this.recorder = recorder;
        this.startTime = 0;
        this.eventIndex = 0;
    }

    play() {
        if(this.recorder.events.length < 1)
        {
            return
        }
        this.startTime = this.synth.currentTime;
        this.timeout = setInterval(this.processTick.bind(this));
    }

    processTick()
    {
        let event = this.recorder.events[this.eventIndex];

        while(event.absoluteTime < this.currentTime)
        {
            MIDIDeviceHandler.decodeMidiMessage([event.eventStatusByte, ...event.eventData], this.synth);
            this.eventIndex++;
            if(this.eventIndex >= this.recorder.events.length)
            {
                this.synth.controllerChange(this.recorder.targetChannel, midiControllers.allNotesOff, 0);
                this.eventIndex = 0;
                this.startTime = this.synth.currentTime;
            }
            event = this.recorder.events[this.eventIndex];
        }
    }

    get currentTime()
    {
        return this.synth.currentTime - this.startTime;
    }
}