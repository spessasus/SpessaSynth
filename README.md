# SpessaSynth
SoundFont2 based realtime synthetizer and MIDI player written in JavaScript using Web Audio API. Can also be used as a synthesis library.


![image](https://github.com/spessasus/SpessaSynth/assets/95608008/b092e92b-0f21-4b97-8449-75cb1b6a72cc)


[Youtube Video](https://youtu.be/_vPkI35Y5Po)

# [Live demo](https://spessasus.github.io/SpessaSynth/)

## Features
- SoundFont2 Generator Support (Specifcally [here](#currently-supported-generators))
- MIDI Controller Support (Currently supported controllers can be found [here](../../wiki/Synthetizer-Class#supported-controllers))
- Supports some Roland and Yamaha XG sysex messages
- High performance mode for playing black MIDIs (Don't go too crazy with the amount of notes though)
- Visualization of the played sequence
- Playable keyboard with preset selection
- Integrated controller for the synthetizer
- `Web MIDI API` support (Enables physical MIDI devices to be used with the program)
- [WebMidiLink](https://www.g200kg.com/en/docs/webmidilink/) support
- Can be used as a library ([learn more here](../../wiki/Usage-As-Library))
- Modular design allows easy integrations into other projects
- Written in pure JavaScript using WebAudio API (Every modern browser supports it)
- No dependencies (Node.js is only required for the app, the core synth and sequencer library needs no dependencies)
- Comes bundled with a small [GeneralUser GS](https://schristiancollins.com/generaluser.php) soundFont to get you started

### Limitations
- The program currently supports no modulators and no reverb nor chorus. 
- It might not sound as good as other synthetizers (e.g. FluidSynth or BASSMIDI)

## Installation
***Chromium based browser is highly recommended, unless you're loading a large (>4GB) SoundFont (then use Firefox, because chromium has a 4GB memory limit)***

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


## Currently supported generators
- Full volume envelope
- All address offsets
- Looping modes
- FilterFc and FilterQ
- Modulation envelope for the low-pass filter (attack is linear instead of convex)
- KeyNumTo ModEnv hold and decay, same for volEnv
- Overriding root key, keynum and velocity
- Vibrato LFO (freq, depth and delay) **Including the Mod wheel support!**
- Scale tuning, fine tune and coarse tune
- exclusive class (although sometimes broken)
- pan