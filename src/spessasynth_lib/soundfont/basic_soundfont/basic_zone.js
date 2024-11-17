/**
 * @typedef {Object} SoundFontRange
 * @property {number} min - the minimum midi note
 * @property {number} max - the maximum midi note
 */

export class BasicZone
{
    /**
     * The zone's velocity range
     * min -1 means that it is a default value
     * @type {SoundFontRange}
     */
    velRange = { min: -1, max: 127 };
    
    /**
     * The zone's key range
     * min -1 means that it is a default value
     * @type {SoundFontRange}
     */
    keyRange = { min: -1, max: 127 };
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
    
    /**
     * @returns {boolean}
     */
    get hasKeyRange()
    {
        return this.keyRange.min !== -1;
    }
    
    /**
     * @returns {boolean}
     */
    get hasVelRange()
    {
        return this.velRange.min !== -1;
    }
    
    /**
     * @param generatorType {generatorTypes}
     * @param notFoundValue {number}
     * @returns {number}
     */
    getGeneratorValue(generatorType, notFoundValue)
    {
        return this.generators.find(g => g.generatorType === generatorType)?.generatorValue ?? notFoundValue;
    }
}

