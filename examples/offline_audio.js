// import the modules
import { MIDI } from '../src/spessasynth_lib/midi_parser/midi_loader.js'
import { Synthetizer } from '../src/spessasynth_lib/synthetizer/synthetizer.js'
import { audioBufferToWav } from '../src/spessasynth_lib/utils/buffer_to_wav.js'

// load the soundfont
fetch("../soundfonts/SGM.sf3").then(async response => {
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
        const arrayBuffer = await file.arrayBuffer(); // convert the file to array buffer
        const parsedMidi = new MIDI(arrayBuffer, file.name); // parse the MIDI file
        const sampleRate = 44100; // 44100Hz
        const context = new OfflineAudioContext({
                numberOfChannels: 2, // stereo
                sampleRate: sampleRate,
                length: sampleRate * (parsedMidi.duration + 1), // sample rate times duration plus one second (for the sound to fade away rather than cut)
        });
        // add the worklet
        await context.audioWorklet.addModule("../src/spessasynth_lib/synthetizer/worklet_system/worklet_processor.js");
        // here we set the event system to disabled as it's not needed. Also, we need to pass the parsed MIDI here for the synthesizer to start rendering it
        const synth = new Synthetizer(context.destination, soundFontArrayBuffer, false, {
            parsedMIDI: parsedMidi,
            snapshot: undefined // this is used to copy the data of another synthesizer, so no need to use it here
        });

        // start rendering the audio
        document.getElementById("message").innerText = "Started rendering... please wait.";
        const outputBuffer = await context.startRendering();

        // convert the buffer to wav file
        const wavFile = audioBufferToWav(outputBuffer);

        // make the browser download the file
        const a = document.createElement("a");
        a.href = URL.createObjectURL(wavFile);
        a.download = parsedMidi.midiName + ".wav";
        a.click();
    })
});