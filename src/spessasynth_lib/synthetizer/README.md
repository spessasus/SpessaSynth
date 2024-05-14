## This is the main synthesizer folder.
The code here is responsible for making the actual sound. 
This is the heart of the SpessaSynth library.
Here it's divided into 2 types:
- `native_system` - the old synthesis system with AudioBuffers, only periodically maintained, lacking many features and not supporting modulators. It will be used when the AudioWorklet API cannot be used.
- `worklet_system` - the current synthesis system with AudioWorklets, has all the features and is actively maintained and expanded.