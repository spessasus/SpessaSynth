# SpessaSynth
### SoundFont2 based realtime synthetizer and MIDI player written in JavaScript using Web Audio API. Can also be used as a synthesis library.

[![image](https://github.com/spessasus/SpessaSynth/assets/95608008/a43ae4bd-54e7-466e-8aa1-946a8b6f61f7)](https://www.youtube.com/watch?v=_vPkI35Y5Po)

[Youtube Video](https://youtu.be/_vPkI35Y5Po)

# [Live demo](https://spessasus.github.io/SpessaSynth/)

## Features
- SoundFont2 Generator Support
- MIDI Controller Support
- Support for multiple drums via Roland GS or Yamaha XG
- High performance mode for playing black MIDIs (Don't go too crazy with the amount of notes though)
- Visualization of the played sequence
- Playable keyboard with preset selection
- Integrated controller for the synthetizer
- Uses `Web MIDI API` for connecting to actual physical MIDI devices (such as keyboards or external synhesizers)
- Can be used as a library ([learn more here](../../wiki/Home#simple-demo))
- Modular design allows easy integrations into other projects
- Written in pure JavaScript using WebAudio API (Every modern browser supports it)
- No dependencies (Node.js is only required for the app, the core library needs no dependencies)
- Comes bundled with a small [GeneralUser GS](https://schristiancollins.com/generaluser.php) soundFont to get you started

## Limitations
- The program currently supports a limited amount of generators and no modulators. 
This program is still in it's early development, so it might not sound as good as other synthetizers (e.g. FluidSynth or BASSMIDI)

## Installation
***Chrome is highly recommended, unless you're loading a large (>4GB) SoundFont***

### [Recommended and tested SoundFont](https://musical-artifacts.com/artifacts/1176)

**Requires Node.js**
1. Download the code as zip and extract or use `git clone https://github.com/spessasus/SpessaSynth`
2. Put your soundfonts into the `soundfonts` folder. (you can select soundfonts in the program)
3. Double click the `start.bat` (for linux, type `call npm install` into terminal when in the project's folder)
4. Enjoy!

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
