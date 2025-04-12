## This is the main synthesizer folder.

The code here is responsible for making the actual sound.
This is the heart of the SpessaSynth library.

- `audio_engine` - the core synthesis engine, it theoretically can run on non-browser environments.
- `audio_effects` - the WebAudioAPI audio effects.
- `worklet_wrapper` - the wrapper for the core synthesis engine using audio worklets.

`worklet_processor.min.js` - the minified worklet processor code to import.