import { midiControllers } from "../../../midi/midi_message.js";
import { DLSSources } from "../../dls/dls_sources.js";
import { modulatorCurveTypes, modulatorSources } from "../modulator.js";
import { generatorTypes } from "../generator.js";
import { DLSDestinations } from "../../dls/dls_destinations.js";
import { Articulator } from "./articulator.js";
import { SpessaSynthWarn } from "../../../utils/loggin.js";


/**
 * @param cc {boolean}
 * @param index {number}
 * @returns {number|undefined}
 */
function getDLSSourceFromSf2Source(cc, index)
{
    if (cc)
    {
        switch (index)
        {
            default:
                // DLS supports limited controllers
                return undefined;
            
            case midiControllers.modulationWheel:
                return DLSSources.modulationWheel;
            case midiControllers.mainVolume:
                return DLSSources.volume;
            case midiControllers.pan:
                return DLSSources.pan;
            case midiControllers.expressionController:
                return DLSSources.expression;
            case midiControllers.chorusDepth:
                return DLSSources.chorus;
            case midiControllers.reverbDepth:
                return DLSSources.reverb;
        }
    }
    else
    {
        switch (index)
        {
            default:
                // cannot be a DLS articulator
                return undefined;
            
            case modulatorSources.noteOnKeyNum:
                return DLSSources.keyNum;
            case modulatorSources.noteOnVelocity:
                return DLSSources.velocity;
            case modulatorSources.noController:
                return DLSSources.none;
            case modulatorSources.polyPressure:
                return DLSSources.polyPressure;
            case modulatorSources.channelPressure:
                return DLSSources.channelPressure;
            case modulatorSources.pitchWheel:
                return DLSSources.pitchWheel;
            case modulatorSources.pitchWheelRange:
                return DLSSources.pitchWheelRange;
        }
    }
}

/**
 * @param dest {number}
 * @param amount {number}
 * @returns {number|undefined|{dest: number, amount: number}}
 */
function getDLSDestinationFromSf2(dest, amount)
{
    switch (dest)
    {
        default:
            return undefined;
        
        case generatorTypes.initialAttenuation:
            // the amount does not get EMU corrected here, as this only applies to modulator attenuation
            // the generator (affected) attenuation is handled in wsmp.
            return { dest: DLSDestinations.gain, amount: -amount };
        case generatorTypes.fineTune:
            return DLSDestinations.pitch;
        case generatorTypes.pan:
            return DLSDestinations.pan;
        case generatorTypes.keyNum:
            return DLSDestinations.keyNum;
        
        case generatorTypes.reverbEffectsSend:
            return DLSDestinations.reverbSend;
        case generatorTypes.chorusEffectsSend:
            return DLSDestinations.chorusSend;
        
        case generatorTypes.freqModLFO:
            return DLSDestinations.modLfoFreq;
        case generatorTypes.delayModLFO:
            return DLSDestinations.modLfoDelay;
        
        case generatorTypes.delayVibLFO:
            return DLSDestinations.vibLfoDelay;
        case generatorTypes.freqVibLFO:
            return DLSDestinations.vibLfoFreq;
        
        case generatorTypes.delayVolEnv:
            return DLSDestinations.volEnvDelay;
        case generatorTypes.attackVolEnv:
            return DLSDestinations.volEnvAttack;
        case generatorTypes.holdVolEnv:
            return DLSDestinations.volEnvHold;
        case generatorTypes.decayVolEnv:
            return DLSDestinations.volEnvDecay;
        case generatorTypes.sustainVolEnv:
            return { dest: DLSDestinations.volEnvSustain, amount: 1000 - amount };
        case generatorTypes.releaseVolEnv:
            return DLSDestinations.volEnvRelease;
        
        case generatorTypes.delayModEnv:
            return DLSDestinations.modEnvDelay;
        case generatorTypes.attackModEnv:
            return DLSDestinations.modEnvAttack;
        case generatorTypes.holdModEnv:
            return DLSDestinations.modEnvHold;
        case generatorTypes.decayModEnv:
            return DLSDestinations.modEnvDecay;
        case generatorTypes.sustainModEnv:
            return { dest: DLSDestinations.modEnvSustain, amount: 1000 - amount };
        case generatorTypes.releaseModEnv:
            return DLSDestinations.modEnvRelease;
        
        case generatorTypes.initialFilterFc:
            return DLSDestinations.filterCutoff;
        case generatorTypes.initialFilterQ:
            return DLSDestinations.filterQ;
    }
}

/**
 * @param dest {number}
 * @param amt {number}
 * @returns {{source: DLSSources, dest: DLSDestinations, amt: number, isBipolar: boolean}|undefined}
 */
function checkSF2SpecialCombos(dest, amt)
{
    
    switch (dest)
    {
        default:
            return undefined;
        // mod env
        case generatorTypes.modEnvToFilterFc:
            return { source: DLSSources.modEnv, dest: DLSDestinations.filterCutoff, amt: amt, isBipolar: false };
        case generatorTypes.modEnvToPitch:
            return { source: DLSSources.modEnv, dest: DLSDestinations.pitch, amt: amt, isBipolar: false };
        
        // mod lfo
        case generatorTypes.modLfoToFilterFc:
            return { source: DLSSources.modLfo, dest: DLSDestinations.filterCutoff, amt: amt, isBipolar: true };
        case generatorTypes.modLfoToVolume:
            return { source: DLSSources.modLfo, dest: DLSDestinations.gain, amt: amt, isBipolar: true };
        case generatorTypes.modLfoToPitch:
            return { source: DLSSources.modLfo, dest: DLSDestinations.pitch, amt: amt, isBipolar: true };
        
        // vib lfo
        case generatorTypes.vibLfoToPitch:
            return { source: DLSSources.vibratoLfo, dest: DLSDestinations.pitch, amt: amt, isBipolar: true };
        
        // key to something
        case generatorTypes.keyNumToVolEnvHold:
            return {
                source: DLSSources.keyNum,
                dest: DLSDestinations.volEnvHold,
                amt: amt,
                isBipolar: true
            };
        case generatorTypes.keyNumToVolEnvDecay:
            return {
                source: DLSSources.keyNum,
                dest: DLSDestinations.volEnvDecay,
                amt: amt,
                isBipolar: true
            };
        case generatorTypes.keyNumToModEnvHold:
            return {
                source: DLSSources.keyNum,
                dest: DLSDestinations.modEnvHold,
                amt: amt,
                isBipolar: true
            };
        case generatorTypes.keyNumToModEnvDecay:
            return {
                source: DLSSources.keyNum,
                dest: DLSDestinations.modEnvDecay,
                amt: amt,
                isBipolar: true
            };
        
        // Scale tuning is implemented in DLS via an articulator:
        // keyNum to relative pitch at 12,800 cents.
        // Change that to scale tuning * 128.
        // Therefore, a regular scale is still 12,800, half is 6400, etc.
        case generatorTypes.scaleTuning:
            return {
                source: DLSSources.keyNum,
                dest: DLSDestinations.pitch,
                amt: amt * 128,
                isBipolar: false // according to table 4, this should be false.
            };
    }
}

/**
 * @param gen {Generator}
 * @returns {Articulator|undefined}
 */
export function getDLSArticulatorFromSf2Generator(gen)
{
    const dest = getDLSDestinationFromSf2(gen.generatorType, gen.generatorValue);
    let destination = dest;
    let source = 0;
    let amount = gen.generatorValue;
    if (dest?.amount !== undefined)
    {
        amount = dest.amount;
        destination = dest.dest;
    }
    // check for special combo
    const combo = checkSF2SpecialCombos(gen.generatorType, gen.generatorValue);
    if (combo !== undefined)
    {
        amount = combo.amt;
        destination = combo.dest;
        source = combo.source;
    }
    else if (destination === undefined)
    {
        SpessaSynthWarn(`Invalid generator type: ${gen.generatorType}`);
        return undefined;
    }
    return new Articulator(
        source,
        0,
        destination,
        amount,
        0
    );
}


/**
 * @param mod {Modulator}
 * @returns {Articulator|undefined}
 */
export function getDLSArticulatorFromSf2Modulator(mod)
{
    if (mod.transformType !== 0)
    {
        SpessaSynthWarn("Other transform types are not supported.");
        return undefined;
    }
    let source = getDLSSourceFromSf2Source(mod.sourceUsesCC, mod.sourceIndex);
    let sourceTransformType = mod.sourceCurveType;
    let sourceBipolar = mod.sourcePolarity;
    let sourceDirection = mod.sourceDirection;
    if (source === undefined)
    {
        SpessaSynthWarn(`Invalid source: ${mod.sourceIndex}, CC: ${mod.sourceUsesCC}`);
        return undefined;
    }
    // Attenuation is the opposite of gain. Invert.
    if (mod.modulatorDestination === generatorTypes.initialAttenuation)
    {
        sourceDirection = sourceDirection === 1 ? 0 : 1;
    }
    let control = getDLSSourceFromSf2Source(mod.secSrcUsesCC, mod.secSrcIndex);
    let controlTransformType = mod.secSrcCurveType;
    let controlBipolar = mod.secSrcPolarity;
    let controlDirection = mod.secSrcDirection;
    if (control === undefined)
    {
        SpessaSynthWarn(`Invalid secondary source: ${mod.secSrcIndex}, CC: ${mod.secSrcUsesCC}`);
        return undefined;
    }
    let dlsDestinationFromSf2 = getDLSDestinationFromSf2(mod.modulatorDestination, mod.transformAmount);
    let destination = dlsDestinationFromSf2;
    let amt = mod.transformAmount;
    if (dlsDestinationFromSf2?.dest !== undefined)
    {
        destination = dlsDestinationFromSf2.dest;
        amt = dlsDestinationFromSf2.amount;
    }
    const specialCombo = checkSF2SpecialCombos(mod.modulatorDestination, mod.transformAmount);
    if (specialCombo !== undefined)
    {
        amt = specialCombo.amt;
        // move the source to control
        control = source;
        controlTransformType = sourceTransformType;
        controlBipolar = sourceBipolar;
        controlDirection = sourceDirection;
        
        // set source as static as it's either: env, lfo or key num
        sourceTransformType = modulatorCurveTypes.linear;
        sourceBipolar = specialCombo.isBipolar ? 1 : 0;
        sourceDirection = 0;
        source = specialCombo.source;
        destination = specialCombo.dest;
    }
    else if (destination === undefined)
    {
        SpessaSynthWarn(`Invalid destination: ${mod.modulatorDestination}`);
        return undefined;
    }
    
    // source curve type maps to a desfont curve type in section 2.10, table 9
    let transform = 0;
    transform |= controlTransformType << 4;
    transform |= controlBipolar << 8;
    transform |= controlDirection << 9;
    
    // use the source curve in output transform
    transform |= sourceTransformType;
    transform |= sourceBipolar << 14;
    transform |= sourceDirection << 15;
    return new Articulator(
        source,
        control,
        destination,
        amt,
        transform
    );
}