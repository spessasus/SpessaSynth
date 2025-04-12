// import the modules
import { Sequencer } from "../src/spessasynth_lib/sequencer/worklet_wrapper/sequencer.js";
import { Synthetizer } from "../src/spessasynth_lib/synthetizer/worklet_wrapper/synthetizer.js";
import { WORKLET_URL_ABSOLUTE } from "../src/spessasynth_lib/synthetizer/worklet_wrapper/worklet_url.js";

// load the soundfont (your path may vary)
fetch("../soundfonts/GeneralUserGS.sf3").then(async response =>
{
    // load the soundfont into an array buffer
    let soundFontArrayBuffer = await response.arrayBuffer();
    document.getElementById("message").innerText = "SoundFont has been loaded!";
    
    // add an event listener for the file inout
    document.getElementById("midi_input").addEventListener("change", async event =>
    {
        // check if any files are added
        if (!event.target.files[0])
        {
            return;
        }
        const midiFile = await (event.target.files[0].arrayBuffer());                        // get the file and convert to ArrayBuffer
        const context = new AudioContext();                                     // create an audioContext
        await context.audioWorklet.addModule(new URL(
            "../src/spessasynth_lib/" + WORKLET_URL_ABSOLUTE,
            import.meta.url
        )); // add the worklet
        const synth = new Synthetizer(context.destination, soundFontArrayBuffer); // create the synthetizer
        const seq = new Sequencer([{ binary: midiFile }], synth);       // create the sequencer
        seq.play();
    });
});