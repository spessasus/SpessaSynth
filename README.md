<!--suppress HtmlDeprecatedAttribute, HtmlRequiredAltAttribute, HtmlExtraClosingTag -->
<p align='center'>
<img src="src/website/spessasynth_logo_rounded.png" width='300' alt='SpessaSynth logo'>
</p>

**SpessaSynth** is a SoundFont2-based real-time synthesizer and MIDI library written in vanilla JavaScript.
It’s a powerful and versatile library that allows you to:
- Play MIDI files using SF2/SF3/DLS files
- Write MIDI files
- Write SF2/SF3 files
- Convert DLS to SF2 (and back)
- [and more!](https://github.com/spessasus/spessasynth_core?tab=readme-ov-file#current-features)

### The project has been split!

*The library has been split from this repository.
It only contains the web application now.*
[Read more here](https://github.com/spessasus/SpessaSynth/wiki/The-Split)

<h1 align="center"><a href="https://spessasus.github.io/SpessaSynth/">Live Demo (no download needed!)</a></h1>

<h2 align="center">Made with SpessaSynth</h2>
<p align="center">
<a href="https://www.youtube.com/watch?v=Cu_A1IR65yQ"><img width='500' alt="Watch the YouTube video" src="https://github.com/user-attachments/assets/d73c0585-67eb-4490-ad39-839b22ab7577"></a>
</p>

**This repository contains the web application.
 For the library,
 see [spessasynth_core](https://github.com/spessasus/spessasynth_core) and [spessasynth_lib](https://github.com/spessasus/spessasynth_lib)**

<h1 align='center'>Web App / Local Edition</h1>
<p align='center'>The complete GUI for spessasynth_lib, allowing remixing, experimenting, and playing MIDIs in the coolest way possible.</p>

<p align='center'>
<img src="https://github.com/user-attachments/assets/42f5cf2d-0b5b-492d-8929-064d55d8c11f" alt="SpessaSynth promotional image" width="75%">
</p>
<h3 align='center'><a href='https://github.com/spessasus/SpessaSynth/wiki/How-To-Use-App'>Usage Guide</a></h3>
<h2 align='center'>Features</h2>

- **Visualization of the played sequence:** with cool effects like visual pitch bend and note-on effects!
- **Playable keyboard with various sizes:** mobile friendly!
- **Integrated controller for the synthesizer with numerous options:** Edit instruments, controllers, and more!
- **MIDI Lyrics support:** Karaoke!
- **Kar Lyrics support:** Karaoke but fancy!
- **ASS Subtitle support:** Karaoke but even fancier!
- **Music player mode:** with support for album covers in .rmi files!
- Mobile-friendly UI (*synthesizer performance not optimized for mobile... don't tell anyone!*)
- **Multiple language support:** 
  - English
  - Polish
  - Japanese
  - French (translated by Davy Triponney)
  - Portuguese (translated by Lucas Gabriel)
  - Custom locale management system, created specifically for this project
- **Description of buttons:** Hover over the buttons to see what they do!
- **`Web MIDI API` support:** Use your physical MIDI devices!
- [WebMidiLink](https://www.g200kg.com/en/docs/webmidilink/) support
- **Numerous exporting options:**
  - Render the MIDI file (modified or unmodified) to .wav
  - Render each channel as a separate .wav file
  - Export the modified MIDI file to .mid
  - Export the trimmed SoundFont to .sf2
  - Export a DLS file to .sf2
  - Export an SF2 file to .dls
  - Or compress it as .sf3!
  - Bundle both as .rmi with metadata such as album cover!
- Comes bundled with a compressed [GeneralUser GS](https://schristiancollins.com/generaluser.php) SoundFont to get you started

<h3 align='center'>Still not convinced? Check out these screenshots:</h3>

<!--
MARKDOWN VERSION
![image](https://github.com/user-attachments/assets/b0c9a1f3-3278-4208-8d35-f63b0943ae39)
![image](https://github.com/user-attachments/assets/b7aeef1d-3f9a-4bff-a5cc-cdee700a8a54)
![image](https://github.com/user-attachments/assets/7499503e-9dec-4f7c-8c58-b4960f63bc39)
![image](https://github.com/user-attachments/assets/772c1636-26cb-4efd-a9d1-daef5f12c566)
![image](https://github.com/user-attachments/assets/0c98f317-69d1-499c-968d-0870d9f5bec5)
![image](https://github.com/user-attachments/assets/c57c4229-92e1-4ab3-81ef-b1162a917220)
-->
<p align='center'>
<img src="https://github.com/user-attachments/assets/d6fe5993-ad1b-4979-aed5-85f3c77862f3" width="45%"></img>
<img src="https://github.com/user-attachments/assets/b7aeef1d-3f9a-4bff-a5cc-cdee700a8a54" width="45%"></img> 
<img src="https://github.com/user-attachments/assets/7499503e-9dec-4f7c-8c58-b4960f63bc39" width="45%"></img>
<img src="https://github.com/user-attachments/assets/772c1636-26cb-4efd-a9d1-daef5f12c566" width="45%"></img>
<img src="https://github.com/user-attachments/assets/0c98f317-69d1-499c-968d-0870d9f5bec5" width="45%"></img>
<img src="https://github.com/user-attachments/assets/b9f7c939-7097-44a7-a02e-5262c8b61102" width="45%"></img> 

</p>

### Installation (Local Edition)
Local edition comes with easier soundfont management than the demo version,
also allowing to use it offline!

> [!IMPORTANT]
> Firefox is recommended due to Chromium's Web Audio bug and memory limit.
> A decent computer is also recommended for handling large SoundFonts.

[Recommended high-quality SoundFont (better than the built-in one)](https://musical-artifacts.com/artifacts/1176)

**Local Edition requires Node.js**

#### Windows
1. Download the code as a ZIP file and extract, or use `git clone https://github.com/spessasus/SpessaSynth`.
2. Put your SoundFonts into the `soundfonts` folder (you can select SoundFonts in the program).
3. Double-click `Open SpessaSynth.bat`.
4. Enjoy!

#### Linux
1. Clone the repository:
   ```bash
   git clone https://github.com/spessasus/SpessaSynth --depth 1
   cd SpessaSynth
   npm start
   ```
2. Put your SoundFonts into the `soundfonts` folder (you can select SoundFonts in the program).
3. Enjoy!

[If you would like to help translate SpessaSynth, please read this guide (and thank you!)](src/website/js/locale/locale_files/README.md)

**If you like this project, consider giving it a star. It really helps out!**

### Special Thanks
- [FluidSynth](https://github.com/FluidSynth/fluidsynth) - for the source code that helped implement functionality and fixes
- [Polyphone](https://www.polyphone-soundfonts.com/) - for the soundfont testing and editing tool
- [Meltysynth](https://github.com/sinshu/meltysynth) - for the initial low-pass filter implementation
- [RecordingBlogs](https://www.recordingblogs.com/) - for detailed explanations on MIDI messages
- [stbvorbis.js](https://github.com/hajimehoshi/stbvorbis.js) - for the Vorbis decoder
- [OggVorbisEncoder](https://github.com/higuma/ogg-vorbis-encoder-js) - for the MIT Vorbis encoder
- [fflate](https://github.com/101arrowz/fflate) - for the MIT DEFLATE implementation
- [foo_midi](https://github.com/stuerp/foo_midi) - for useful resources on XMF file format
- [Composers](https://github.com/spessasus/spessasynth-demo-songs#readme) - for the demo songs
- [Falcosoft](https://falcosoft.hu) - for help with the RMIDI format
- [Christian Collins](https://schristiancollins.com) - for the bundled GeneralUserGS soundfont and various bug reports regarding the synthesizer
- **And You!** - for checking out this project. I hope you like it :)

### Major Releases
- [0.0.1](https://github.com/spessasus/SpessaSynth/commit/bc5c6516ae7edc94656b5df75d254a29280caa18) - Initial release
- [1.0.0](https://github.com/spessasus/SpessaSynth/commit/45c23d1c2906b2dec202c0533a9737bd1fa6b3c4) - Removed the 2-sample limit
- [2.0.0](https://github.com/spessasus/SpessaSynth/commit/350e4db90210375da27e393393df743be2137d59) - Implemented the worklet system and added support for modulators
- [3.0.0](https://github.com/spessasus/SpessaSynth/commit/b7f9e382a2f62eef462755ac9ebfe603663e4106) - Moved to audioWorkletGlobalScope for offline audio rendering

### License
Copyright © 2025 Spessasus.
Licensed under the Apache-2.0 License.

#### Legal
This project is in no way endorsed or otherwise affiliated with the MIDI Manufacturers Association,
Creative Technology Ltd. or E-mu Systems, Inc., or any other organization mentioned.
SoundFont® is a registered trademark of Creative Technology Ltd.
All other trademarks are the property of their respective owners.
