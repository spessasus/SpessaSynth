<p align='center'>
<img src="src/website/spessasynth_logo_rounded.png" width='300' alt='SpessaSynth logo'>
</p>

**SpessaSynth is SoundFont2 based realtime synthetizer and MIDI player written in JavaScript using Web Audio API. 
A powerful library that allows you to read, write or play MIDI files and read/write SF2/SF3 files.**

![SpessaSynth Promotional Image](https://github.com/spessasus/SpessaSynth/assets/95608008/e2e6c4c6-0762-4c11-8887-a2318d431854)

<h3 align='center'>Exporting Soundfonts and RMIDIs now available! With compression too!</h3>
<p align='center'>
   <img src="https://github.com/user-attachments/assets/0aba6293-0458-401f-91fc-71f7a4a7640c" width="50%"></img>
</p>

<h1 align="center"><a href="https://spessasus.github.io/SpessaSynth/">Live demo (no download needed!)</a></h1>

<h2 align="center">Youtube video</h2>
<p align="center">
<a href="https://youtu.be/6rUjjVcMXu8"><img width='500' alt="Watch the YouTube video" src="https://github.com/spessasus/SpessaSynth/assets/95608008/0fade923-1ed6-4565-8300-1f57ef70bc89"></a>
</p>


This repository contains both the library and a complete musical web application. See below
<h1 align='center'>spessasynth_lib</h1>
<p align='center'>A flexible, powerful, and feature-packed soundfont synthesizer library for the WebAudio API.
Comes with the ability to edit MIDIs and soundfonts!</p>

<h3 align='center'><a href="../../wiki/Home">Documentation can be found here</a></h3>

<h2 align='center'>Features</h2>

#### Easy integration
- Modular design allows easy integration into other projects
- [Detailed documentation](../../wiki/Home) with examples
- Easy to use. Basic setup is just [two lines of code!](../../wiki/Usage-As-Library#minimal-setup)
- Batteries included. No dependencies!
#### Powerful SoundFont Synthesizer
- SoundFont2 Generator Support
- SoundFont2 Modulator Support
- SoundFont3 (compressed sf2) Support
- Reverb and chorus support ([customizable!](../../wiki/Synthetizer-Class#effects-configuration-object))
- Render audio file using [OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext)
- A few custom modulators to support some additional controllers (see `modulators.js`)
- Written using AudioWorklets (Firefox and Chrome both work perfectly)
- Can load really large soundfonts (4GB!) (but only on Firefox, Chromium has a memory limit)
- [Multi Port MIDIs support](../../wiki/About-Multi-Port) (more than 16 channels!)
- MIDI Controller Support (Default supported controllers can be found [here](../../wiki/MIDI-Implementation#supported-controllers))
- [RPN and NRPN support](../../wiki/MIDI-Implementation#supported-registered-parameters)
- Supports some [Roland GS and Yamaha XG system exclusives](../../wiki/MIDI-Implementation#supported-system-exclusives)
- High performance mode for playing black MIDIs (Don't go too crazy with the amount of notes though)
- Written in pure JavaScript using WebAudio API (Every modern browser supports it)
- Built-in MIDI sequencer optimized for performance
#### Read and write SoundFont and MIDI files
- Read and write .mid files
- Read and write [.rmi files with embedded SF2 soundfonts](../../wiki/About-RMIDI)
- Read and write .sf2 files (or compress them to sf3!)
- Read and write .sf3 files

## Limitations
- The performance of the synthesizer is questionable, especially on mobile devices.

### Installation
1. Clone this repository.
2. copy `src/spessasynth_lib` to your project.
3. [Use the library](../../wiki/Home)


> [!TIP]
> Looking for a Node.js version? try [spessasynth_core](https://www.npmjs.com/package/spessasynth_core)!

<h1 align='center'>Web app / Local Edition</h1>
<p align='center'>The complete GUI for spessasynth_lib, allowing remixing experimenting and playing MIDIs in the coolest way possible.</p>
<h3 align='center'><a href='../../wiki/How-To-Use-App'>Usage Guide</a></h3>

<h2 align='center'>Features</h2>

- Visualization of the played sequence with effects like visual pitch bend and note on effects
- Playable keyboard with various sizes
- Integrated controller for the synthetizer with a lot of options
- Support for lyrics embedded in the file, allowing for karaoke
- Music player mode if you don't like the visualizations
- Mobile friendly ~the ui, not the synthesizer~
- Mutliple languages support, currently: english, polish, japanese
- `Web MIDI API` support (Enables actual MIDI devices to be used with the program)
- [WebMidiLink](https://www.g200kg.com/en/docs/webmidilink/) support
- Play around with the MIDI file, edit instruments controllers and more!
- Render the MIDI file (either modified or unmodified) to .wav
- Export the modified MIDI file to .mid
- Export the trimmed soundfont to .sf2 or compressed .sf3
- Or bundle both as .rmi!
- Comes bundled with a compressed [SGM](https://web.archive.org/web/20130616094125/http://www.geocities.jp/shansoundfont/) SoundFont to get you started
- Also no dependencies!

<h3 align='center'>Still not convinced? Here are some more screenshots:</h3>
<img src="https://github.com/user-attachments/assets/b0c9a1f3-3278-4208-8d35-f63b0943ae39" width="45%"></img> 
<img src="https://github.com/user-attachments/assets/3bfd9de0-ed13-4667-b843-47c956454136" width="45%"></img>
<img src="https://github.com/user-attachments/assets/7499503e-9dec-4f7c-8c58-b4960f63bc39" width="45%"></img>
<img src="https://github.com/user-attachments/assets/688b4ecc-0ba5-4990-92a5-8b567e08d7d6" width="45%"></img> 




### Installation

> [!IMPORTANT]
> Firefox is recommended, due to unconstrained memory size.
> Also a decent computer for large soundfonts.

[Recommended high quality soundfont (better than the built-in one)](https://musical-artifacts.com/artifacts/1176)

**Requires node.js to be installed**
#### Windows
1. Download the code as zip and extract or use `git clone https://github.com/spessasus/SpessaSynth`
2. Put your soundfonts into the `soundfonts` folder. (you can select soundfonts in the program)
3. Double click the `start.bat`
4. Enjoy!

#### Linux
1. ```shell
   git clone https://github.com/spessasus/SpessaSynth
   cd SpessaSynth
   npm start
   ```
2. Put your soundfonts into the `soundfonts` folder. (you can select soundfonts in the program)
3. Enjoy!

#### todo
- make the worklet system perform good
- port the worklet system to emscripten (maybe) (not really)
- improve the built-in chorus and reverb effects (feel free to suggest improvements!)
- fix release during attack


### Special thanks
 - [Fluidsynth](https://github.com/FluidSynth/fluidsynth) - the source code really helped me understand and implement a lot of functionality and fixes
 - [Polyphone](https://www.polyphone-soundfonts.com/) - a wonderful testing and editing tool for soundfonts and how they should sound
 - [Meltysynth](https://github.com/sinshu/meltysynth) - for the initial low-pass filter implementation
 - [RecordingBlogs](https://www.recordingblogs.com/) - for the detailed explanations on MIDI messages
 - [stbvorbis.js](https://github.com/hajimehoshi/stbvorbis.js) - for the vorbis decoder
 - [OggVorbisEncoder](https://github.com/higuma/ogg-vorbis-encoder-js) - for the MIT vorbis encoder
 - **And You!** - for checking out this project. I hope you like it :)

### Major releases
- [0.0.1](https://github.com/spessasus/SpessaSynth/commit/bc5c6516ae7edc94656b5df75d254a29280caa18) - the initial release
- [1.0.0](https://github.com/spessasus/SpessaSynth/commit/45c23d1c2906b2dec202c0533a9737bd1fa6b3c4) - removed the 2 sample limit(the biggest problem program faced so far)
- [2.0.0](https://github.com/spessasus/SpessaSynth/commit/350e4db90210375da27e393393df743be2137d59) - implemented the worklet system and added support for modulators
- [3.0.0](https://github.com/spessasus/SpessaSynth/commit/b7f9e382a2f62eef462755ac9ebfe603663e4106) - everything moved to audioWorkletGlobalScope which allows for offline audio rendering. (We are here)

### License
Copyright © 2024 Spessasus. Licensed under the MIT License.

> [!IMPORTANT]
> Please note that bundled [stbvorbis_sync.js](https://github.com/spessasus/stbvorbis_sync.js) licensed under the Apache-2.0 license.
