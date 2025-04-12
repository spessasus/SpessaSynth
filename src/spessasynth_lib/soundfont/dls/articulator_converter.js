import { DLSSources } from "./dls_sources.js";
import { getModSourceEnum, Modulator, modulatorCurveTypes, modulatorSources } from "../basic_soundfont/modulator.js";
import { midiControllers } from "../../midi/midi_message.js";
import { DLSDestinations } from "./dls_destinations.js";

import { generatorTypes } from "../basic_soundfont/generator.js";
import { consoleColors } from "../../utils/other.js";
import { SpessaSynthWarn } from "../../utils/loggin.js";

/**
 * @param source {number}
 * @returns {{enum: number, isCC: boolean}|undefined}
 */
function getSF2SourceFromDLS(source)
{
    let sourceEnum = undefined;
    let isCC = false;
    switch (source)
    {
        default:
        case DLSSources.modLfo:
        case DLSSources.vibratoLfo:
        case DLSSources.coarseTune:
        case DLSSources.fineTune:
        case DLSSources.modEnv:
            return undefined; // cannot be this in sf2
        
        case DLSSources.keyNum:
            sourceEnum = modulatorSources.noteOnKeyNum;
            break;
        case DLSSources.none:
            sourceEnum = modulatorSources.noController;
            break;
        case DLSSources.modulationWheel:
            sourceEnum = midiControllers.modulationWheel;
            isCC = true;
            break;
        case DLSSources.pan:
            sourceEnum = midiControllers.pan;
            isCC = true;
            break;
        case DLSSources.reverb:
            sourceEnum = midiControllers.reverbDepth;
            isCC = true;
            break;
        case DLSSources.chorus:
            sourceEnum = midiControllers.chorusDepth;
            isCC = true;
            break;
        case DLSSources.expression:
            sourceEnum = midiControllers.expressionController;
            isCC = true;
            break;
        case DLSSources.volume:
            sourceEnum = midiControllers.mainVolume;
            isCC = true;
            break;
        case DLSSources.velocity:
            sourceEnum = modulatorSources.noteOnVelocity;
            break;
        case DLSSources.polyPressure:
            sourceEnum = modulatorSources.polyPressure;
            break;
        case DLSSources.channelPressure:
            sourceEnum = modulatorSources.channelPressure;
            break;
        case DLSSources.pitchWheel:
            sourceEnum = modulatorSources.pitchWheel;
            break;
        case DLSSources.pitchWheelRange:
            sourceEnum = modulatorSources.pitchWheelRange;
            break;
    }
    if (sourceEnum === undefined)
    {
        throw new Error(`Unknown DLS Source: ${source}`);
    }
    return { enum: sourceEnum, isCC: isCC };
}

/**
 * @param destination {number}
 * @param amount {number}
 * @returns {generatorTypes|{gen: generatorTypes, newAmount: number}} // transform amount to sf2 units
 */
function getSF2GeneratorFromDLS(destination, amount)
{
    switch (destination)
    {
        default:
        case DLSDestinations.none:
            return undefined;
        case DLSDestinations.pan:
            return generatorTypes.pan;
        case DLSDestinations.gain:
            return { gen: generatorTypes.initialAttenuation, newAmount: amount * -1 };
        case DLSDestinations.pitch:
            return generatorTypes.fineTune;
        case DLSDestinations.keyNum:
            return generatorTypes.overridingRootKey;
        
        // vol env
        case DLSDestinations.volEnvDelay:
            return generatorTypes.delayVolEnv;
        case DLSDestinations.volEnvAttack:
            return generatorTypes.attackVolEnv;
        case DLSDestinations.volEnvHold:
            return generatorTypes.holdVolEnv;
        case DLSDestinations.volEnvDecay:
            return generatorTypes.decayVolEnv;
        case DLSDestinations.volEnvSustain:
            return { gen: generatorTypes.sustainVolEnv, newAmount: 1000 - amount };
        case DLSDestinations.volEnvRelease:
            return generatorTypes.releaseVolEnv;
        
        // mod env
        case DLSDestinations.modEnvDelay:
            return generatorTypes.delayModEnv;
        case DLSDestinations.modEnvAttack:
            return generatorTypes.attackModEnv;
        case DLSDestinations.modEnvHold:
            return generatorTypes.holdModEnv;
        case DLSDestinations.modEnvDecay:
            return generatorTypes.decayModEnv;
        case DLSDestinations.modEnvSustain:
            return { gen: generatorTypes.sustainModEnv, newAmount: (1000 - amount) / 10 };
        case DLSDestinations.modEnvRelease:
            return generatorTypes.releaseModEnv;
        
        case DLSDestinations.filterCutoff:
            return generatorTypes.initialFilterFc;
        case DLSDestinations.filterQ:
            return generatorTypes.initialFilterQ;
        case DLSDestinations.chorusSend:
            return generatorTypes.chorusEffectsSend;
        case DLSDestinations.reverbSend:
            return generatorTypes.reverbEffectsSend;
        
        // lfo
        case DLSDestinations.modLfoFreq:
            return generatorTypes.freqModLFO;
        case DLSDestinations.modLfoDelay:
            return generatorTypes.delayModLFO;
        case DLSDestinations.vibLfoFreq:
            return generatorTypes.freqVibLFO;
        case DLSDestinations.vibLfoDelay:
            return generatorTypes.delayVibLFO;
    }
}

/**
 * checks for combos such as mod lfo as source and pitch as destination which results in modLfoToPitch
 * @param source {number}
 * @param destination {number}
 * @returns {generatorTypes} real destination
 */
function checkForSpecialDLSCombo(source, destination)
{
    if (source === DLSSources.vibratoLfo && destination === DLSDestinations.pitch)
    {
        // vibrato lfo to pitch
        return generatorTypes.vibLfoToPitch;
    }
    else if (source === DLSSources.modLfo && destination === DLSDestinations.pitch)
    {
        // mod lfo to pitch
        return generatorTypes.modLfoToPitch;
    }
    else if (source === DLSSources.modLfo && destination === DLSDestinations.filterCutoff)
    {
        // mod lfo to filter
        return generatorTypes.modLfoToFilterFc;
    }
    else if (source === DLSSources.modLfo && destination === DLSDestinations.gain)
    {
        // mod lfo to volume
        return generatorTypes.modLfoToVolume;
    }
    else if (source === DLSSources.modEnv && destination === DLSDestinations.filterCutoff)
    {
        // mod envelope to filter
        return generatorTypes.modEnvToFilterFc;
    }
    else if (source === DLSSources.modEnv && destination === DLSDestinations.pitch)
    {
        // mod envelope to pitch
        return generatorTypes.modEnvToPitch;
    }
    else
    {
        return undefined;
    }
}

// noinspection JSUnusedGlobalSymbols
/**
 * @param source {number}
 * @param control {number}
 * @param destination {number}
 * @param value {number}
 * @param transform {number}
 * @param msg {string}
 */
export function modulatorConverterDebug(
    source,
    control,
    destination,
    value,
    transform,
    msg = "Attempting to convert the following DLS Articulator to SF2 Modulator:"
)
{
    const type = Object.keys(DLSDestinations).find(k => DLSDestinations[k] === destination);
    const srcType = Object.keys(DLSSources).find(k => DLSSources[k] === source);
    const ctrlType = Object.keys(DLSSources).find(k => DLSSources[k] === control);
    const typeString = type ? type : destination.toString(16);
    const srcString = srcType ? srcType : source.toString(16);
    const ctrlString = ctrlType ? ctrlType : control.toString(16);
    console.debug(
        `%c${msg}
        Source: %c${srcString}%c
        Control: %c${ctrlString}%c
        Destination: %c${typeString}%c
        Amount: %c${value}%c
        Transform: %c${transform}%c...`,
        consoleColors.info,
        consoleColors.recognized,
        consoleColors.info,
        consoleColors.recognized,
        consoleColors.info,
        consoleColors.recognized,
        consoleColors.info,
        consoleColors.recognized,
        consoleColors.info,
        consoleColors.recognized,
        consoleColors.info
    );
}

/**
 * @param source {number}
 * @param control {number}
 * @param destination {number}
 * @param transform {number}
 * @param value {number}
 * @returns {Modulator|undefined}
 */
export function getSF2ModulatorFromArticulator(
    source,
    control,
    destination,
    transform,
    value
)
{
    // modulatorConverterDebug(
    //     source,
    //     control,
    //     destination,
    //     value,
    //     transform
    // );
    // check for special combinations
    const specialDestination = checkForSpecialDLSCombo(source, destination);
    /**
     * @type {generatorTypes}
     */
    let destinationGenerator;
    /**
     * @type {{enum: number, isCC: boolean}}
     */
    let sf2Source;
    let swapSources = false;
    let isSourceNoController = false;
    let newValue = value;
    if (specialDestination === undefined)
    {
        // determine destination
        const sf2GenDestination = getSF2GeneratorFromDLS(destination, value);
        if (sf2GenDestination === undefined)
        {
            // cannot be a valid modulator
            SpessaSynthWarn(`Invalid destination: ${destination}`);
            return undefined;
        }
        /**
         * @type {generatorTypes}
         */
        destinationGenerator = sf2GenDestination;
        if (sf2GenDestination.newAmount !== undefined)
        {
            newValue = sf2GenDestination.newAmount;
            destinationGenerator = sf2GenDestination.gen;
        }
        sf2Source = getSF2SourceFromDLS(source);
        if (sf2Source === undefined)
        {
            // cannot be a valid modulator
            SpessaSynthWarn(`Invalid source: ${source}`);
            return undefined;
        }
    }
    else
    {
        destinationGenerator = specialDestination;
        swapSources = true;
        sf2Source = { enum: modulatorSources.noController, isCC: false };
        isSourceNoController = true;
    }
    let sf2SecondSource = getSF2SourceFromDLS(control);
    if (sf2SecondSource === undefined)
    {
        // cannot be a valid modulator
        SpessaSynthWarn(`Invalid control: ${control}`);
        return undefined;
    }
    
    // get transforms and final enums
    let sourceEnumFinal;
    if (isSourceNoController)
    {
        // we force it into this state because before it was some strange value,
        // like vibrato lfo bipolar, for example,
        // since we turn it into NoController -> vibLfoToPitch,
        // the result is the same and bipolar controller is technically 0
        sourceEnumFinal = 0x0;
    }
    else
    {
        // output transform is ignored as it's not a thing in sfont format
        // unless the curve type of source is linear, then output is copied
        const outputTransform = transform & 0b1111;
        // source curve type maps to a desfont curve type in section 2.10, table 9
        let sourceTransform = (transform >> 10) & 0b1111;
        if (sourceTransform === modulatorCurveTypes.linear && outputTransform !== modulatorCurveTypes.linear)
        {
            sourceTransform = outputTransform;
        }
        const sourceIsBipolar = (transform >> 14) & 1;
        let sourceIsNegative = (transform >> 15) & 1;
        // special case: for attenuation, invert source (dls gain is the opposite of sf2 attenuation)
        if (destinationGenerator === generatorTypes.initialAttenuation)
        {
            // if the value is negative, the source shall be negative!
            // why?
            // IDK, it makes it work with ROCK.RMI and NOKIA_S30.dls
            if (value < 0)
            {
                sourceIsNegative = 1;
            }
        }
        sourceEnumFinal = getModSourceEnum(
            sourceTransform,
            sourceIsBipolar,
            sourceIsNegative,
            sf2Source.isCC,
            sf2Source.enum
        );
    }
    
    // a corrupted rendition of gm.dls was found under
    // https://sembiance.com/fileFormatSamples/audio/downloadableSoundBank/
    // which specifies a whopping -32,768 decibels of attenuation
    if (destinationGenerator === generatorTypes.initialAttenuation)
    {
        newValue = Math.max(960, Math.min(0, newValue));
    }
    
    const secSourceTransform = (transform >> 4) & 0b1111;
    const secSourceIsBipolar = (transform >> 8) & 1;
    const secSourceIsNegative = transform >> 9 & 1;
    let secSourceEnumFinal = getModSourceEnum(
        secSourceTransform,
        secSourceIsBipolar,
        secSourceIsNegative,
        sf2SecondSource.isCC,
        sf2SecondSource.enum
    );
    
    if (swapSources)
    {
        const temp = secSourceEnumFinal;
        secSourceEnumFinal = sourceEnumFinal;
        sourceEnumFinal = temp;
    }
    
    // return the modulator!
    return new Modulator(
        sourceEnumFinal,
        secSourceEnumFinal,
        destinationGenerator,
        newValue,
        0x0
    );
    
}