# SpessaSynth
SoundFont2 based realtime synthetizer and MIDI visualizer written in JavaScript
![SpessaSynth in action](https://github.com/spessasus/SpessaSynth/assets/95608008/029a2d14-cefd-4f63-b2c1-be549c23351c)



## Features
- Limited SoundFont2 Generator Support
- Limited MIDI Controller Support
- Visualization of the played file
- Playable keyboard with preset selection
- Written in pure JavaScript using WebAudio API (Express.js is only used for the file server)

## Limitations
- It won't play Black MIDIs. (Sorry, Rush E)
- Max 2 Samples per note. It's probably my bad coding or it's too much for the browser. Either way, it may cause problems with some instruments, but the program tries to find the samples that matter the most.

## Installation
**Requires Node.js**
1. Download the code as zip or use `git clone`
2. Put some soundfonts into the `soundfonts` folder
3. Double click the `start.bat`
4. Enjoy!
