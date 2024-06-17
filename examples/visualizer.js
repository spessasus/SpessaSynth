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
        const parsedMidi = new MIDI(arrayBuffer);                                               // parse the MIDI file
        const context = new AudioContext();                                              // create an audioContext
        // add the worklet
        await context.audioWorklet.addModule("./spessasynth_lib/synthetizer/worklet_system/worklet_processor.js");

        // prepare and play
        const synth = new Synthetizer(context.destination, soundFontArrayBuffer);            // create the synthetizer
        const seq = new Sequencer([parsedMidi], synth);                            // create the sequencer (it can accept multiple files so we need to pass an array)
        seq.play();                                                                                     // play the midi

        const canvas = document.getElementById("canvas");                       // get canvas
        const drawingContext = canvas.getContext("2d");
        /**
         * create the AnalyserNodes for the channels
         */
        const analysers = [];
        for (let i = 0; i < 16; i++) {
            analysers.push(context.createAnalyser()); // create analyser
        }

        // connect them to the synthesizer
        synth.connectIndividualOutputs(analysers);

        // render analysers in a 4x4 grid
        function render()
        {
            // clear the rectangle
            drawingContext.clearRect(0, 0, canvas.width, canvas.height);
            analysers.forEach((analyser, channelIndex) => {
                // calculate positions
                const width = canvas.width / 4;
                const height = canvas.height / 4;
                const step = width / analyser.frequencyBinCount;
                const x = width * (channelIndex % 4); // channelIndex % 4 gives us 0 to 2 range
                const y = height * Math.floor(channelIndex / 4) + height / 2;

                // draw the waveform
                const waveData = new Float32Array(analyser.frequencyBinCount);
                // get the data from analyser
                analyser.getFloatTimeDomainData(waveData);
                drawingContext.beginPath();
                drawingContext.moveTo(x, y);
                for (let i = 0; i < waveData.length; i++)
                {
                    drawingContext.lineTo(x + step * i, y + waveData[i] * height);
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
        synth.eventHandler.addEvent("noteon", "demo-keyboard-note-on", event => {
            keys[event.midiNote].style.background = "green"
        });

        // add note off listener
        synth.eventHandler.addEvent("noteoff", "demo-keyboard-note-off", event => {
            keys[event.midiNote].style.background = "white";
        })
    })
});