
/**
 * @typedef {Object} ChannelSnapshot
 *
 * @property {number} program
 * @property {number} bank
 * @property {boolean} lockPreset
 *
 * @property {Int16Array} midiControllers
 * @property {boolean[]} lockedControllers
 * @property {Float32Array} customControllers
 *
 * @property {boolean} lockVibrato
 * @property {Object} channelVibrato
 * @property {number} channelVibrato.depth
 * @property {number} channelVibrato.delay
 * @property {number} channelVibrato.rate
 *
 * @property {boolean} isMuted
 * @property {boolean} drumChannel
 */
/**
 * @typedef {Object} SynthesizerSnapshot
 * @property {ChannelSnapshot[]} channelSnapshots
 * @property {number} mainVolume
 * @property {number} pan
 * @property {SynthSystem} system
 * @property {number} transposition
 */

import { returnMessageType } from '../worklet_utilities/worklet_message.js'
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

            isMuted: channel.isMuted,
            drumChannel: channel.drumChannel
        }
    });

    /**
     * @type {SynthesizerSnapshot}
     */
    const synthesizerSnapshot = {
        channelSnapshots: channelSnapshots,
        mainVolume: this.mainVolume,
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
    this.setMainVolume(snapshot.mainVolume);
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

        // restore vibrato
        channelObject.channelVibrato = channelSnapshot.channelVibrato;
        channelObject.lockVibrato = channelSnapshot.lockVibrato;

        // restore preset and lock
        channelObject.lockPreset = false;
        channelObject.midiControllers[midiControllers.bankSelect] = channelSnapshot.bank;
        this.programChange(index, channelSnapshot.program);
        channelObject.lockPreset = channelSnapshot.lockPreset;
    });
    SpessaSynthInfo("%cFinished restoring controllers!", consoleColors.info);
}