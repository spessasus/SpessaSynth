/**
 * A manager for custom key overrides for channels
 */

export class KeyModifier
{
    
    /**
     * The new override velocity. -1 means unchanged
     * @type {number}
     */
    velocity = -1;
    /**
     * The patch this key uses. -1 on either means default
     * @type {{bank: number, program: number}}
     */
    patch = { bank: -1, program: -1 };
    
    /**
     * Linear gain override for the voice
     */
    gain = 1;
    
    /**
     * @param velocity {number}
     * @param bank {number}
     * @param program {number}
     * @param gain {number}
     */
    constructor(velocity = -1, bank = -1, program = -1, gain = 1)
    {
        this.velocity = velocity;
        this.patch = {
            bank: bank,
            program: program
        };
        this.gain = gain;
    }
}

/**
 * @enum {number}
 */
export const workletKeyModifierMessageType = {
    addMapping: 0,    // [channel<number>, midiNote<number>, mapping<KeyModifier>]
    deleteMapping: 1, // [channel<number>, midiNote<number>]
    clearMappings: 2 // <no data>
};

export class KeyModifierManager
{
    /**
     * The velocity override mappings for MIDI keys
     * @type {KeyModifier[][]}
     * @private
     */
    _keyMappings = [];
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     * @param mapping {KeyModifier}
     */
    addMapping(channel, midiNote, mapping)
    {
        if (this._keyMappings[channel] === undefined)
        {
            this._keyMappings[channel] = [];
        }
        this._keyMappings[channel][midiNote] = mapping;
    }
    
    deleteMapping(channel, midiNote)
    {
        if (this._keyMappings[channel]?.[midiNote] === undefined)
        {
            return;
        }
        this._keyMappings[channel][midiNote] = undefined;
    }
    
    clearMappings()
    {
        this._keyMappings = [];
    }
    
    /**
     * @param mappings {KeyModifier[][]}
     */
    setMappings(mappings)
    {
        this._keyMappings = mappings;
    }
    
    /**
     * @returns {KeyModifier[][]}
     */
    getMappings()
    {
        return this._keyMappings;
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     * @returns {number} velocity, -1 if unchanged
     */
    getVelocity(channel, midiNote)
    {
        return this._keyMappings[channel]?.[midiNote]?.velocity ?? -1;
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     * @returns {number} linear gain
     */
    getGain(channel, midiNote)
    {
        return this._keyMappings[channel]?.[midiNote]?.gain ?? 1;
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     * @returns {boolean}
     */
    hasOverridePatch(channel, midiNote)
    {
        const bank = this._keyMappings[channel]?.[midiNote]?.patch?.bank;
        return bank !== undefined && bank >= 0;
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     * @returns {{bank: number, program: number}} -1 if unchanged
     */
    getPatch(channel, midiNote)
    {
        const modifier = this._keyMappings[channel]?.[midiNote];
        if (modifier)
        {
            return modifier.patch;
        }
        throw new Error("No modifier.");
    }
    
}