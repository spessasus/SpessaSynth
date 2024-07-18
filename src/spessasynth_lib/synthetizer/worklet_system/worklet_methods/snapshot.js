
/**
 * @typedef {Object} ChannelSnapshot - a snapshot of the channel.
 *
 * @property {number} program - the channel's program
 * @property {number} bank - the channel's bank
 * @property {boolean} lockPreset - indicates whether the channel's program change is disabled
 *
 * @property {Int16Array} midiControllers - the array of all midi controllers (in 14-bit values) with the modulator sources at the end. See Synthesizer Class on wiki (lockController section)
 * @property {boolean[]} lockedControllers - an array of booleans, indicating if the controller with a current index is locked
 * @property {Float32Array} customControllers - array of custom (not sf2) control values such as RPN pitch tuning, transpose, modulation depth, etc.
 *
 * // note: this is a custom vibrato object, set by NRPN messages
 * @property {boolean} lockVibrato - indicates whether the channel vibrato is locked
 * @property {Object} channelVibrato - the channel's vibrato
 * @property {number} channelVibrato.depth - vibrato depth, in gain
 * @property {number} channelVibrato.delay - vibrato delay from note on in seconds
 * @property {number} channelVibrato.rate - vibrato rate in Hz
 *
 * @property {number} channelTranspose - key shift for the channel
 * @property {boolean} isMuted - indicates whether the channel is muted
 * @property {boolean} drumChannel - indicates whether the channel is a drum channel
 */
/**
 * @typedef {Object} SynthesizerSnapshot
 * @property {ChannelSnapshot[]} channelSnapshots - the individual channel snapshots
 * @property {number} mainVolume - main synth volume (set by MIDI), from 0 to 1
 * @property {number} pan - master stereo panning, from -1 to 1
 * @property {SynthSystem} system - the synths system. Values can be "gs", "gm", "gm2" or "xg"
 * @property {number} transposition - the current synth transpositon in semitones. can be a float
 */

import { returnMessageType } from '../message_protocol/worklet_message.js'
import { SpessaSynthInfo } from '../../../utils/loggin.js'
import { consoleColors } from '../../../utils/other.js'
import { midiControllers } from '../../../midi_parser/midi_message.js'

/**
 * sends a snapshot of the current controller values of the synth (used to copy that data to OfflineAudioContext when rendering)
 * @this {SpessaSynthProcessor}
 */
export function sendSynthesizerSnapshot()
{
    /**
     * @type {ChannelSnapshot[]}
     */
    const channelSnapshots = this.workletProcessorChannels.map(channel => {
        return {
            program: channel.preset.program,
            bank: channel.preset.bank,
            lockPreset: channel.lockPreset,

            midiControllers: channel.midiControllers,
            lockedControllers: channel.lockedControllers,
            customControllers: channel.customControllers,

            channelVibrato: channel.channelVibrato,
            lockVibrato: channel.lockVibrato,

            channelTranspose: channel.channelTranspose,
            isMuted: channel.isMuted,
            drumChannel: channel.drumChannel
        }
    });

    /**
     * @type {SynthesizerSnapshot}
     */
    const synthesizerSnapshot = {
        channelSnapshots: channelSnapshots,
        mainVolume: this.midiVolume,
        pan: this.pan,
        transposition: this.transposition,
        system: this.system
    };

    this.post({
        messageType: returnMessageType.synthesizerSnapshot,
        messageData: synthesizerSnapshot
    });
}

/**
 * Applies the snapshot to the synth
 * @param snapshot {SynthesizerSnapshot}
 * @this {SpessaSynthProcessor}
 */
export function applySynthesizerSnapshot(snapshot)
{
    // restore system
    this.system = snapshot.system;

    // restore pan and volume
    this.setMasterGain(snapshot.mainVolume);
    this.setMasterPan(snapshot.pan);
    this.transposeAllChannels(snapshot.transposition);

    // add channels if more needed
    while(this.workletProcessorChannels.length < snapshot.channelSnapshots.length)
    {
        this.createWorkletChannel();
    }

    // restore cahnnels
    snapshot.channelSnapshots.forEach((channelSnapshot, index) => {
        const channelObject = this.workletProcessorChannels[index];
        this.muteChannel(index, channelSnapshot.isMuted);
        this.setDrums(index, channelSnapshot.drumChannel);

        // restore controllers
        channelObject.midiControllers = channelSnapshot.midiControllers;
        channelObject.lockedControllers = channelSnapshot.lockedControllers;
        channelObject.customControllers = channelSnapshot.customControllers;

        // restore vibrato and transpose
        channelObject.channelVibrato = channelSnapshot.channelVibrato;
        channelObject.lockVibrato = channelSnapshot.lockVibrato;
        channelObject.channelTranspose = channelSnapshot.channelTranspose;

        // restore preset and lock
        channelObject.lockPreset = false;
        channelObject.midiControllers[midiControllers.bankSelect] = channelSnapshot.bank;
        this.programChange(index, channelSnapshot.program);
        channelObject.lockPreset = channelSnapshot.lockPreset;
    });
    SpessaSynthInfo("%cFinished restoring controllers!", consoleColors.info);
}