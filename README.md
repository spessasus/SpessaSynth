# SpessaSynth
SoundFont2 based realtime synthetizer and MIDI visualizer written in JavaScript
![SpessaSynth in action](https://github.com/spessasus/SpessaSynth/assets/95608008/2c3da514-13de-435b-b59a-788670d9ccd8)



## Features
- Limited SoundFont2 Generator Support
- Limited MIDI Controller Support
- Visualization of the played file
- Playable keyboard with preset selection
- Written in pure JavaScript using WebAudio API (Express.js is only used for the file server)

## Limitations
- Max 2 Samples per note. It's probably my bad coding or it's too much for the browser. Either way, it may cause problems with some instruments, but the program tries to find the samples that matter the most.

## Installation
**Requires Node.js**
1. Download the code as zip or use `git clone`
2. Put your file named `soundfont.sf2` into the `soundfonts` folder. (SoundFont selection coming soon)
3. Double click the `start.bat`
4. Enjoy!
