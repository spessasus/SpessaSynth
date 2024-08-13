/**
 * @typedef {Object} SoundFontRange
 * @property {number} min - the minimum midi note
 * @property {number} max - the maximum midi note
 */

export class BasicZone
{
    constructor()
    {
        /**
         * The zone's generators
         * @type {Generator[]}
         */
        this.generators = [];
        /**
         * The zone's modulators
         * @type {Modulator[]}
         */
        this.modulators = [];
        /**
         * Indicates if the zone is global
         * @type {boolean}
         */
        this.isGlobal = false;
        /**
         * The zone's key range
         * @type {SoundFontRange}
         */
        this.keyRange = { min: 0, max: 127 };

        /**
         * The zone's velocity range
         * @type {SoundFontRange}
         */
        this.velRange = { min: 0, max: 127 };
    }
}

