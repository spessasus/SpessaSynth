<p align='center'>
<img src="src/website/spessasynth_logo_rounded.png" width='300' alt='SpessaSynth logo'>
</p>

SoundFont2 based realtime synthetizer and MIDI player written in JavaScript using Web Audio API. Can also be used as a synthesis library.

![SpessaSynth Promotional Image](https://github.com/spessasus/SpessaSynth/assets/95608008/307b6b55-da16-49e8-b0e8-a07e7b699a8c)

# [Live demo](https://spessasus.github.io/SpessaSynth/)

## Youtube video
[![Watch the video](https://img.youtube.com/vi/6rUjjVcMXu8/maxresdefault.jpg)](https://youtu.be/6rUjjVcMXu8)

## Features
- SoundFont2 Generator Support
- SoundFont2 Modulator Support
- SoundFont3 (vorbis compressed sf2) Support (thanks to [stbvorbis.js](https://github.com/hajimehoshi/stbvorbis.js))
- Reverb and chorus support
- A few custom modulators to support some additional controllers (see `modulators.js`)
- Written using AudioWorklets (Firefox and Chrome both work perfectly)
- Legacy system that doesn't use AudioWorklets (Available to use over HTTP and will switch automatically)
- Can load really large soundfonts (4GB!) (but only on Firefox, Chromium has a memory limit)
- Multi-port MIDIs support (more than 16 channels)
- MIDI Controller Support (Default supported controllers can be found [here](../../wiki/Synthetizer-Class#supported-controllers)).
- Supports some Roland GS and Yamaha XG sysex messages
- High performance mode for playing black MIDIs (Don't go too crazy with the amount of notes though)
- Visualization of the played sequence with effects like visual pitch bend and note on effects
- Playable keyboard with various sizes
- Integrated controller for the synthetizer
- Can provide very hiqh quality audio while being relatively light on file size thanks to sf3 support
- `Web MIDI API` support (Enables physical MIDI devices to be used with the program)
- [WebMidiLink](https://www.g200kg.com/en/docs/webmidilink/) support
- Can be used as a library ([learn more here](../../wiki/Usage-As-Library))
- Modular design allows easy integrations into other projects
- Written in pure JavaScript using WebAudio API (Every modern browser supports it)
- No dependencies (Node.js is only required for the local app, the frontend and audio are vanilla JavaScript)
- Comes bundled with a compressed [SGM](https://musical-artifacts.com/artifacts/855) SoundFont to get you started

### Limitations
- It might not sound as good as other synthetizers (e.g. FluidSynth or BASSMIDI)
- The performance is questionable, especially on mobile devices
- SoundFont3 support seems to be a bit wonky, so if you notice a bug, **please open an issue!**
- only real-time, cannot render audio to file (yet)

## [How to use the web app](../../wiki/How-To-Use-App)

[Check out the wiki!](../../wiki/Home)

> Note: the wiki is rarely updated, but it should still work.

### [How to use SpessaSynth in your project](../../wiki/Usage-As-Library)

[Can't use AudioWorklets because your site doesn't support HTTPS? No problem!](/src/spessasynth_lib/synthetizer/native_system/README.md)

## Installation of the Local Edition
> When you're loading a large (>4GB) SoundFont, use Firefox because chromium has a 4GB memory limit

### [Recommended high quality soundfont (better than the built-in one)](https://musical-artifacts.com/artifacts/1176)

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


#### todo
- make the worklet system perform good
- port the worklet system to emscripten (maybe)
- fix rare clicking in volenv attack (TR-909 kick for example)


### Special thanks
 - [Fluidsynth](https://github.com/FluidSynth/fluidsynth) - the source code really helped me understand and implement a lot of functionality and fixes
 - [Polyphone](https://www.polyphone-soundfonts.com/) - a wonderful testing tool for soundfonts and how they should sound
 - [Meltysynth](https://github.com/sinshu/meltysynth) - for the low-pass filter implementation
 - **You!** - for checking out this project. I hope you like it :)

### License
Copyright © 2024 Spessasus. Licensed under the MIT License.

> Please note that bundled [stbvorbis.js](https://github.com/hajimehoshi/stbvorbis.js) is licensed under the Apache-2.0 license.
