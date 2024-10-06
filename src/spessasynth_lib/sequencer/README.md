## This is the sequencer's folder.
The code here is responsible for playing back the parsed MIDI sequence with the synthesizer.

### Message protocol:
#### Message structure
```js
const message = {
    messageType: number, // WorkletSequencerMessageType
    messageData: any     // any
}
```

#### To worklet
Sequencer uses `Synthetizer`'s `post` method to post a message with `messageData` set to `workletMessageType.sequencerSpecific`.
The `messageData` is set to the sequencer's message.

#### From worklet
`WorkletSequencer` uses `SpessaSynthProcessor`'s post to send a message with `messageData` set to `returnMessageType.sequencerSpecific`.
The `messageData` is set to the sequencer's return message.


### Process tick
`processTick` is called every time the `process` method is called via `SpessaSynthProcessor.processTickCallback`.
