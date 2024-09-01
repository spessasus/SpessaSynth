// import the modules
import { WORKLET_URL_ABSOLUTE } from '../src/spessasynth_lib/synthetizer/worklet_url.js'
import { Synthetizer } from '../src/spessasynth_lib/synthetizer/synthetizer.js'
import { audioBufferToWav } from '../src/spessasynth_lib/utils/buffer_to_wav.js'
import { MIDI } from '../src/spessasynth_lib/midi_parser/midi_loader.js'

// load the soundfont
fetch("../soundfonts/GeneralUserGS.sf3").then(async response => {
    // load the soundfont into an array buffer
    let soundFontArrayBuffer = await response.arrayBuffer();
    document.getElementById("message").innerText = "SoundFont has been loaded!";

    // add an event listener for the file inout
    document.getElementById("midi_input").addEventListener("change", async event => {
        // check if any files are added
        if (!event.target.files[0]) {
            return;
        }
        // hide the input
        document.getElementById("midi_input").style.display = "none";
        const file = event.target.files[0];
        const arrayBuffer = await file.arrayBuffer();
        const parsedMidi = new MIDI(arrayBuffer, file.name);

        // create the rendering context
        const sampleRate = 44100; // 44100Hz
        const context = new OfflineAudioContext({
                numberOfChannels: 2, // stereo
                sampleRate: sampleRate,
                length: sampleRate * (parsedMidi.duration + 1), // sample rate times duration plus one second (for the sound to fade away rather than cut)
        });
        // add the worklet
        await context.audioWorklet.addModule(new URL("../src/spessasynth_lib/" + WORKLET_URL_ABSOLUTE, import.meta.url));

        // here we set the event system to disabled as it's not needed. Also, we need to pass the parsed MIDI here for the synthesizer to start rendering it
        const synth = new Synthetizer(context.destination, soundFontArrayBuffer, false, {
            parsedMIDI: parsedMidi,
            snapshot: undefined // this is used to copy the data of another synthesizer, so no need to use it here
        });

        // show progress
        const showRendering = setInterval(() => {
            const progress = Math.floor(synth.currentTime / parsedMidi.duration * 100);
            document.getElementById("message").innerText = `Rendering "${parsedMidi.midiName}"... ${progress}%`;
        }, 500);

        // start rendering the audio
        const outputBuffer = await context.startRendering();
        clearInterval(showRendering);

        // convert the buffer to wav file
        const wavFile = audioBufferToWav(outputBuffer);

        // make the browser download the file
        const a = document.createElement("a");
        a.href = URL.createObjectURL(wavFile);
        a.download = parsedMidi.midiName + ".wav";
        a.click();
    })
});