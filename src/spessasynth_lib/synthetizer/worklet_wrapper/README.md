# About the message protocol
Since spessasynth_lib runs in the audioWorklet thread, here is an explanation of how it works:

There's one processor per synthesizer, with a `MessagePort` for communication.
Each processor has a single `SpessaSynthequencer` instance that is idle by default.

The `Synthetizer`, 
`Sequencer` and `SoundFontManager` classes are all interfaces 
that do not do anything except sending the commands to te processor.

The synthesizer sends the commands (note on, off, etc.) directly to the processor where they are processed and executed.

The sequencer sends the commands through the connected synthesizer's messagePort, which then get processed as sequencer messages and routed properly.