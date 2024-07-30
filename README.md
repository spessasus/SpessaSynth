<p align='center'>
<img src="src/website/spessasynth_logo_rounded.png" width='300' alt='SpessaSynth logo'>
</p>

**SpessaSynth** is a SoundFont2-based real-time synthesizer and MIDI player written in vanilla JavaScript. It’s a powerful library that allows you to read, write, or play MIDI files and read/write SF2/SF3 files with ease.

![SpessaSynth Promotional Image](https://github.com/spessasus/SpessaSynth/assets/95608008/e2e6c4c6-0762-4c11-8887-a2318d431854)

<h3 align='center'>Exporting SoundFonts and RMIDIs now available! With compression too!</h3>
<p align='center'>
   <img src="https://github.com/user-attachments/assets/0aba6293-0458-401f-91fc-71f7a4a7640c" width="50%" alt="Exporting SoundFonts and RMIDIs">
</p>

<h1 align="center"><a href="https://spessasus.github.io/SpessaSynth/">Live Demo (no download needed!)</a></h1>

<h2 align="center">YouTube Video</h2>
<p align="center">
<a href="https://youtu.be/6rUjjVcMXu8"><img width='500' alt="Watch the YouTube video" src="https://github.com/spessasus/SpessaSynth/assets/95608008/0fade923-1ed6-4565-8300-1f57ef70bc89"></a>
</p>

This repository contains both the library and a complete musical web application. See below:

<h1 align='center'>spessasynth_lib</h1>
<p align='center'>A flexible, powerful, and feature-packed SoundFont synthesizer library for the WebAudio API. Comes with the ability to edit MIDIs and SoundFonts!</p>

<h3 align='center'><a href="https://github.com/spessasus/SpessaSynth/wiki/Home">Documentation</a></h3>

<h2 align='center'>Features</h2>

### Easy Integration
- **Modular design:** Easy integration into other projects (load what you need)
- **[Detailed documentation:](https://github.com/spessasus/SpessaSynth/wiki/Home)** With [examples!](https://github.com/spessasus/SpessaSynth/wiki/Usage-As-Library#examples)
- **Easy to Use:** basic setup is just [two lines of code!](https://github.com/spessasus/SpessaSynth/wiki/Usage-As-Library#minimal-setup)
- **No dependencies:** _batteries included!_

### Powerful SoundFont Synthesizer
- Suitable for both **real-time** and **offline** synthesis
- **Excellent SoundFont support:**
- - **Generator Support**
- - **Modulator Support:** _First (to my knowledge) JavaScript SoundFont synth with that feature!_
- - **SoundFont3 Support:** Play compressed SoundFonts!
- - **Can load very large SoundFonts:** up to 4GB! _Note: Only Firefox handles this well; Chromium has a hard-coded memory limit_
- **Reverb and chorus support:** [customizable!](https://github.com/spessasus/SpessaSynth/wiki/Synthetizer-Class#effects-configuration-object)
- **Export audio files** using [OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext)
- **[Custom modulators for additional controllers](https://github.com/spessasus/SpessaSynth/wiki/Modulator-Class#default-modulators):** Why not?
- **Written using AudioWorklets:** runs in a separate thread for maximum performance, works perfectly in Firefox and Chrome!
- **Unlimited channel count:** Your CPU is the limit!
- **Various MIDI Standards Support:**
- - **MIDI Controller Support:** Default supported controllers [here](https://github.com/spessasus/SpessaSynth/wiki/MIDI-Implementation#supported-controllers)
- - [Full **RPN** and limited **NRPN** support](https://github.com/spessasus/SpessaSynth/wiki/MIDI-Implementation#supported-registered-parameters)
- - Supports some [**Roland GS** and **Yamaha XG** system exclusives](https://github.com/spessasus/SpessaSynth/wiki/MIDI-Implementation#supported-system-exclusives)
- **High-performance mode:** Play Rush E! _note: may kill your browser ;)_
- **Written in pure JavaScript using the WebAudio API:** Supported by all modern browsers!

### Built-in Powerful and Fast Sequencer
- **Supports MIDI formats 0, 1, and 2:** _note: format 2 support is experimental as it's very, very rare_
- **[Multi-Port MIDI](https://github.com/spessasus/SpessaSynth/wiki/About-Multi-Port) support:** More than 16 channels!
- **Smart preloading:** Only preloads the samples used in the MIDI file for smooth playback (down to key and velocity!)
- **Lyrics support:** Add karaoke to your program!
- **Raw lyrics available:** Decode in any encoding! (Kanji? No problem!)

### Read and Write SoundFont and MIDI Files with Ease
#### Read and write MIDI files
  - **Smart name detection:** Handles incorrectly formatted and non-standard track names
  - **Port detection during load time:** Manage ports and channels easily!
  - **Used channels on track:** Quickly determine which channels are used
  - **Key range detection:** Detect the key range of the MIDI
  - **Easy MIDI editing:** Use [helper functions](https://github.com/spessasus/SpessaSynth/wiki/Writing-MIDI-Files#modifymidi) to modify the song to your needs!
  - **Loop detection:** Automatically detects loops in MIDIs (e.g., from _Touhou Project_)
  - **First note detection:** Skip unnecessary silence at the start by jumping to the first note!
  - **Easy saving:** Save with just [one function!](https://github.com/spessasus/SpessaSynth/wiki/Writing-MIDI-Files#writemidifile)
#### Read and write [RMID files with embedded SF2 soundfonts](https://github.com/spessasus/SpessaSynth/wiki/About-RMIDI)
  - **Compression and trimming support:** Reduce a MIDI file with a 1GB soundfont to **as small as 5MB**!
  - **Easy saving:** [As simple as saving a MIDI file!](https://github.com/spessasus/SpessaSynth/wiki/Writing-MIDI-Files#writermidi)
#### Read and write SoundFont2 files
  - **Smart trimming:** Trim the SoundFont to only include samples used in the MIDI (down to key and velocity!)
  - **sf3 conversion:** Compress SoundFont2 files to SoundFont3!
  - **Easy saving:** Also just [one function!](https://github.com/spessasus/SpessaSynth/wiki/SoundFont2-Class#write)
#### Read and write SoundFont3 files
  - Same features as SoundFont2 but with now with **Ogg Vorbis compression!**
  - **Variable compression quality:** You choose between file size and quality!
  - **Compression preserving:** Avoid decompressing and recompressing uncompressed samples for minimal quality loss!

## Limitations
- Synth's performance may be suboptimal, especially on mobile devices.

### Installation
1. Clone this repository.
2. Copy `src/spessasynth_lib` to your project.
3. [Use the library](https://github.com/spessasus/SpessaSynth/wiki/Home)

> [!TIP]
> Looking for a Node.js version? Try [spessasynth_core](https://www.npmjs.com/package/spessasynth_core)!

<h1 align='center'>Web App / Local Edition</h1>
<p align='center'>The complete GUI for spessasynth_lib, allowing remixing, experimenting, and playing MIDIs in the coolest way possible.</p>
<h3 align='center'><a href='https://github.com/spessasus/SpessaSynth/wiki/How-To-Use-App'>Usage Guide</a></h3>

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
<img src="https://github.com/user-attachments/assets/b0c9a1f3-3278-4208-8d35-f63b0943ae39" width="45%" alt="Screenshot 1"> 
<img src="https://github.com/user-attachments/assets/3bfd9de0-ed13-4667-b843-47c956454136" width="45%" alt="Screenshot 2">
<img src="https://github.com/user-attachments/assets/7499503e-9dec-4f7c-8c58-b4960f63bc39" width="45%" alt="Screenshot 3">
<img src="https://github.com/user-attachments/assets/688b4ecc-0ba5-4990-92a5-8b567e08d7d6" width="45%" alt="Screenshot 4">
</p>

### Installation

> [!IMPORTANT]
> Firefox is recommended for large SoundFonts due to memory constraints. A decent computer is also recommended for handling large SoundFonts.

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

[If you would like to help translate SpessaSynth, please read this guide (and thank you!)](src/website/locale/locale_files/README.md)

**If you like this project, consider giving it a star. It really helps out!**

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
