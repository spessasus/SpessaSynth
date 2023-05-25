# SpessaSynth
SoundFont2 based MIDI synthetizer and visualizer written in JavaScript
![SpessaSynth in action](https://private-user-images.githubusercontent.com/95608008/240066409-0f281d7a-2424-40ae-88d0-0c7cd344a560.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXkiOiJrZXkxIiwiZXhwIjoxNjg1MDM4ODA2LCJuYmYiOjE2ODUwMzg1MDYsInBhdGgiOiIvOTU2MDgwMDgvMjQwMDY2NDA5LTBmMjgxZDdhLTI0MjQtNDBhZS04OGQwLTBjN2NkMzQ0YTU2MC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBSVdOSllBWDRDU1ZFSDUzQSUyRjIwMjMwNTI1JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDIzMDUyNVQxODE1MDZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT01NTU4NzUwNjFlMjE4ZDZlOWU3MDJmNDZlMmJiMTY5YmIyMmMxMThmNjEzNTAzN2QzOWMyYTA0ZWRlYjJiYzEwJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.O2dlNo7gKYAbhqMXugL7uvNeHnfGxL5RrRK2FusSS7I)



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
