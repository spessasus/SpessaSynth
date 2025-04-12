## This is the synthesis engine folder.

The code here is responsible for a single midi channel, synthesizing the sound to it.

- `engine_methods` contains the methods for the `main_processor.js`
- `engine_components` contains the various digital signal processing functions such as the wavetable oscillator, low
  pass filter, etc.

For those interested, `render_voice.js` file contains the actual DSP synthesis code.

`minify_processor.js` uses esbuild to minify the processor code. Importing this instead of `worklet_processor.js` is
recommended.

## How it works in spessasynth_lib
Both `Synthetizer` and `Sequencer` are essentially "remote control"
for the actual sequencer and synthesizer in the audio worklet thread (here)
These core components are wrapped in the AudioWorkletProcessor, which is receiving both commands and data (MIDIs, sound banks)
through the message port, and sends data back (events, time changes, status changes, etc.).

For example,
the playback to WebMIDIAPI is actually the sequencer in the worklet thread
playing back the sequence and then postMessaging the commands through the synthesizer to the sequencer
which actually sends them to the specified output.

The wonders of separate audio thread...