# SpessaSynth
SoundFont2 based realtime synthetizer and MIDI player written in JavaScript using Web Audio API. Can also be used as a synthesis library.

![SpessaSynth Promotional Image](https://github.com/spessasus/SpessaSynth/assets/95608008/307b6b55-da16-49e8-b0e8-a07e7b699a8c)


### Light Mode now available!
![SpessaSynth in Light mode](https://github.com/spessasus/SpessaSynth/assets/95608008/f592a15e-d9b0-47d6-9486-191951ba35c3)



[Youtube Video](https://youtu.be/_vPkI35Y5Po)

# [Live demo](https://spessasus.github.io/SpessaSynth/)

## Features
- SoundFont2 Generator Support
- SoundFont2 Modulator Support
- Reverb and chorus support
- A few custom modulators to support some additional controllers (see `modulators.js`)
- Written using AudioWorklets (Firefox and Chrome both work perfectly)
- Legacy system that doesn't use AudioWorklets (Available to use over HTTP and will switch automatically)
- Can load really large soundfonts (4GB!) (but only on Firefox, Chromium has a memory limit)
- Multi-port MIDIs support (more than 16 channels)
- MIDI Controller Support (Default supported controllers can be found [here](../../wiki/Synthetizer-Class#supported-controllers))
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
- It might not sound as good as other synthetizers (e.g. FluidSynth or BASSMIDI)
- The modulation envelope needs some work
- the modulators need some work

## Installation
***When you're loading a large (>4GB) SoundFont, use Firefox because chromium has a 4GB memory limit***

### [Recommended and tested SoundFont](https://musical-artifacts.com/artifacts/1176)

**Requires Node.js**
### Windows
1. Download the code as zip and extract or use `git clone https://github.com/spessasus/SpessaSynth`
2. Put your soundfonts into the `soundfonts` folder. (you can select soundfonts in the program)
3. Double click the `start.bat`
4. Enjoy!

### Linux
1. ```shell
   git clone https://github.com/spessasus/SpessaSynth
   cd SpessaSynth
   npm install && node server.js 
   ```
2. Put your soundfonts into the `soundfonts` folder. (you can select soundfonts in the program)
3. Enjoy!
   
(note that in KDE Plasma 6 the browser auto opening seems to be broken. You must navigate to http://localhost:8181 manually)

### [Check out the wiki!](../../wiki/Home)
*Note: the wiki is quite outdated, but most of the methods should still work.*

The program is divided into parts:
- [Soundfont2 parser](../../wiki/SoundFont2-Class) - parses the soundfont file into an object readable by synth
- [MIDI file parser](../../wiki/MIDI-Class) - parses the midi file into an object readable by sequencer
- [Sequencer](../../wiki/Sequencer-Class) - plays back the parsed MIDI file. Must be connected to a synthetizer. Can be connected to a renderer
- [Renderer](../../wiki/Renderer-Class) - renders the waveforms of the channels and the falling notes. Must be connected to a synthetizer
- [Synthetizer](../../wiki/Synthetizer-Class) - generates the sound using the given preset
- UI classes - used for user interface, connect to their respective parts (eg. synth, sequencer, keyboard etc)

[How to use SpessaSynth in your project](../../wiki/Usage-As-Library)

[Can't use AudioWorklets because your site doesn't support HTTPS? No problem!](/src/spessasynth_lib/synthetizer/native_system/README.md)

#### todo
- make the worklet system perform good
- port the worklet system to emscripten (maybe)
- fix modenv
- fix rare clicking in volenv
- fix attenuation modulators
### License
Copyright © 2024 Spessasus. Licensed under the MIT License.
