import { generatorTypes } from "./generator.js";
import { midiControllers } from "../../midi/midi_message.js";

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
     * The source enumeration for this modulator
     * @type {number}
     */
    sourceEnum;
    
    /**
     * The secondary source enumeration for this modulator
     * @type {number}
     */
    secondarySourceEnum;
    
    /**
     * The generator destination of this modulator
     * @type {generatorTypes}
     */
    modulatorDestination;
    
    /**
     * The transform amount for this modulator
     * @type {number}
     */
    transformAmount;
    
    /**
     * The transform type for this modulator
     * @type {0|2}
     */
    transformType;
    
    /**
     * creates a modulator
     * @param srcEnum {number}
     * @param secSrcEnum {number}
     * @param destination {generatorTypes|number}
     * @param amount {number}
     * @param transformType {number}
     */
    constructor(srcEnum, secSrcEnum, destination, amount, transformType)
    {
        this.sourceEnum = srcEnum;
        this.modulatorDestination = destination;
        this.secondarySourceEnum = secSrcEnum;
        this.transformAmount = amount;
        this.transformType = transformType;
        
        
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
        return new Modulator(
            modulator.sourceEnum,
            modulator.secondarySourceEnum,
            modulator.modulatorDestination,
            modulator.transformAmount,
            modulator.transformType
        );
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
     * @param mod {Modulator}
     * @returns {string}
     */
    static debugString(mod)
    {
        function getKeyByValue(object, value)
        {
            return Object.keys(object).find(key => object[key] === value);
        }
        
        let sourceString = getKeyByValue(modulatorCurveTypes, mod.sourceCurveType);
        sourceString += mod.sourcePolarity === 0 ? " unipolar " : " bipolar ";
        sourceString += mod.sourceDirection === 0 ? "forwards " : "backwards ";
        if (mod.sourceUsesCC)
        {
            sourceString += getKeyByValue(midiControllers, mod.sourceIndex);
        }
        else
        {
            sourceString += getKeyByValue(modulatorSources, mod.sourceIndex);
        }
        
        let secSrcString = getKeyByValue(modulatorCurveTypes, mod.secSrcCurveType);
        secSrcString += mod.secSrcPolarity === 0 ? " unipolar " : " bipolar ";
        secSrcString += mod.secSrcCurveType === 0 ? "forwards " : "backwards ";
        if (mod.secSrcUsesCC)
        {
            secSrcString += getKeyByValue(midiControllers, mod.secSrcIndex);
        }
        else
        {
            secSrcString += getKeyByValue(modulatorSources, mod.secSrcIndex);
        }
        return `Modulator:
        Source: ${sourceString}
        Secondary source: ${secSrcString}
        Destination: ${getKeyByValue(generatorTypes, mod.modulatorDestination)}
        Trasform amount: ${mod.transformAmount}
        Transform type: ${mod.transformType}
        \n\n`;
    }
    
    /**
     * Sum transform and create a NEW modulator
     * @param modulator {Modulator}
     * @returns {Modulator}
     */
    sumTransform(modulator)
    {
        return new Modulator(
            this.sourceEnum,
            this.secondarySourceEnum,
            this.modulatorDestination,
            this.transformAmount + modulator.transformAmount,
            this.transformType
        );
    }
}

export const DEFAULT_ATTENUATION_MOD_AMOUNT = 960;
export const DEFAULT_ATTENUATION_MOD_CURVE_TYPE = modulatorCurveTypes.concave;

export function getModSourceEnum(curveType, polarity, direction, isCC, index)
{
    return (curveType << 10) | (polarity << 9) | (direction << 8) | (isCC << 7) | index;
}

const soundFontModulators = [
    // vel to attenuation
    new Modulator(
        getModSourceEnum(
            DEFAULT_ATTENUATION_MOD_CURVE_TYPE,
            0,
            1,
            0,
            modulatorSources.noteOnVelocity
        ),
        0x0,
        generatorTypes.initialAttenuation,
        DEFAULT_ATTENUATION_MOD_AMOUNT,
        0
    ),
    
    // mod wheel to vibrato
    new Modulator(0x0081, 0x0, generatorTypes.vibLfoToPitch, 50, 0),
    
    // vol to attenuation
    new Modulator(
        getModSourceEnum(
            DEFAULT_ATTENUATION_MOD_CURVE_TYPE,
            0,
            1,
            1,
            midiControllers.mainVolume
        ),
        0x0,
        generatorTypes.initialAttenuation,
        DEFAULT_ATTENUATION_MOD_AMOUNT,
        0
    ),
    
    // channel pressure to vibrato
    new Modulator(0x000D, 0x0, generatorTypes.vibLfoToPitch, 50, 0),
    
    // pitch wheel to tuning
    new Modulator(0x020E, 0x0010, generatorTypes.fineTune, 12700, 0),
    
    // pan to uhh, pan
    // amount is 500 instead of 1000, see #59
    new Modulator(0x028A, 0x0, generatorTypes.pan, 500, 0),
    
    // expression to attenuation
    new Modulator(
        getModSourceEnum(
            DEFAULT_ATTENUATION_MOD_CURVE_TYPE,
            0,
            1,
            1,
            midiControllers.expressionController
        ),
        0x0,
        generatorTypes.initialAttenuation,
        DEFAULT_ATTENUATION_MOD_AMOUNT,
        0
    ),
    
    // reverb effects to send
    new Modulator(0x00DB, 0x0, generatorTypes.reverbEffectsSend, 200, 0),
    
    // chorus effects to send
    new Modulator(0x00DD, 0x0, generatorTypes.chorusEffectsSend, 200, 0)
];

const customModulators = [
    // custom modulators heck yeah
    // poly pressure to vibrato
    new Modulator(
        getModSourceEnum(modulatorCurveTypes.linear, 0, 0, 0, modulatorSources.polyPressure),
        0x0,
        generatorTypes.vibLfoToPitch,
        50,
        0
    ),
    
    // cc 92 (tremolo) to modLFO volume
    new Modulator(
        getModSourceEnum(
            modulatorCurveTypes.linear,
            0,
            0,
            1,
            midiControllers.tremoloDepth
        ), /*linear forward unipolar cc 92 */
        0x0, // no controller
        generatorTypes.modLfoToVolume,
        24,
        0
    ),
    
    // cc 73 (attack time) to volEnv attack
    new Modulator(
        getModSourceEnum(
            modulatorCurveTypes.convex,
            1,
            0,
            1,
            midiControllers.attackTime
        ), // linear forward bipolar cc 72
        0x0, // no controller
        generatorTypes.attackVolEnv,
        6000,
        0
    ),
    
    // cc 72 (release time) to volEnv release
    new Modulator(
        getModSourceEnum(
            modulatorCurveTypes.linear,
            1,
            0,
            1,
            midiControllers.releaseTime
        ), // linear forward bipolar cc 72
        0x0, // no controller
        generatorTypes.releaseVolEnv,
        3600,
        0
    ),
    
    // cc 74 (brightness) to filterFc
    new Modulator(
        getModSourceEnum(
            modulatorCurveTypes.linear,
            1,
            0,
            1,
            midiControllers.brightness
        ), // linear forwards bipolar cc 74
        0x0, // no controller
        generatorTypes.initialFilterFc,
        6000,
        0
    ),
    
    // cc 71 (filter Q) to filter Q
    new Modulator(
        getModSourceEnum(
            modulatorCurveTypes.linear,
            1,
            0,
            1,
            midiControllers.filterResonance
        ), // linear forwards bipolar cc 74
        0x0, // no controller
        generatorTypes.initialFilterQ,
        250,
        0
    )
];

/**
 * @type {Modulator[]}
 */
export const defaultModulators = soundFontModulators.concat(customModulators);