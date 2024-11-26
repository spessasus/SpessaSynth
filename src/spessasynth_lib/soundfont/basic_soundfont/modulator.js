import { generatorTypes } from "./generator.js";
import { midiControllers } from "../../midi_parser/midi_message.js";

/**
 * modulators.js
 * purpose: parses soundfont modulators and the source enums, also includes the default modulators list
 **/

export const modulatorSources = {
    noController: 0,
    noteOnVelocity: 2,
    noteOnKeyNum: 3,
    polyPressure: 10,
    channelPressure: 13,
    pitchWheel: 14,
    pitchWheelRange: 16,
    link: 127
    
};
export const modulatorCurveTypes = {
    linear: 0,
    concave: 1,
    convex: 2,
    switch: 3
};

export class Modulator
{
    /**
     * The current computed value of this modulator
     * @type {number}
     */
    currentValue = 0;
    
    /**
     * Creates a modulator
     * @param params {{srcEnum: number, secSrcEnum: number, dest: generatorTypes, amt: number, transform: number}}
     */
    constructor(params)
    {
        this.sourceEnum = params.srcEnum;
        /**
         * @type {generatorTypes}
         */
        this.modulatorDestination = params.dest;
        this.secondarySourceEnum = params.secSrcEnum;
        this.transformAmount = params.amt;
        this.transformType = params.transform;
        
        
        if (this.modulatorDestination > 58)
        {
            this.modulatorDestination = generatorTypes.INVALID; // flag as invalid (for linked ones)
        }
        
        // decode the source
        this.sourcePolarity = this.sourceEnum >> 9 & 1;
        this.sourceDirection = this.sourceEnum >> 8 & 1;
        this.sourceUsesCC = this.sourceEnum >> 7 & 1;
        this.sourceIndex = this.sourceEnum & 127;
        this.sourceCurveType = this.sourceEnum >> 10 & 3;
        
        // decode the secondary source
        this.secSrcPolarity = this.secondarySourceEnum >> 9 & 1;
        this.secSrcDirection = this.secondarySourceEnum >> 8 & 1;
        this.secSrcUsesCC = this.secondarySourceEnum >> 7 & 1;
        this.secSrcIndex = this.secondarySourceEnum & 127;
        this.secSrcCurveType = this.secondarySourceEnum >> 10 & 3;
        
        /**
         * Indicates if the given modulator is chorus or reverb effects modulator.
         * This is done to simulate BASSMIDI effects behavior:
         * - defaults to 1000 transform amount rather than 200
         * - values can be changed, but anything above 200 is 1000
         * (except for values above 1000, they are copied directly)
         * - all values below are multiplied by 5 (200 * 5 = 1000)
         * - still can be disabled if the soundfont has its own modulator curve
         * - this fixes the very low amount of reverb by default and doesn't break soundfonts
         * @type {boolean}
         */
        this.isEffectModulator =
            (
                this.sourceEnum === 0x00DB
                || this.sourceEnum === 0x00DD
            )
            && this.secondarySourceEnum === 0x0
            && (
                this.modulatorDestination === generatorTypes.reverbEffectsSend
                || this.modulatorDestination === generatorTypes.chorusEffectsSend
            );
    }
    
    /**
     * @param modulator {Modulator}
     * @returns {Modulator}
     */
    static copy(modulator)
    {
        return new Modulator({
            srcEnum: modulator.sourceEnum,
            secSrcEnum: modulator.secondarySourceEnum,
            transform: modulator.transformType,
            amt: modulator.transformAmount,
            dest: modulator.modulatorDestination
        });
    }
    
    /**
     * @param mod1 {Modulator}
     * @param mod2 {Modulator}
     * @param checkAmount {boolean}
     * @returns {boolean}
     */
    static isIdentical(mod1, mod2, checkAmount = false)
    {
        return (mod1.sourceEnum === mod2.sourceEnum)
            && (mod1.modulatorDestination === mod2.modulatorDestination)
            && (mod1.secondarySourceEnum === mod2.secondarySourceEnum)
            && (mod1.transformType === mod2.transformType)
            && (!checkAmount || (mod1.transformAmount === mod2.transformAmount));
    }
    
    /**
     * Sums transform and creates a NEW modulator
     * @param modulator {Modulator}
     * @returns {Modulator}
     */
    sumTransform(modulator)
    {
        return new Modulator({
            srcEnum: this.sourceEnum,
            secSrcEnum: this.secondarySourceEnum,
            dest: this.modulatorDestination,
            transform: this.transformType,
            amt: this.transformAmount + modulator.transformAmount
        });
    }
    
    /**
     * @returns {string}
     */
    debugString()
    {
        function getKeyByValue(object, value)
        {
            return Object.keys(object).find(key => object[key] === value);
        }
        
        let sourceString = getKeyByValue(modulatorCurveTypes, this.sourceCurveType);
        sourceString += this.sourcePolarity === 0 ? " unipolar " : " bipolar ";
        sourceString += this.sourceDirection === 0 ? "forwards " : "backwards ";
        if (this.sourceUsesCC)
        {
            sourceString += getKeyByValue(midiControllers, this.sourceIndex);
        }
        else
        {
            sourceString += getKeyByValue(modulatorSources, this.sourceIndex);
        }
        
        let secSrcString = getKeyByValue(modulatorCurveTypes, this.secSrcCurveType);
        secSrcString += this.secSrcPolarity === 0 ? " unipolar " : " bipolar ";
        secSrcString += this.secSrcCurveType === 0 ? "forwards " : "backwards ";
        if (this.secSrcUsesCC)
        {
            secSrcString += getKeyByValue(midiControllers, this.secSrcIndex);
        }
        else
        {
            secSrcString += getKeyByValue(modulatorSources, this.secSrcIndex);
        }
        return `Modulator:
        Source: ${sourceString}
        Secondary source: ${secSrcString}
        Destination: ${getKeyByValue(generatorTypes, this.modulatorDestination)}
        Trasform amount: ${this.transformAmount}
        Transform type: ${this.transformType}
        \n\n`;
    }
}

export const DEFAULT_ATTENUATION_MOD_AMOUNT = 960;
export const DEFAULT_ATTENUATION_MOD_CURVE_TYPE = modulatorCurveTypes.concave;

export function getModSourceEnum(curveType, polarity, direction, isCC, index)
{
    return (curveType << 10) | (polarity << 9) | (direction << 8) | (isCC << 7) | index;
}

export const defaultModulators = [
    // vel to attenuation
    new Modulator({
        srcEnum: getModSourceEnum(
            DEFAULT_ATTENUATION_MOD_CURVE_TYPE,
            0,
            1,
            0,
            modulatorSources.noteOnVelocity
        ),
        dest: generatorTypes.initialAttenuation,
        amt: DEFAULT_ATTENUATION_MOD_AMOUNT,
        secSrcEnum: 0x0,
        transform: 0
    }),
    
    // mod wheel to vibrato
    new Modulator({ srcEnum: 0x0081, dest: generatorTypes.vibLfoToPitch, amt: 50, secSrcEnum: 0x0, transform: 0 }),
    
    // vol to attenuation
    new Modulator({
        srcEnum: getModSourceEnum(
            DEFAULT_ATTENUATION_MOD_CURVE_TYPE,
            0,
            1,
            1,
            midiControllers.mainVolume
        ),
        dest: generatorTypes.initialAttenuation,
        amt: DEFAULT_ATTENUATION_MOD_AMOUNT,
        secSrcEnum: 0x0,
        transform: 0
    }),
    
    // channel pressure to vibrato
    new Modulator({ srcEnum: 0x000D, dest: generatorTypes.vibLfoToPitch, amt: 50, secSrcEnum: 0x0, transform: 0 }),
    
    // pitch wheel to tuning
    new Modulator({ srcEnum: 0x020E, dest: generatorTypes.fineTune, amt: 12700, secSrcEnum: 0x0010, transform: 0 }),
    
    // pan to uhh, pan
    // amount is 500 instead of 1000, see #59
    new Modulator({ srcEnum: 0x028A, dest: generatorTypes.pan, amt: 500, secSrcEnum: 0x0, transform: 0 }),
    
    // expression to attenuation
    new Modulator({
        srcEnum: getModSourceEnum(
            DEFAULT_ATTENUATION_MOD_CURVE_TYPE,
            0,
            1,
            1,
            midiControllers.expressionController
        ),
        dest: generatorTypes.initialAttenuation,
        amt: DEFAULT_ATTENUATION_MOD_AMOUNT,
        secSrcEnum: 0x0,
        transform: 0
    }),
    
    // reverb effects to send
    new Modulator({ srcEnum: 0x00DB, dest: generatorTypes.reverbEffectsSend, amt: 200, secSrcEnum: 0x0, transform: 0 }),
    
    // chorus effects to send
    new Modulator({ srcEnum: 0x00DD, dest: generatorTypes.chorusEffectsSend, amt: 200, secSrcEnum: 0x0, transform: 0 }),
    
    // custom modulators heck yeah
    // poly pressure to vibrato
    new Modulator({
        srcEnum: getModSourceEnum(modulatorCurveTypes.linear, 0, 0, 0, modulatorSources.polyPressure),
        dest: generatorTypes.vibLfoToPitch,
        amt: 50,
        secSrcEnum: 0x0,
        transform: 0
    }),
    
    // cc 92 (tremolo) to modLFO volume
    new Modulator({
        srcEnum: getModSourceEnum(
            modulatorCurveTypes.linear,
            0,
            0,
            1,
            midiControllers.tremoloDepth
        ), /*linear forward unipolar cc 92 */
        dest: generatorTypes.modLfoToVolume,
        amt: 24,
        secSrcEnum: 0x0, // no controller
        transform: 0
    }),
    
    // cc 72 (release time) to volEnv release
    new Modulator({
        srcEnum: getModSourceEnum(
            modulatorCurveTypes.linear,
            1,
            0,
            1,
            midiControllers.releaseTime
        ), // linear forward bipolar cc 72
        dest: generatorTypes.releaseVolEnv,
        amt: 1200,
        secSrcEnum: 0x0, // no controller
        transform: 0
    }),
    
    // cc 74 (brightness) to filterFc
    new Modulator({
        srcEnum: getModSourceEnum(
            modulatorCurveTypes.linear,
            1,
            0,
            1,
            midiControllers.brightness
        ), // linear forwards bipolar cc 74
        dest: generatorTypes.initialFilterFc,
        amt: 6000,
        secSrcEnum: 0x0, // no controller
        transform: 0
    }),
    
    // cc 71 (filter q) to filterq
    new Modulator({
        srcEnum: getModSourceEnum(
            modulatorCurveTypes.linear,
            1,
            0,
            1,
            midiControllers.timbreHarmonicContent
        ), // linear forwards bipolar cc 74
        dest: generatorTypes.initialFilterQ,
        amt: 250,
        secSrcEnum: 0x0, // no controller
        transform: 0
    })
];