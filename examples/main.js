// import the modules
import { MIDI } from '../src/spessasynth_lib/midi_parser/midi_loader.js'
import { Sequencer } from '../src/spessasynth_lib/sequencer/sequencer.js'
import { Synthetizer } from '../src/spessasynth_lib/synthetizer/synthetizer.js'

// load the soundfont
fetch("soundfont.sf2").then(async response => {
    // load the soundfont into an array buffer
    let soundFontArrayBuffer = await response.arrayBuffer();
    document.getElementById("message").innerText = "SoundFont has been loaded!";

    // add an event listener for the file inout
    document.getElementById("midi_input").addEventListener("change", async event => {
        // check if any files are added
        if (!event.target.files[0]) {
            return;
        }
        const file = event.target.files[0];
        const arrayBuffer = await file.arrayBuffer();                           // convert the file to array buffer
        const parsedMidi = new MIDI(arrayBuffer);                             // parse the MIDI file
        const context = new AudioContext();                                     // create an audioContext
        // add the worklet
        await context.audioWorklet.addModule("./spessasynth_lib/synthetizer/worklet_system/worklet_processor.js")
        const synth = new Synthetizer(context.destination, soundFontArrayBuffer);          // create the synthetizer
        const seq = new Sequencer([parsedMidi], synth);                         // create the sequencer (it can accept multiple files, so we need to pass an array)
        seq.play();
    })
});