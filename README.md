# SpessaSynth
SoundFont2 based realtime synthetizer and MIDI visualizer written in JavaScript. Can also be used as a library.
![image](https://github.com/spessasus/SpessaSynth/assets/95608008/c4e66fb7-87be-4bd3-b0a4-faa27ec5b852)

# [Demo](https://spessasus.github.io/SpessaSynth/)

## Features
- SoundFont2 Generator Support
- MIDI Controller Support
- Visualization of the played file
- Playable keyboard with preset selection
- Integrated controller for the synthetizer
- Uses `Web MIDI API` for connecting to actual physical MIDI devices (such as keyboards)
- Modular
- Can be used as a library ([learn more here](../../wiki/Home#simple-demo))
- Written in pure JavaScript using WebAudio API (Express.js is only used for the file server)

## Limitations
- The program currently supports a limited amount of generators and no modulators. This program is still in it's early development, so it might not sound as good as other synthetizers (e.g. FluidSynth)

## Installation
***Chrome is highly recommended!***

### [Recommended SoundFont](https://musical-artifacts.com/artifacts/1176)

**Requires Node.js**
1. Download the code as zip and extract or use `git clone https://github.com/spessasus/SpessaSynth`
2. Put your soundfonts into the `soundfonts` folder. (you can select soundfonts in the program)
3. Double click the `start.bat`
4. Enjoy!

Note: you need to create the `soundfonts` folder yourself. The folder should be located in the same folder where the `src` is.

## Some notes about the implementation
### [Check out the wiki!](../../wiki/Home)
*Note: some links might not work as the wiki is under construction.*

The program is divided into parts:
- [Soundfont2 parser](../../wiki/SoundFont2-Class) - parses the soundfont file into an object readable by synth
- [MIDI file parser](../../wiki/MIDI-Class) - parses the midi file into an object readable by sequencer
- [Sequencer](../../wiki/Sequencer-Class) - plays back the parsed MIDI file. Must be connected to a synthetizer. Can be connected to a renderer
- [Renderer](../../wiki/Renderer-Class) - renders the waveforms of the channels and the falling notes. Must be connected to a synthetizer
- [Synthetizer](../../wiki/Synthetizer-Class) - generates the sound using the given preset
- UI classes - used for user interface, connect to their respective parts (eg. synth, sequencer, keyboard etc)
