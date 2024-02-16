# This is the old synthesis system.
It's not maintained anymore, but it's here for the HTTP websites which can't use AudioWorklets.
To use this system, edit `synthetizer.js`:
```js
import { MidiChannel } from './native_system/midi_channel.js';
```
and change the class from `WorkletChannel` to `MidiChannel`
```js
/**
 *  create 16 channels
 * @type {WorkletChannel[]|MidiChannel[]}
 */
this.midiChannels = [...Array(DEFAULT_CHANNEL_COUNT).keys()].map(j => new MidiChannel(this.volumeController, this.defaultPreset, j + 1, false));

// ...

/**
 * Adds a new channel to the synthesizer
 */
addNewChannel()
{
    this.midiChannels.push(new MidiChannel(this.volumeController, this.defaultPreset, this.midiChannels.length + 1, false));
    this.eventHandler.callEvent("newchannel", this.midiChannels[this.midiChannels.length - 1]);
}
```