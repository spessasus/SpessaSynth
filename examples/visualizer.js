// import the modules
import { Sequencer } from "../src/spessasynth_lib/sequencer/worklet_wrapper/sequencer.js";
import { Synthetizer } from "../src/spessasynth_lib/synthetizer/worklet_wrapper/synthetizer.js";
import { WORKLET_URL_ABSOLUTE } from "../src/spessasynth_lib/synthetizer/worklet_wrapper/worklet_url.js";

// add different colors to channels!
const channelColors = [
    "rgba(255, 99, 71, 1)",   // tomato
    "rgba(255, 165, 0, 1)",   // orange
    "rgba(255, 215, 0, 1)",   // gold
    "rgba(50, 205, 50, 1)",   // limegreen
    "rgba(60, 179, 113, 1)",  // mediumseagreen
    "rgba(0, 128, 0, 1)",     // green
    "rgba(0, 191, 255, 1)",   // deepskyblue
    "rgba(65, 105, 225, 1)",  // royalblue
    "rgba(138, 43, 226, 1)",  // blueviolet
    "rgba(50, 120, 125, 1)",  // percussion color
    "rgba(255, 0, 255, 1)",   // magenta
    "rgba(255, 20, 147, 1)",  // deeppink
    "rgba(218, 112, 214, 1)", // orchid
    "rgba(240, 128, 128, 1)", // lightcoral
    "rgba(255, 192, 203, 1)", // pink
    "rgba(255, 255, 0, 1)"    // yellow
];

// adjust this to your liking
const VISUALIZER_GAIN = 2;

// load the soundfont
fetch("../soundfonts/GeneralUserGS.sf3").then(async response =>
{
    // load the soundfont into an array buffer
    let soundFontArrayBuffer = await response.arrayBuffer();
    document.getElementById("message").innerText = "SoundFont has been loaded!";
    
    // create the context and add audio worklet
    const context = new AudioContext();
    await context.audioWorklet.addModule(new URL("../src/spessasynth_lib/" + WORKLET_URL_ABSOLUTE, import.meta.url));
    const synth = new Synthetizer(context.destination, soundFontArrayBuffer);     // create the synthetizer
    let seq;
    
    // add an event listener for the file inout
    document.getElementById("midi_input").addEventListener("change", async event =>
    {
        // check if any files are added
        if (!event.target.files[0])
        {
            return;
        }
        await context.resume();
        const midiFile = await event.target.files[0].arrayBuffer(); // convert the file to array buffer
        if (seq === undefined)
        {
            seq = new Sequencer([{ binary: midiFile }], synth); // create the sequencer with the parsed midis
            seq.play();                                                  // play the midi
        }
        else
        {
            seq.loadNewSongList([{ binary: midiFile }]); // the sequencer is already created,
            // no need to create a new one.
        }
        
        const canvas = document.getElementById("canvas"); // get canvas
        const drawingContext = canvas.getContext("2d");
        /**
         * create the AnalyserNodes for the channels
         */
        const analysers = [];
        for (let i = 0; i < 16; i++)
        {
            analysers.push(context.createAnalyser()); // create analyzer
        }
        
        // connect them to the synthesizer
        synth.connectIndividualOutputs(analysers);
        
        // render analyzers in a 4x4 grid
        function render()
        {
            // clear the rectangle
            drawingContext.clearRect(0, 0, canvas.width, canvas.height);
            analysers.forEach((analyser, channelIndex) =>
            {
                // calculate positions
                const width = canvas.width / 4;
                const height = canvas.height / 4;
                const step = width / analyser.frequencyBinCount;
                const x = width * (channelIndex % 4); // channelIndex % 4 gives us 0 to 2 range
                const y = height * Math.floor(channelIndex / 4) + height / 2;
                
                // get the data from analyzer
                const waveData = new Float32Array(analyser.frequencyBinCount);
                analyser.getFloatTimeDomainData(waveData);
                // set the color
                drawingContext.strokeStyle = channelColors[channelIndex % channelColors.length];
                // draw the waveform
                drawingContext.moveTo(x, y);
                drawingContext.beginPath();
                for (let i = 0; i < waveData.length; i++)
                {
                    drawingContext.lineTo(x + step * i, y + waveData[i] * height * VISUALIZER_GAIN);
                }
                drawingContext.stroke();
            });
            
            // draw again
            requestAnimationFrame(render);
        }
        
        render();
        
        // create a keyboard
        const keyboard = document.getElementById("keyboard");
        // create an array of 128 keys
        const keys = [];
        for (let i = 0; i < 128; i++)
        {
            const key = document.createElement("td");
            key.style.width = "5px";
            key.style.height = "50px";
            key.style.border = "solid black 1px";
            keyboard.appendChild(key);
            keys.push(key);
        }
        
        // add listeners to show keys being pressed
        
        // add note on listener
        synth.eventHandler.addEvent("noteon", "demo-keyboard-note-on", event =>
        {
            keys[event.midiNote].style.background = channelColors[event.channel % channelColors.length];
        });
        
        // add note off listener
        synth.eventHandler.addEvent("noteoff", "demo-keyboard-note-off", event =>
        {
            keys[event.midiNote].style.background = "";
        });
        
        // add stop-all listener
        synth.eventHandler.addEvent("stopall", "demo-keyboard-stop-all", () =>
        {
            keys.forEach(key => key.style.background = "");
        });
    });
});