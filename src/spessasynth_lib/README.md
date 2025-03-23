# spessasynth_lib

**A powerful SF2/DLS/MIDI JavaScript library for the browsers.**

```shell
npm install --save spessasynth_lib
```

### [Project site (consider giving it a star!)](https://github.com/spessasus/SpessaSynth)

### [Demo](https://spessasus.github.io/SpessaSynth)

### [Complete documentation](https://github.com/spessasus/SpessaSynth/wiki/Usage-As-Library)

#### Basic example: play a single note

```js
import { Synthetizer } from "spessasynth_lib"

const sfont = await (await fetch("soundfont.sf3")).arrayBuffer();
const ctx = new AudioContext();
// make sure you copied the worklet processor!
await ctx.audioWorklet.addModule("./worklet_processor.min.js");
const synth = new Synthetizer(ctx.destination, sfont);
document.getElementById("button").onclick = async () =>
{
    await ctx.resume();
    synth.programChange(0, 48); // strings ensemble
    synth.noteOn(0, 52, 127);
}
```

## Current Features

### Numerous Format Support
Supported formats list:
- `.mid` - Standard MIDI File
- `.kar` - Soft Karaoke MIDI File
- `.sf2` - SoundFont2 File
- `.sf3` - SoundFont2 Compressed File
- `.sfogg` - SF2Pack With Vorbis Compression
- `.dls` - Downloadable Sounds Levels 1 & 2 (as well as Mobile DLS)
- `.rmi` - RIFF MIDI File
- `.rmi` - RIFF MIDI File With Embedded DLS
- `.rmi` - [RIFF MIDI File With Embedded SF2](https://github.com/spessasus/sf2-rmidi-specification)
- `.xmf` - eXtensible Music Format
- `.mxmf` - Mobile eXtensible Music format

*With [an easy way of converting between them!](https://github.com/spessasus/SpessaSynth/wiki/Converting-Between-Formats)*

### Easy Integration
- **Modular design:** *Easy integration into other projects (load what you need)*
- **[Detailed documentation:](https://github.com/spessasus/SpessaSynth/wiki/Home)** *With [examples!](https://github.com/spessasus/SpessaSynth/wiki/Usage-As-Library#examples)*
- **Flexible:** *It's not just a MIDI player!*
- **Easy to Use:** *Basic setup is just [two lines of code!](https://github.com/spessasus/SpessaSynth/wiki/Usage-As-Library#minimal-setup)*
- **No dependencies:** *Batteries included!*

### Powerful Synthesizer
- Suitable for both **real-time** and **offline** synthesis
- **Excellent SoundFont support:**
  - **Full Generator Support**
  - **Full Modulator Support:** *First (to my knowledge) JavaScript SoundFont synth with that feature!*
  - **GeneralUserGS Compatible:** *[See more here!](https://github.com/mrbumpy409/GeneralUser-GS/blob/main/documentation/README.md)*
  - **SoundFont3 Support:** Play compressed SoundFonts!
  - **Experimental SF2Pack Support:** Play soundfonts compressed with BASSMIDI! (*Note: only works with vorbis compression*)
  - **Can load very large SoundFonts:** up to 4GB! *Note: Only Firefox handles this well; Chromium has a hard-coded memory limit*
- **Great DLS Support:**
  - **DLS Level 1 Support**
  - **DLS Level 2 Support**
  - **Mobile DLS Support**
  - **Correct articulator support:** *Converts articulators to both modulators and generators!*
  - **Tested and working with gm.dls!**
  - **Correct volume:** *Properly translated to SoundFont volume!*
  - **A-Law encoding support**
  - **Both unsigned 8-bit and signed 16-bit sample support (24-bit theoretically supported as well!)**
  - **Detects special articulator combinations:** *Such as vibratoLfoToPitch*
- **Soundfont manager:** Stack multiple soundfonts!
- **Reverb and chorus support:** [customizable!](https://github.com/spessasus/SpessaSynth/wiki/Synthetizer-Class#effects-configuration-object)
- **Export audio files** using [OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext)
- **[Custom modulators for additional controllers](https://github.com/spessasus/SpessaSynth/wiki/Modulator-Class#default-modulators):** *Why not?*
- **Written using AudioWorklets:** 
  - Runs in a **separate thread** for maximum performance
  - Doesn't stop playing even when the main thread is frozen
  - Supported by all modern browsers
- **Unlimited channel count:** Your CPU is the limit!
- **Excellent MIDI Standards Support:**
  - **MIDI Controller Support:** Default supported controllers [here](https://github.com/spessasus/SpessaSynth/wiki/MIDI-Implementation#supported-controllers)
  - **Portamento Support:** Glide the notes!
  - **Sound Controllers:** Real-time filter and envelope control!
  - **MIDI Tuning Standard Support:** [more info here](https://github.com/spessasus/SpessaSynth/wiki/MIDI-Implementation#midi-tuning-standard)
  - [Full **RPN** and limited **NRPN** support](https://github.com/spessasus/SpessaSynth/wiki/MIDI-Implementation#supported-registered-parameters)
  - Supports some [**Roland GS** and **Yamaha XG** system exclusives](https://github.com/spessasus/SpessaSynth/wiki/MIDI-Implementation#supported-system-exclusives)
- **High-performance mode:** Play Rush E! *note: may kill your browser ;)*

### Powerful and Fast MIDI Sequencer
- **Supports MIDI formats 0, 1, and 2:** *note: format 2 support is experimental as it's very, very rare.*
- **[Multi-Port MIDI](https://github.com/spessasus/SpessaSynth/wiki/About-Multi-Port) support:** More than 16 channels!
- **Smart preloading:** Only preloads the samples used in the MIDI file for smooth playback *(down to key and velocity!)*
- **Lyrics support:** Add karaoke to your program!
- **Raw lyrics available:** Decode in any encoding! *(Kanji? No problem!)*
- **Runs in Audio Thread as well:** Never blocks the main thread
- **Loop points support:** Ensures seamless loops

### Read and Write SoundFont and MIDI Files with Ease
#### Read and write MIDI files
  - **Smart name detection:** Handles incorrectly formatted and non-standard track names
  - **Raw name available:** Decode in any encoding! *(Kanji? No problem!)*
  - **Port detection during load time:** Manage ports and channels easily!
  - **Used channels on track:** Quickly determine which channels are used
  - **Key range detection:** Detect the key range of the MIDI
  - **Easy MIDI editing:** Use [helper functions](https://github.com/spessasus/SpessaSynth/wiki/Writing-MIDI-Files#modifymidi) to modify the song to your needs!
  - **Loop detection:** Automatically detects loops in MIDIs (e.g., from *Touhou Project*)
  - **First note detection:** Skip unnecessary silence at the start by jumping to the first note!
  - **Lyrics support:** Both regular MIDI and .kar files!
  - **[Write MIDI files from scratch](https://github.com/spessasus/SpessaSynth/wiki/Creating-MIDI-Files)**
  - **Easy saving:** Save with just [one function!](https://github.com/spessasus/SpessaSynth/wiki/Writing-MIDI-Files#writemidi)

#### Read and write [RMID files with embedded SF2 soundfonts](https://github.com/spessasus/sf2-rmidi-specification#readme)
  - **[Level 4](https://github.com/spessasus/sf2-rmidi-specification#level-4) compliance:** Reads and writes *everything!*
  - **Compression and trimming support:** Reduce a MIDI file with a 1GB soundfont to **as small as 5MB**!
  - **DLS Version support:** The original legacy format with bank offset detection!
  - **Automatic bank shifting and validation:** Every soundfont *just works!*
  - **Metadata support:** Add title, artist, album name and cover and more! And of course read them too! *(In any encoding!)*
  - **Compatible with [Falcosoft Midi Player 6!](https://falcosoft.hu/softwares.html#midiplayer)**
  - **Easy saving:** [As simple as saving a MIDI file!](https://github.com/spessasus/SpessaSynth/wiki/Writing-MIDI-Files#writermidi)

#### Read and write SoundFont2 files
  - **Easy info access:** Just an [object of strings!](https://github.com/spessasus/SpessaSynth/wiki/SoundFont2-Class#soundfontinfo)
  - **Smart trimming:** Trim the SoundFont to only include samples used in the MIDI *(down to key and velocity!)*
  - **sf3 conversion:** Compress SoundFont2 files to SoundFont3 with variable quality!
  - **Easy saving:** Also just [one function!](https://github.com/spessasus/SpessaSynth/wiki/SoundFont2-Class#write)

#### Read and write SoundFont3 files
  - Same features as SoundFont2 but with now with **Ogg Vorbis compression!**
  - **Variable compression quality:** You choose between file size and quality!
  - **Compression preserving:** Avoid decompressing and recompressing uncompressed samples for minimal quality loss!

#### Read and write DLS Level One or Two files
  - Read DLS (DownLoadable Sounds) files as SF2 files!
  - **Works like a normal soundfont:** *Saving it as sf2 is still [just one function!](https://github.com/spessasus/SpessaSynth/wiki/SoundFont2-Class#write)*
  - Converts articulators to both **modulators** and **generators**!
  - Works with both unsigned 8-bit samples and signed 16-bit samples!
  - A-Law encoding support
  - **Covers special generator cases:** *such as modLfoToPitch*!
  - **Correct volume:** *looking at you, Viena and gm.sf2!*
  - Support built right into the synthesizer!
  - **Convert SF2 to DLS:** [with limitations](https://github.com/spessasus/SpessaSynth/wiki/DLS-Conversion-Problem)

### Export MIDI as WAV
  - Save the MIDI file as WAV audio!
  - **Metadata support:** *Embed metadata such as title, artist, album and more!*
  - **Cue points:** *Write MIDI loop points as cue points!*
  - **Loop multiple times:** *Render two (or more) loops into the file for seamless transitions!*
  - *That's right, saving as WAV is also [just one function!](https://github.com/spessasus/SpessaSynth/wiki/Writing-Wave-Files#audiobuffertowav)*

# License
Copyright © 2025 Spessasus
Licensed under the Apache-2.0 License.

SoundFont® is a registered trademark of Creative Technology Ltd.