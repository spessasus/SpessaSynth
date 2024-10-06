/**
 * @typedef {Object} SoundFontRange
 * @property {number} min - the minimum midi note
 * @property {number} max - the maximum midi note
 */

export class BasicZone
{
    /**
     * The zone's velocity range
     * @type {SoundFontRange}
     */
    velRange = { min: 0, max: 127 };
    
    /**
     * The zone's key range
     * @type {SoundFontRange}
     */
    keyRange = { min: 0, max: 127 };
    
    /**
     * Indicates if the zone is global
     * @type {boolean}
     */
    isGlobal = false;
    
    /**
     * The zone's generators
     * @type {Generator[]}
     */
    generators = [];
    
    /**
     * The zone's modulators
     * @type {Modulator[]}
     */
    modulators = [];
}

