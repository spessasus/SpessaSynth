import { Modulator } from "../modulator.js";
import { BasicInstrumentZone } from "../basic_zones.js";
import { Generator, generatorLimits, generatorTypes } from "../generator.js";

const notGlobalizedTypes = new Set([
    generatorTypes.velRange,
    generatorTypes.keyRange,
    generatorTypes.instrument,
    generatorTypes.exclusiveClass,
    generatorTypes.endOper,
    generatorTypes.sampleModes,
    generatorTypes.startloopAddrsOffset,
    generatorTypes.startloopAddrsCoarseOffset,
    generatorTypes.endloopAddrsOffset,
    generatorTypes.endloopAddrsCoarseOffset,
    generatorTypes.startAddrsOffset,
    generatorTypes.startAddrsCoarseOffset,
    generatorTypes.endAddrOffset,
    generatorTypes.endAddrsCoarseOffset,
    generatorTypes.initialAttenuation, // written into wsmp, there's no global wsmp
    generatorTypes.fineTune,           // written into wsmp, there's no global wsmp
    generatorTypes.coarseTune,         // written into wsmp, there's no global wsmp
    generatorTypes.keyNumToVolEnvHold, // KEY TO SOMETHING:
    generatorTypes.keyNumToVolEnvDecay,// cannot be globalized as they modify their respective generators
    generatorTypes.keyNumToModEnvHold, // (for example, keyNumToVolEnvDecay modifies VolEnvDecay)
    generatorTypes.keyNumToModEnvDecay
]);

/**
 * Combines preset zones
 * @param preset {BasicPreset}
 * @param globalize {boolean}
 * @returns {BasicInstrumentZone[]}
 */
export function combineZones(preset, globalize = true)
{
    /**
     * @param main {Generator[]}
     * @param adder {Generator[]}
     */
    function addUnique(main, adder)
    {
        main.push(...adder.filter(g => !main.find(mg => mg.generatorType === g.generatorType)));
    }
    
    /**
     * @param r1 {SoundFontRange}
     * @param r2 {SoundFontRange}
     * @returns {SoundFontRange}
     */
    function subtractRanges(r1, r2)
    {
        return { min: Math.max(r1.min, r2.min), max: Math.min(r1.max, r2.max) };
    }
    
    /**
     * @param main {Modulator[]}
     * @param adder {Modulator[]}
     */
    function addUniqueMods(main, adder)
    {
        main.push(...adder.filter(m => !main.find(mm => Modulator.isIdentical(m, mm))));
    }
    
    /**
     * @type {BasicInstrumentZone[]}
     */
    const finalZones = [];
    
    /**
     * @type {Generator[]}
     */
    const globalPresetGenerators = [];
    /**
     * @type {Modulator[]}
     */
    const globalPresetModulators = [];
    let globalPresetKeyRange = { min: 0, max: 127 };
    let globalPresetVelRange = { min: 0, max: 127 };
    
    // find the global zone and apply ranges, generators, and modulators
    const globalPresetZone = preset.presetZones.find(z => z.isGlobal);
    if (globalPresetZone)
    {
        globalPresetGenerators.push(...globalPresetZone.generators);
        globalPresetModulators.push(...globalPresetZone.modulators);
        globalPresetKeyRange = globalPresetZone.keyRange;
        globalPresetVelRange = globalPresetZone.velRange;
    }
    // for each non-global preset zone
    for (const presetZone of preset.presetZones)
    {
        if (presetZone.isGlobal)
        {
            continue;
        }
        // use global ranges if not provided
        let presetZoneKeyRange = presetZone.keyRange;
        if (!presetZone.hasKeyRange)
        {
            presetZoneKeyRange = globalPresetKeyRange;
        }
        let presetZoneVelRange = presetZone.velRange;
        if (!presetZone.hasVelRange)
        {
            presetZoneVelRange = globalPresetVelRange;
        }
        // add unique generators and modulators from the global zone
        const presetGenerators = presetZone.generators.map(g => new Generator(g.generatorType, g.generatorValue));
        addUnique(presetGenerators, globalPresetGenerators);
        const presetModulators = [...presetZone.modulators];
        addUniqueMods(presetModulators, globalPresetModulators);
        
        const iZones = presetZone.instrument.instrumentZones;
        /**
         * @type {Generator[]}
         */
        const globalInstGenerators = [];
        /**
         * @type {Modulator[]}
         */
        const globalInstModulators = [];
        let globalInstKeyRange = { min: 0, max: 127 };
        let globalInstVelRange = { min: 0, max: 127 };
        const globalInstZone = iZones.find(z => z.isGlobal);
        if (globalInstZone)
        {
            globalInstGenerators.push(...globalInstZone.generators);
            globalInstModulators.push(...globalInstZone.modulators);
            globalInstKeyRange = globalInstZone.keyRange;
            globalInstVelRange = globalInstZone.velRange;
        }
        // for each non-global instrument zone
        for (const instZone of iZones)
        {
            if (instZone.isGlobal)
            {
                continue;
            }
            // use global ranges if not provided
            let instZoneKeyRange = instZone.keyRange;
            if (!instZone.hasKeyRange)
            {
                instZoneKeyRange = globalInstKeyRange;
            }
            let instZoneVelRange = instZone.velRange;
            if (!instZone.hasVelRange)
            {
                instZoneVelRange = globalInstVelRange;
            }
            instZoneKeyRange = subtractRanges(instZoneKeyRange, presetZoneKeyRange);
            instZoneVelRange = subtractRanges(instZoneVelRange, presetZoneVelRange);
            
            // if either of the zones is out of range (i.e.m min larger than the max),
            // then we discard that zone
            if (instZoneKeyRange.max < instZoneKeyRange.min || instZoneVelRange.max < instZoneVelRange.min)
            {
                continue;
            }
            
            // add unique generators and modulators from the global zone
            const instGenerators = instZone.generators.map(g => new Generator(g.generatorType, g.generatorValue));
            addUnique(instGenerators, globalInstGenerators);
            const instModulators = [...instZone.modulators];
            addUniqueMods(instModulators, globalInstModulators);
            
            /**
             * sum preset modulators to instruments (amount) sf spec page 54
             * @type {Modulator[]}
             */
            const finalModList = [...instModulators];
            for (const mod of presetModulators)
            {
                const identicalInstMod = finalModList.findIndex(
                    m => Modulator.isIdentical(mod, m));
                if (identicalInstMod !== -1)
                {
                    // sum the amounts
                    // (this makes a new modulator
                    // because otherwise it would overwrite the one in the soundfont!
                    finalModList[identicalInstMod] = finalModList[identicalInstMod].sumTransform(
                        mod);
                }
                else
                {
                    finalModList.push(mod);
                }
            }
            
            // clone the generators as the values are modified during DLS conversion (keyNumToSomething)
            let finalGenList = instGenerators.map(g => new Generator(g.generatorType, g.generatorValue));
            for (const gen of presetGenerators)
            {
                if (gen.generatorType === generatorTypes.velRange ||
                    gen.generatorType === generatorTypes.keyRange ||
                    gen.generatorType === generatorTypes.instrument ||
                    gen.generatorType === generatorTypes.endOper ||
                    gen.generatorType === generatorTypes.sampleModes)
                {
                    continue;
                }
                const identicalInstGen = instGenerators.findIndex(g => g.generatorType === gen.generatorType);
                if (identicalInstGen !== -1)
                {
                    // if exists, sum to that generator
                    const newAmount = finalGenList[identicalInstGen].generatorValue + gen.generatorValue;
                    finalGenList[identicalInstGen] = new Generator(gen.generatorType, newAmount);
                }
                else
                {
                    // if not, sum to the default generator
                    const newAmount = generatorLimits[gen.generatorType].def + gen.generatorValue;
                    finalGenList.push(new Generator(gen.generatorType, newAmount));
                }
            }
            
            // remove unwanted
            finalGenList = finalGenList.filter(g =>
                g.generatorType !== generatorTypes.sampleID &&
                g.generatorType !== generatorTypes.keyRange &&
                g.generatorType !== generatorTypes.velRange &&
                g.generatorType !== generatorTypes.endOper &&
                g.generatorType !== generatorTypes.instrument &&
                g.generatorValue !== generatorLimits[g.generatorType].def
            );
            
            // create the zone and copy over values
            const zone = new BasicInstrumentZone();
            zone.keyRange = instZoneKeyRange;
            zone.velRange = instZoneVelRange;
            if (zone.keyRange.min === 0 && zone.keyRange.max === 127)
            {
                zone.keyRange.min = -1;
            }
            if (zone.velRange.min === 0 && zone.velRange.max === 127)
            {
                zone.velRange.min = -1;
            }
            zone.isGlobal = false;
            zone.sample = instZone.sample;
            zone.generators = finalGenList;
            zone.modulators = finalModList;
            finalZones.push(zone);
        }
    }
    
    if (globalize)
    {
        // create a global zone and add repeating generators to it
        // also modulators
        const globalZone = new BasicInstrumentZone();
        globalZone.isGlobal = true;
        // iterate over every type of generator
        for (let checkedType = 0; checkedType < 58; checkedType++)
        {
            // not these though
            if (notGlobalizedTypes.has(checkedType))
            {
                continue;
            }
            /**
             * @type {Object<string, number>}
             */
            let occurencesForValues = {};
            const defaultForChecked = generatorLimits[checkedType]?.def || 0;
            occurencesForValues[defaultForChecked] = 0;
            for (const z of finalZones)
            {
                const gen = z.generators.find(g => g.generatorType === checkedType);
                if (gen)
                {
                    const value = gen.generatorValue;
                    if (occurencesForValues[value] === undefined)
                    {
                        occurencesForValues[value] = 1;
                    }
                    else
                    {
                        occurencesForValues[value]++;
                    }
                }
                else
                {
                    occurencesForValues[defaultForChecked]++;
                }
                
                // if the checked type has the keyNumTo something generator set, it cannot be globalized.
                let relativeCounterpart;
                switch (checkedType)
                {
                    default:
                        continue;
                    
                    case generatorTypes.decayVolEnv:
                        relativeCounterpart = generatorTypes.keyNumToVolEnvDecay;
                        break;
                    case generatorTypes.holdVolEnv:
                        relativeCounterpart = generatorTypes.keyNumToVolEnvHold;
                        break;
                    case generatorTypes.decayModEnv:
                        relativeCounterpart = generatorTypes.keyNumToModEnvDecay;
                        break;
                    case generatorTypes.holdModEnv:
                        relativeCounterpart = generatorTypes.keyNumToModEnvHold;
                }
                const relative = z.generators.find(g => g.generatorType === relativeCounterpart);
                if (relative !== undefined)
                {
                    occurencesForValues = {};
                    break;
                }
            }
            // if at least one occurrence, find the most used one and add it to global
            if (Object.keys(occurencesForValues).length > 0)
            {
                // [value, occurrences]
                const valueToGlobalize = Object.entries(occurencesForValues).reduce((max, curr) =>
                {
                    if (max[1] < curr[1])
                    {
                        return curr;
                    }
                    return max;
                }, [0, 0]);
                const targetValue = parseInt(valueToGlobalize[0]);
                
                // if the global value is the default value just remove it, no need to add it
                if (targetValue !== defaultForChecked)
                {
                    globalZone.generators.push(new Generator(checkedType, targetValue));
                }
                // remove from the zones
                finalZones.forEach(z =>
                {
                    const gen = z.generators.findIndex(g =>
                        g.generatorType === checkedType);
                    if (gen !== -1)
                    {
                        if (z.generators[gen].generatorValue === targetValue)
                        {
                            // That exact value exists. Since it's global now, remove it
                            z.generators.splice(gen, 1);
                        }
                    }
                    else
                    {
                        // That type does not exist at all here.
                        // Since we're globalizing, we need to add the default here.
                        if (targetValue !== defaultForChecked)
                        {
                            z.generators.push(new Generator(checkedType, defaultForChecked));
                        }
                    }
                });
            }
        }
        
        // globalize only modulators that exist in all zones
        const firstZone = finalZones.find(z => !z.isGlobal);
        const modulators = firstZone.modulators.map(m => Modulator.copy(m));
        for (const checkedModulator of modulators)
        {
            let existsForAllZones = true;
            for (const zone of finalZones)
            {
                if (zone.isGlobal || !existsForAllZones)
                {
                    continue;
                }
                // check if that zone has an existing modulator
                const mod = zone.modulators.find(m => Modulator.isIdentical(m, checkedModulator));
                if (!mod)
                {
                    // does not exist for this zone, so it's not global.
                    existsForAllZones = false;
                }
                // exists.
                
            }
            if (existsForAllZones === true)
            {
                globalZone.modulators.push(Modulator.copy(checkedModulator));
                // delete it from local zones.
                for (const zone of finalZones)
                {
                    const modulator = zone.modulators.find(m => Modulator.isIdentical(m, checkedModulator));
                    // Check if the amount is correct.
                    // If so, delete it since it's global.
                    // If not, then it will simply override global as it's identical.
                    if (modulator.transformAmount === checkedModulator.transformAmount)
                    {
                        zone.modulators.splice(zone.modulators.indexOf(modulator), 1);
                    }
                }
            }
        }
        finalZones.splice(0, 0, globalZone);
    }
    return finalZones;
}