import { KeyModifier } from "spessasynth_core";
import { workerKeyModifierMessageType, workerMessageType } from "../worker_thread/worker_message.js";


export class WorkerKeyModifierManagerWrapper
{
    /**
     * @param synth {CustomSynth}
     */
    constructor(synth)
    {
        this.synth = synth;
        /**
         * The velocity override mappings for MIDI keys
         * @type {KeyModifier[][]}
         * @private
         */
        this._keyModifiers = [];
    }
    
    /**
     * @private
     * @param type {workerKeyModifierMessageType}
     * @param data {any}
     */
    _sendToWorker(type, data)
    {
        this.synth.post({
            messageType: workerMessageType.keyModifierManager,
            messageData: [
                type,
                data
            ]
        });
    }
    
    /**
     * Modifies a single key
     * @param channel {number} the channel affected. Usually 0-15
     * @param midiNote {number} the MIDI note to change. 0-127
     * @param options {{
     *     velocity: number|undefined,
     *     patch: {
     *         bank: number,
     *         program: number
     *     }|undefined,
     *     gain: number|undefined
     * }} the key's modifiers
     */
    addModifier(channel, midiNote, options)
    {
        const velocity = options?.velocity ?? -1;
        const program = options?.patch?.program ?? -1;
        const bank = options?.patch?.bank ?? -1;
        const gain = options?.gain ?? 1;
        const mod = new KeyModifier(velocity, bank, program, gain);
        if (this._keyModifiers[channel] === undefined)
        {
            this._keyModifiers[channel] = [];
        }
        this._keyModifiers[channel][midiNote] = mod;
        this._sendToWorker(
            workerKeyModifierMessageType.addMapping,
            [channel, midiNote, mod]
        );
    }
    
    /**
     * Gets a key modifier
     * @param channel {number} the channel affected. Usually 0-15
     * @param midiNote {number} the MIDI note to change. 0-127
     * @returns {KeyModifier|undefined}
     */
    getModifier(channel, midiNote)
    {
        return this._keyModifiers?.[channel]?.[midiNote];
    }
    
    /**
     * Deletes a key modifier
     * @param channel {number} the channel affected. Usually 0-15
     * @param midiNote {number} the MIDI note to change. 0-127
     */
    deleteModifier(channel, midiNote)
    {
        this._sendToWorker(
            workerKeyModifierMessageType.deleteMapping,
            [channel, midiNote]
        );
        if (this._keyModifiers[channel]?.[midiNote] === undefined)
        {
            return;
        }
        this._keyModifiers[channel][midiNote] = undefined;
    }
    
    /**
     * Clears ALL Modifiers
     */
    clearModifiers()
    {
        this._sendToWorker(workerKeyModifierMessageType.clearMappings, undefined);
        this._keyModifiers = [];
    }
}