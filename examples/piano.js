// import the modules
import { Synthetizer } from "../src/spessasynth_lib/synthetizer/worklet_wrapper/synthetizer.js";
import { WORKLET_URL_ABSOLUTE } from "../src/spessasynth_lib/synthetizer/worklet_wrapper/worklet_url.js";

document.getElementById("soundfont_input").onchange = async e =>
{
    // check if there's a file uploaded
    if (!e.target.files[0])
    {
        return;
    }
    const file = e.target.files[0];
    const soundFontBuffer = await file.arrayBuffer(); // convert to array buffer,
    // create the context and add audio worklet
    const context = new AudioContext();
    await context.audioWorklet.addModule(new URL("../src/spessasynth_lib/" + WORKLET_URL_ABSOLUTE, import.meta.url));
    const synth = new Synthetizer(context.destination, soundFontBuffer);     // create the synthesizer
    await synth.isReady;
    // create a 36-key piano
    const piano = document.getElementById("piano");
    for (let i = 0; i < 36; i++)
    {
        /**
         * @type {HTMLElement}
         */
        const key = document.createElement("td");
        key.style.background = "white";
        key.style.height = "10em";
        key.style.width = "2em";
        key.style.margin = "0.2em";
        piano.appendChild(key);
        // add mouse events
        key.onpointerdown = () =>
        {
            // key press: play a note
            synth.noteOn(0, 46 + i, 127);
            key.style.background = "red";
        };
        key.onpointerup = () =>
        {
            // key release: stop a note
            synth.noteOff(0, 46 + i);
            key.style.background = "white";
        };
        key.onpointerleave = key.onpointerup;
    }
};