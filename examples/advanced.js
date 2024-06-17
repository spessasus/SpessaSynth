// import the modules
import { MIDI } from '../src/spessasynth_lib/midi_parser/midi_loader.js'
import { Sequencer } from '../src/spessasynth_lib/sequencer/sequencer.js'
import { Synthetizer } from '../src/spessasynth_lib/synthetizer/synthetizer.js'

// load the soundfont
fetch("soundfont.sf2").then(async response => {
    // load the soundfont into an array buffer
    let soundFontBuffer = await response.arrayBuffer();
    document.getElementById("message").innerText = "SoundFont has been loaded!";


    // add an event listener for the file inout
    document.getElementById("midi_input").addEventListener("change", async event => {
        // check if any files are added
        if (!event.target.files[0]) {
            return;
        }
        // parse all the files
        const parsedSongs = [];
        for (let file of event.target.files) {
            const buffer = await file.arrayBuffer();
            parsedSongs.push(new MIDI(buffer));
        }
        // create the context and add audio worklet
        const context = new AudioContext();
        await context.audioWorklet.addModule("./spessasynth_lib/synthetizer/worklet_system/worklet_processor.js")
        const synth = new Synthetizer(context.destination, soundFontBuffer);          // create the synthetizer
        const seq = new Sequencer(parsedSongs, synth);                          // create the sequencer without parsed midis
        seq.play();                                                             // play the midi
        seq.loop = false;                                                       // the sequencer loops a single song by default

        // make the slider move with the song
        let slider = document.getElementById("progress");
        setInterval(() => {
            // slider ranges from 0 to 1000
            slider.value = (seq.currentTime / seq.duration) * 1000;
        }, 1000);

        // add time adjustment
        slider.onchange = () => {
            // calculate the time
            let targetTime = (slider.value / 1000) * seq.duration;
            seq.currentTime = targetTime; // switch the time (the sequencer adjusts automatically)
        }

        // add button controls
        document.getElementById("previous").onclick = () => {
            seq.previousSong(); // go back by one song
        }
        document.getElementById("pause").onclick = () => {
            if (seq.paused) {
                document.getElementById("pause").innerText = "Pause";
                seq.play(); // resume
            }
            else {
                document.getElementById("pause").innerText = "Resume";
                seq.pause(); // pause

            }
        }
        document.getElementById("next").onclick = () => {
            seq.nextSong(); // go to next song
        }
    });
});