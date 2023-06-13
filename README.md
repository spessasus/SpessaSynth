# SpessaSynth
SoundFont2 based realtime synthetizer and MIDI visualizer written in JavaScript
![image](https://github.com/spessasus/SpessaSynth/assets/95608008/1beb1691-0454-47ec-826a-a603eed7dd5e)

## Features
- Limited SoundFont2 Generator Support
- Limited MIDI Controller Support
- Visualization of the played file
- Playable keyboard with preset selection
- Written in pure JavaScript using WebAudio API (Express.js is only used for the file server)

## Limitations
- Max 2 Samples per note. It's probably my bad coding or it's too much for the browser. Either way, it may cause problems with some instruments, but the program tries to find the samples that matter the most.

## Installation
***Chrome is highly recommended!***

Recommended soundfont: https://musical-artifacts.com/artifacts/1176

**Requires Node.js**
1. Download the code as zip
2. Put your file named `soundfont.sf2` into the `soundfonts` folder. (SoundFont selection coming soon)
3. Double click the `start.bat`
4. Enjoy!

### Some notes about the implementation
The program is divided into parts:
- Soundfont2 parser - parses the soundfont file into an object readable by synth
- MIDI file parser - parses the midi file into an object readable by sequencer
- Sequencer - plays back the parsed MIDI file. Must be connected to a synthetizer. Can be connected to a renderer
- Renderer - renders the waveforms of the channels and the falling notes. Must be connected to a synthetizer
- (Synthetizer)[wiki/Synthetizer-Class] - generates the sound using the given preset
- UI classes - used for user interface, connect to their respective parts (eg. synth, sequencer, keyboard etc)
