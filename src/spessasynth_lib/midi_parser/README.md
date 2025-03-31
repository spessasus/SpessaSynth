## This is the MIDI file parsing folder.

The code here is responsible for parsing the MIDI files and interpreting the messsages.
All the events are defined in the `midi_message.js` file.

### MIDI Classes hierarchy

#### MIDI Sequence
- The most basic class, containing all the metadata that inheritors have.
- It does not contain track data or embedded sound bank.
- Contains the function for calculating time from ticks.
- Contains the copying code.

#### MIDI Data
- Inherits from MIDI Sequence.
- Has an `isEmbedded` property to mark the existence of embedded bank. This is the class that is available in `sequencer.midiData`.

#### Basic MIDI
- Inherits from MIDI Sequence.
- The actual MIDI representation, containing the track data and embedded sound banks.
- Contains the code for parsing the MIDI and filling in the metadata automatically.
- Contains the SMF/RMI writing functions.
- Contains the code for determining used channels on tracks.

#### MIDI Builder
- Inherits from Basic MIDI.
- Used for building MIDIs from scratch.

### MIDI
- Inherits from Basic MIDI.
- The SMF/RMI/XMF file parser.
- Called by the sequencer if an `ArrayBuffer` is provided.