import { Synthetizer } from '../synthetizer/synthetizer.js'
import { consoleColors } from '../utils/other.js'
import { SpessaSynthInfo } from '../utils/loggin.js'

/**
 * web_midi_link.js
 * purpose: handles the web midi link connection to the synthesizer
 * https://www.g200kg.com/en/docs/webmidilink/
 */

export class WebMidiLinkHandler
{
    /**
     * @param synth {Synthetizer} the synth to play to
     */
    constructor(synth) {

        window.addEventListener("message", msg => {
            if(typeof  msg.data !== "string")
            {
                return
            }
            /**
             * @type {string[]}
             */
            const data = msg.data.split(",");
            if(data[0] !== "midi")
            {
                return;
            }

            data.shift(); // remove MIDI

            const midiData = data.map(byte => parseInt(byte, 16));

            synth.sendMessage(midiData);
        });

        SpessaSynthInfo("%cWeb MIDI Link handler created!", consoleColors.recognized);
    }
}