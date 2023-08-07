import {Generator, generatorTypes} from "../../../soundfont/chunk/generators.js";
import {Sample} from "../../../soundfont/chunk/samples.js";

const EMU_ATTENUATION_CORRECTION = 0.4;

export class GeneratorTranslator {
    /**
     * Translates the generators to values for the sample node
     * @param sampleAndGenerators {{
     *  instrumentGenerators: Generator[],
     *  presetGenerators: Generator[],
     *  sample: Sample
     * }}}
     */
    constructor(sampleAndGenerators) {
        /**
         * @param set {Set}
         * @param cb {any}
         * @returns {undefined|*}
         */

        this.sample = sampleAndGenerators.sample;
        this.presetGenerators = sampleAndGenerators.presetGenerators;
        this.instrumentGenerators = sampleAndGenerators.instrumentGenerators;

        // overridingRootKey
        this.rootKey = this.getGeneratorValue(generatorTypes.overridingRootKey, this.sample.samplePitch);

        // sampleModes
        this.loopingMode = this.getGeneratorValue(generatorTypes.sampleModes, 0) & 3;

        // pan (raw)
        this.pan = this.sumGeneratorValue(generatorTypes.pan, 0, -500, 500);

        // audio envelope
        // initialAttenuation (dB)
        // this.attenuation = (this._getPresetGenerator("initialAttenuation") / 10) +
        //     (this.getGeneratorValue("initialAttenuation", 0) / 10);
        this.attenuation = this.sumGeneratorValue(generatorTypes.initialAttenuation,
            0,
            -100 / EMU_ATTENUATION_CORRECTION,
            1440) / 10 * EMU_ATTENUATION_CORRECTION;

        // delayVolEnv
        this.delayTime = this.sumGeneratorValue(generatorTypes.delayVolEnv,
            -12000,
            -12000,
            8000);

        // attackVolEnv
        this.attackTime = this.sumGeneratorValue(generatorTypes.attackVolEnv,
            -12000,
            -12000,
            8000);

        // holdVolEnv
        this.holdTime = this.sumGeneratorValue(generatorTypes.holdVolEnv,
            -12000,
            -12000,
            5000);

        // decayVolEnv
        this.decayTime = this.sumGeneratorValue(generatorTypes.decayVolEnv,
             -12000,
             -12000,
              8000);

        // sustainVolEnv (dB)
        this.sustainLowerAmount = this.sumGeneratorValue(generatorTypes.sustainVolEnv,
            0,
            0,
            1440) / 10;

        // releaseVolEnv (timecents) defaults to 5s
        this.releaseTime = this.sumGeneratorValue(generatorTypes.releaseVolEnv,
            -12000,
            -12000,
            8000);

        // scaleTuning
        this.scaleTune = this.sumGeneratorValue(generatorTypes.scaleTuning, 100, 0, 1200);

        // exclusiveClass
        this.exclusiveClass = this.getGeneratorValue(generatorTypes.exclusiveClass, 0);

        // offsets
        this.startOffset = this.getGeneratorValue(generatorTypes.startAddrsOffset, 0);
        this.endOffset = this.getGeneratorValue(generatorTypes.endAddrOffset, 0);
        this.startLoopOffset = this.getGeneratorValue(generatorTypes.startloopAddrsOffset, 0);
        this.endLoopOffset = this.getGeneratorValue(generatorTypes.endloopAddrsOffset, 0);

        // coarseTune
        this.semitoneTune = this.sumGeneratorValue(generatorTypes.coarseTune, 0, -120, 120);

        // fineTune
        this.centTune = this.sumGeneratorValue(generatorTypes.fineTune, 0, -99, 99);

        // initialFilterFc
        this.filterCutoff = this.sumGeneratorValue(generatorTypes.initialFilterFc, 13500, 1500, 13500);
    }

    /**
     * @param generatorType {number}
     * @param defaultValue {number}
     * @returns {number}
     */
    getGeneratorValue(generatorType, defaultValue)
    {
        let val = defaultValue;
        let searchedVal = this.instrumentGenerators.find(g => g.generatorType === generatorType)
        if(searchedVal)
        {
            return searchedVal.generatorValue;
        }
        return val;
    }

    /**
     * Gets generator from the preset level (defaults to 0)
     * @param generatorType {number}
     * @returns {number}
     */
    _getPresetGenerator(generatorType)
    {
        let val = 0;
        let searchedVal = this.presetGenerators.find(g => g.generatorType === generatorType)
        if(searchedVal)
        {
            return searchedVal.generatorValue;
        }
        return val;
    }

    /**
     * @param generatorType {number}
     * @param defaultValue {number} - will default to this if no generator is found or out of range
     * @param minAllowed {number}
     * @param maxAllowed {number}
     * @returns {number}
     */
    sumGeneratorValue(generatorType, defaultValue, minAllowed, maxAllowed)
    {
        const preset = this._getPresetGenerator(generatorType);
        let gen = this.instrumentGenerators.find(g => g.generatorType === generatorType);
        if(gen)
        {
            const val = gen.generatorValue + preset;
            return this.limitValue(val, minAllowed, maxAllowed)
        }

        return this.limitValue(preset + defaultValue, minAllowed, maxAllowed);
    }

    /**
     * @param val {number}
     * @param minAllowed {number}
     * @param maxAllowed {number}
     * @return {number}
     */
    limitValue(val, minAllowed, maxAllowed)
    {
        if(val < minAllowed)
        {
            return minAllowed;
        }
        else if(val > maxAllowed) {
            return maxAllowed;
        }
        return val
    }

    /**
     * @param timecents {number} timecents
     * @returns {number} seconds
     */
    timecentsToSeconds(timecents)
    {
        return Math.pow(2, timecents / 1200);
    }

    decibelsToGain(decibels)
    {
        return Math.pow(10, decibels / 20);
    }

    /**
     * @typedef {{
     *     attenuation: number,
     *     delayTime: number,
     *     attackTime: number,
     *     holdTime: number,
     *     decayTime: number,
     *     sustainLevel: number,
     *     releaseTime: number
     * }} volumeEnvelope
     */

    /**
     * Returns the complete volume envelope
     * @returns {volumeEnvelope}
     */
    getVolumeEnvelope()
    {
        const attenuation = this.decibelsToGain(this.attenuation * -1)//Math.pow(10, (this.attenuation * -1) / 20);
        const delayTime = this.timecentsToSeconds(this.delayTime);
        const attackTime = this.timecentsToSeconds(this.attackTime);
        const holdTime = this.timecentsToSeconds(this.holdTime);
        const decayTime = this.timecentsToSeconds(this.decayTime);
        const sustainLevel = this._getSustainLevel();
        let releaseTime = this.timecentsToSeconds(this.releaseTime);
        if(releaseTime > 5)
        {
            releaseTime = 5;
        }
        return {
            attenuation: attenuation,
            delayTime: delayTime,
            attackTime: attackTime,
            holdTime: holdTime,
            decayTime: decayTime,
            sustainLevel: sustainLevel,
            releaseTime: releaseTime
        };
    }

    /**
     * @param midiNote {number} Midi note (0-127)
     * @returns {number} playback rate (0 to inf)
     */
    getPlaybackRate(midiNote)
    {
        const semitones = this.semitoneTune + (this.centTune / 100); // calculate both to semitones
        const tune = Math.pow(2, semitones / 12);

        let notePlayback = this.sample.getPlaybackRate(midiNote, this.getRootKey()) * tune;

        // correct with scaleTuning
        return 1 + (notePlayback - 1) * this.getScaleTuneInfluence();
    }

    /**
     * @return {number} how noteplayback influences the rate (0 to inf)
     */
    getScaleTuneInfluence() {
        if(this.scaleTune < 0)
        {
            return 1;
        }
        return this.scaleTune / 100
    }

    /**
     * @returns {number} 0 - no exclusive, any other - kill others with the same exclusive
     */
    getExclusiveclass()
    {
        return this.exclusiveClass;
    }


    /**
     * @returns {number} the sustaing gain level (0 to inf)
     */
    _getSustainLevel()
    {
        if(this.sustainLowerAmount < 0)
        {
            return this.decibelsToGain(this.attenuation * -1);
        }
        let sustain = this.decibelsToGain(this.attenuation * -1) * this.decibelsToGain(this.sustainLowerAmount * -1)
        if(sustain <= 0)
        {
            return 0.001;
        }
        return sustain;
    }

    /**
     * @returns {number} pan (-1 to 1)
     */
    getPan()
    {
        return this.pan / 500;
    }

    /**
     * @returns {number} root key
     */
    getRootKey()
    {
        return this.rootKey;
    }

    // /**
    //  * @returns {number} attenuation as gain (0 to inf)
    //  */
    // getAttenuation()
    // {
    //     // return 1;
    //     // NO KURWA JA PIERDOLE WYSTARCZYLO * -1 DODAC ZEBY TO GOWNO ZACZELO KURWA DZIALAC AAAAHAHGDIFGSDGHDGHSDFKGJSHD
    //     return Math.pow(10, (this.attenuation * -1) / 20);
    // }

    /**
     * @returns {number} 0 - no loop 1 - loop, 2 - reserved, 3 - loop and stop when fading
     */
    getLoopingMode()
    {
        return this.loopingMode;
    }

    /**
     * @returns {{start: number, end:number, startLoop: number, endLoop: number}} all the address offsets
     */
    getAddressOffsets()
    {
        return {
            start: this.startOffset,
            end: this.endOffset,
            startLoop: this.startLoopOffset,
            endLoop: this.endLoopOffset
        }
    }

    /**
     * @returns {number} filter cutoff in hertz
     */
    getFilterCutoffHz()
    {
        return 440 * Math.pow(2, (this.filterCutoff - 6900) / 1200);
    }
}