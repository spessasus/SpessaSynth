# SpessaSynth
SoundFont2 based MIDI synthetizer and visualizer written in JavaScript

![SpessaSynth in action](https://github.com/spessasus/SpessaSynth/assets/95608008/afb82655-f627-4549-be7b-742067692c8d)


## Features
- Limited SoundFont2 Generator Support
- Limited MIDI Controller Support
- Visualization of the played file
- Playable keyboard with preset selection
- Written in pure JavaScript using WebAudio API

## Limitations
- It won't play Black MIDIs. (Sorry, Rush E)
- Max 2 Samples per note. It's probably my bad coding or it's too much for the browser. Either way, it may cause problems with some instruments, but the program tries to find the samples that matter the most.

## Installation
**Requires a server (for now)**
1. Put your files on the server
2. Change the path to your .sf2 files in `midi.js` (line 26)
3. Get some soundfonts.
4. Navigate to `index.html`
5. Enjoy.
