<p align='center'>
<img src="src/website/spessasynth_logo_rounded.png" width='300' alt='SpessaSynth logo'>
</p>

**SpessaSynth** is a SoundFont2-based real-time synthesizer and MIDI player written in JavaScript using the Web Audio API. It’s a powerful library that allows you to read, write, or play MIDI files and read/write SF2/SF3 files.

![SpessaSynth Promotional Image](https://github.com/spessasus/SpessaSynth/assets/95608008/e2e6c4c6-0762-4c11-8887-a2318d431854)

<h3 align='center'>Exporting SoundFonts and RMIDIs now available! With compression too!</h3>
<p align='center'>
   <img src="https://github.com/user-attachments/assets/0aba6293-0458-401f-91fc-71f7a4a7640c" width="50%" alt="Exporting SoundFonts and RMIDIs"></img>
</p>

<h1 align="center"><a href="https://spessasus.github.io/SpessaSynth/">Live Demo (no download needed!)</a></h1>

<h2 align="center">YouTube Video</h2>
<p align="center">
<a href="https://youtu.be/6rUjjVcMXu8"><img width='500' alt="Watch the YouTube video" src="https://github.com/spessasus/SpessaSynth/assets/95608008/0fade923-1ed6-4565-8300-1f57ef70bc89"></a>
</p>

This repository contains both the library and a complete musical web application. See below:

<h1 align='center'>spessasynth_lib</h1>
<p align='center'>A flexible, powerful, and feature-packed SoundFont synthesizer library for the WebAudio API. Comes with the ability to edit MIDIs and SoundFonts!</p>

<h3 align='center'><a href="../../wiki/Home">Documentation</a></h3>

<h2 align='center'>Features</h2>

#### Easy Integration
- Modular design allows easy integration into other projects
- [Detailed documentation](../../wiki/Home) with examples
- Easy to use. Basic setup is just [two lines of code!](../../wiki/Usage-As-Library#minimal-setup)
- Batteries included. No dependencies!

#### Powerful SoundFont Synthesizer
- Suitable for both real-time and offline synthesis
- SoundFont2 Generator support
- **SoundFont2 Modulator Support** - a feature which many sf2 synths lack!
- SoundFont3 (compressed sf2) Support
- Reverb and chorus support ([customizable!](../../wiki/Synthetizer-Class#effects-configuration-object))
- Render audio files using [OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext)
- Custom modulators for additional controllers ([See this](../../wiki/Modulator-Class#default-modulators)
- Written using AudioWorklets (works perfectly in Firefox and Chrome and runs in a separate thread for maximum performance)
- Can load very large SoundFonts (up to 4GB!) (Note: Only Firefox handles this well; Chromium has a memory limit)
- Unlimited channel count (CPU is the limit ;-)
- MIDI Controller Support (Default supported controllers [here](../../wiki/MIDI-Implementation#supported-controllers))
- [RPN and NRPN support](../../wiki/MIDI-Implementation#supported-registered-parameters)
- Supports some [Roland GS and Yamaha XG system exclusives](../../wiki/MIDI-Implementation#supported-system-exclusives)
- High performance mode for playing complex MIDIs (Avoid excessive notes)
- Written in pure JavaScript using the WebAudio API (Supported by all modern browsers)

#### Built-in Powerful and Fast Sequencer
- Supports MIDI formats 0, 1, and 2
- [Multi-Port MIDI support](../../wiki/About-Multi-Port) (More than 16 channels!)
- Smart preloading: Preloads only the samples used in the MIDI file for smooth playback (down to the key and velocity!)
- Lyrics support: Add karaoke to your program!
- Raw lyrics available: Decode in any encoding (Kanji? No problem!)

#### Read and Write SoundFont and MIDI Files
- Read and write .mid files
    - Smart name detection: Ignores first track name if not a conductor track
    - Port detection during load time
    - Used channels on track: Detects channels used on each track
- Read and write [.rmi files with embedded SF2 soundfonts](../../wiki/About-RMIDI)
- Read and write .sf2 files (or compress them to .sf3!)
- Read and write .sf3 files

## Limitations
- Performance may be suboptimal, especially on mobile devices.

### Installation
1. Clone this repository.
2. Copy `src/spessasynth_lib` to your project.
3. [Use the library](../../wiki/Home)

> [!TIP]
> Looking for a Node.js version? Try [spessasynth_core](https://www.npmjs.com/package/spessasynth_core)!

<h1 align='center'>Web App / Local Edition</h1>
<p align='center'>The complete GUI for spessasynth_lib, allowing remixing, experimenting, and playing MIDIs in the coolest way possible.</p>
<h3 align='center'><a href='../../wiki/How-To-Use-App'>Usage Guide</a></h3>

<h2 align='center'>Features</h2>

- Visualization of the played sequence with effects like visual pitch bend and note-on effects
- Playable keyboard with various sizes (mobile friendly!)
- Integrated controller for the synthesizer with numerous options
- Support for lyrics embedded in the file (karaoke feature)
- Music player mode if you prefer not to use visualizations
- Mobile-friendly UI (_synthesizer performance not optimized for mobile... don't tell anyone!_)
- Multiple language support: English, Polish, Japanese
- `Web MIDI API` support (Enables use of actual MIDI devices)
- [WebMidiLink](https://www.g200kg.com/en/docs/webmidilink/) support
- Edit instruments, controllers, and more!
- Render the MIDI file (modified or unmodified) to .wav
- Render each channel as a separate .wav file
- Export the modified MIDI file to .mid
- Export the trimmed SoundFont to .sf2 or compressed .sf3
- Bundle both as .rmi!
- Comes bundled with a compressed [SGM](https://web.archive.org/web/20130616094125/http://www.geocities.jp/shansoundfont/) SoundFont to get you started
- No additional dependencies!

<h3 align='center'>Still not convinced? Check out these screenshots:</h3>
<p align='center'>
<img src="https://github.com/user-attachments/assets/b0c9a1f3-3278-4208-8d35-f63b0943ae39" width="45%" alt="Screenshot 1"></img> 
<img src="https://github.com/user-attachments/assets/3bfd9de0-ed13-4667-b843-47c956454136" width="45%" alt="Screenshot 2"></img>
<img src="https://github.com/user-attachments/assets/7499503e-9dec-4f7c-8c58-b4960f63bc39" width="45%" alt="Screenshot 3"></img>
<img src="https://github.com/user-attachments/assets/688b4ecc-0ba5-4990-92a5-8b567e08d7d6" width="45%" alt="Screenshot 4"></img>
</p>

### Installation

> **Important:** Firefox is recommended for large SoundFonts due to memory constraints. A decent computer is also recommended for handling large SoundFonts.

[Recommended high-quality SoundFont (better than the built-in one)](https://musical-artifacts.com/artifacts/1176)

**Requires Node.js**

#### Windows
1. Download the code as a ZIP file and extract, or use `git clone https://github.com/spessasus/SpessaSynth`.
2. Put your SoundFonts into the `soundfonts` folder (you can select SoundFonts in the program).
3. Double-click `start.bat`.
4. Enjoy!

#### Linux
1. Clone the repository:
   ```bash
   git clone https://github.com/spessasus/SpessaSynth
   cd SpessaSynth
   npm start
   ```
2. Put your SoundFonts into the `soundfonts` folder (you can select SoundFonts in the program).
3. Enjoy!

[If you would like to help translate SpessaSynth, please read this guide (and thank you!)](src/website/locale/locale_files/README)

#### TODO
- Improve the performance of the worklet system
- Potentially port the worklet system to Emscripten
- Enhance the built-in chorus and reverb effects (suggestions welcome!)
- Fix issues with release during attack

### Special Thanks
- [FluidSynth](https://github.com/FluidSynth/fluidsynth) - for the source code that helped implement functionality and fixes
- [Polyphone](https://www.polyphone-soundfonts.com/) - for the soundfont testing and editing tool
- [Meltysynth](https://github.com/sinshu/meltysynth) - for the initial low-pass filter implementation
- [RecordingBlogs](https://www.recordingblogs.com/) - for detailed explanations on MIDI messages
- [stbvorbis.js](https://github.com/hajimehoshi/stbvorbis.js) - for the Vorbis decoder
- [OggVorbisEncoder](https://github.com/higuma/ogg-vorbis-encoder-js) - for the MIT Vorbis encoder
- **And You!** - for checking out this project. I hope you like it :)

### Major Releases
- [0.0.1](https://github.com/spessasus/SpessaSynth/commit/bc5c6516ae7edc94656b5df75d254a29280caa18) - Initial release
- [1.0.0](https://github.com/spessasus/SpessaSynth/commit/45c23d1c2906b2dec202c0533a9737bd1fa6b3c4) - Removed the 2-sample limit
- [2.0.0](https://github.com/spessasus/SpessaSynth/commit/350e4db90210375da27e393393df743be2137d59) - Implemented the worklet system and added support for modulators
- [3.0.0](https://github.com/spessasus/SpessaSynth/commit/b7f9e382a2f62eef462755ac9ebfe603663e4106) - Moved to audioWorkletGlobalScope for offline audio rendering

### License
Copyright © 2024 Spessasus. Licensed under the MIT License.

> [!IMPORTANT]
> Please note that the bundled [stbvorbis_sync.js](https://github.com/spessasus/stbvorbis_sync.js) is licensed under the Apache-2.0 license.
