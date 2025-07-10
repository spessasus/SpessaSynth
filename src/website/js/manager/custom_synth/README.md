# The custom synthesizer
The custom synth is implemented as follows:
- The core synthesis parsers and engine live in a Web Worker.
- The real-time audio data is rendered in the Web Worker and sent to a playback AudioWorklet with a MessageChannel.
- The exporting functions also live in the worker, only returning the result to the main thread.
- The main thread communicates only with the worker, frequently syncing with its synthesis engine internal time.
- The WAV export is split up into two distinct passes:
  1. Dry synthesis: the worker pauses its real-time playback and renders the raw audio with a new synthesizer instance.
  2. Effects: OfflineAudioContext uses `AudioBufferSource`s to play back the dry audio through the effect processors. This step is skipped with the 'separate channels' option.
