import {Generator} from "../../../soundfont2_parser/chunk/generators.js";
import {Sample} from "../../../soundfont2_parser/chunk/samples.js";

export class PresetNoteModifiers{
    /**
     * Creates options for the sample
     * @param sampleAndGenerators {{generators: Generator[], sample: Sample}}
     */
    constructor(sampleAndGenerators) {
        /**
         * @param set {Set}
         * @param cb {any}
         * @returns {undefined|*}
         */

        this.sample = sampleAndGenerators.sample;
        this.generators = sampleAndGenerators.generators;

        // overrideRootKey
        this.rootKey = this.getGeneratorValue("overridingRootKey", this.sample.samplePitch);

        // initialAttenuation (dB)
        this.attenuation = (this.sumGeneratorValue("initialAttenuation", 0)) / 10 * 0.4;

        // sampleModes
        this.loopingMode = this.getGeneratorValue("sampleModes", 0) & 3;

        // pan (raw)
        this.pan = this.getGeneratorValue("pan", 0);

        // decayVolEnv
        this.decayTime = this.getGeneratorValue("decayVolEnv", -12000);

        // sustainVolEnv (dB)
        this.sustainLowerAmount = (this.getGeneratorValue("sustainVolEnv", 0) / 10);

        // scaleTuning
        this.scaleTune = this.getGeneratorValue("scaleTuning", 100);

        // exclusiveClass
        this.exclusiveClass = this.getGeneratorValue("exclusiveClass", 0);

        // releaseVolEnv (timecents) defaults to 5s
        this.releaseTime = this.getGeneratorValue("releaseVolEnv", 2786);

        // holdVolEnv
        this.holdTime = this.getGeneratorValue("holdVolEnv", -12000);

        //TODO: add tuning (coarse and fine) and address offsets
    }

    /**
     * @param generatorType {generatorType}
     * @param defaultValue {number}
     * @returns {number}
     */
    getGeneratorValue(generatorType, defaultValue)
    {
        let val = defaultValue;
        let searchedVal = this.generators.find(g => g.generatorType === generatorType)
        if(searchedVal)
        {
            return searchedVal.generatorValue;
        }
        return val;
    }

    /**
     * @param generatorType {generatorType}
     * @param defaultValue {number}
     * @returns {number}
     */
    sumGeneratorValue(generatorType, defaultValue)
    {
        let gens = this.generators.filter(g => g.generatorType === generatorType);
        if(gens.length < 1)
        {
            return defaultValue;
        }
        let val = 0
        for(let gen of gens)
        {
            val += gen.generatorValue;
        }
        return val;
    }

    /**
     * @param timecents {number} timecents
     * @returns {number} seconds
     */
    timecentsToSeconds(timecents)
    {
        return Math.pow(2, timecents / 1288);
    }

    /**
     * @param midiNote {number} Midi note (0-127)
     * @returns {number} playback rate (0 to inf)
     */
    getPlaybackRate(midiNote)
    {
        let notePlayback = this.sample.getPlaybackRate(midiNote, this.getRootKey());
        // correct with scaleTuning
        return 1 + (notePlayback -1) * this.getScaleTuneInfluence();
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
     * @returns {number} fadeout time in seconds
     */
    getReleaseTime()
    {
        // -3986 ~ 0.1s
        //if(seconds > 5) seconds = 5;
        return this.timecentsToSeconds(this.releaseTime);
    }

    /**
     * @returns {number} time to sustain value in seconds
     */
    getDecayTime()
    {
        return this.timecentsToSeconds(this.decayTime);
    }

    /**
     * @returns {number} time to hold the note at initialAttenuation in seconds
     */
    getHoldTime()
    {
        return this.timecentsToSeconds(this.holdTime);
    }

    /**
     * @returns {number} the sustaing gain level (0 to inf)
     */
    getSustainLevel()
    {
        let sustain = Math.pow(10,  -1 * (this.sustainLowerAmount + this.attenuation) / 20);
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

    /**
     * @returns {number} attenuation as gain (0 to inf)
     */
    getAttenuation()
    {
        // return 1;
        // NO KURWA JA PIERDOLE WYSTARCZYLO * -1 DODAC ZEBY TO GOWNO ZACZELO KURWA DZIALAC AAAAHAHGDIFGSDGHDGHSDFKGJSHD
        return Math.pow(10, (this.attenuation * -1) / 20);
    }

    /**
     * @returns {number} 0 - no loop 1 - loop, 2 - reserved, 3 - loop and stop when fading
     */
    getLoopingMode()
    {
        return this.loopingMode;
    }
}