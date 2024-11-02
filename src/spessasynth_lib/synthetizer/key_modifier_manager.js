import { workletMessageType } from "./worklet_system/message_protocol/worklet_message.js";
import { KeyModifier, workletKeyModifierMessageType } from "./worklet_system/worklet_methods/worklet_key_modifier.js";

export class KeyModifierManager
{
    /**
     * @param synth {Synthetizer}
     */
    constructor(synth)
    {
        this.synth = synth;
    }
    
    /**
     * @private
     * @param type {workletKeyModifierMessageType}
     * @param data {any}
     */
    _sendToWorklet(type, data)
    {
        this.synth.post({
            messageType: workletMessageType.keyModifierManager,
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
     *     }|undefined
     * }} the key's modifiers
     */
    addModifier(channel, midiNote, options)
    {
        const velocity = options?.velocity || -1;
        const program = options?.patch?.program ?? -1;
        const bank = options?.patch?.bank ?? -1;
        this._sendToWorklet(
            workletKeyModifierMessageType.addMapping,
            [channel, midiNote, new KeyModifier(velocity, bank, program)]
        );
    }
    
    /**
     * Deletes a key modifier
     * @param channel {number} the channel affected. Usually 0-15
     * @param midiNote {number} the MIDI note to change. 0-127
     */
    deleteModifier(channel, midiNote)
    {
        this._sendToWorklet(
            workletKeyModifierMessageType.deleteMapping,
            [channel, midiNote]
        );
    }
    
    /**
     * Clears ALL Modifiers
     */
    clearModifiers()
    {
        this._sendToWorklet(workletKeyModifierMessageType.clearMappings, undefined);
    }
}