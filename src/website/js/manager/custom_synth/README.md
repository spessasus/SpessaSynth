# The custom synthesizer
The custom synth is implemented as follows:
- The core synthesis parsers and engine live in a Web Worker.
- The real-time audio data is rendered in the Web Worker and sent to a playback AudioWorklet with a MessageChannel.
- The exporting functions also live in the worker, only returning the result to the main thread.
- The main thread communicates only with the worker, frequently syncing with its synthesis engine internal time.