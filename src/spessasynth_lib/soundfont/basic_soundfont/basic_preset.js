/**
 * @typedef {{
 *  instrumentGenerators: Generator[],
 *  presetGenerators: Generator[],
 *  modulators: Modulator[],
 *  sample: BasicSample,
 *  sampleID: number,
 * }} SampleAndGenerators
 */
import { generatorTypes } from "./generator.js";
import { Modulator } from "./modulator.js";

export class BasicPreset
{
    /**
     * @param modulators {Modulator[]}
     */
    constructor(modulators)
    {
        /**
         * The preset's name
         * @type {string}
         */
        this.presetName = "";
        /**
         * The preset's MIDI program number
         * @type {number}
         */
        this.program = 0;
        /**
         * The preset's MIDI bank number
         * @type {number}
         */
        this.bank = 0;
        
        /**
         * The preset's zones
         * @type {BasicPresetZone[]}
         */
        this.presetZones = [];
        
        /**
         * SampleID offset for this preset
         * @type {number}
         */
        this.sampleIDOffset = 0;
        
        /**
         * Stores already found getSamplesAndGenerators for reuse
         * @type {SampleAndGenerators[][][]}
         */
        this.foundSamplesAndGenerators = [];
        for (let i = 0; i < 128; i++)
        {
            this.foundSamplesAndGenerators[i] = [];
        }
        
        /**
         * unused metadata
         * @type {number}
         */
        this.library = 0;
        /**
         * unused metadata
         * @type {number}
         */
        this.genre = 0;
        /**
         * unused metadata
         * @type {number}
         */
        this.morphology = 0;
        
        /**
         * Default modulators
         * @type {Modulator[]}
         */
        this.defaultModulators = modulators;
    }
    
    deletePreset()
    {
        this.presetZones.forEach(z => z.deleteZone());
        this.presetZones.length = 0;
    }
    
    /**
     * @param index {number}
     */
    deleteZone(index)
    {
        this.presetZones[index].deleteZone();
        this.presetZones.splice(index, 1);
    }
    
    // noinspection JSUnusedGlobalSymbols
    /**
     * Preloads all samples (async)
     */
    preload(keyMin, keyMax)
    {
        for (let key = keyMin; key < keyMax + 1; key++)
        {
            for (let velocity = 0; velocity < 128; velocity++)
            {
                this.getSamplesAndGenerators(key, velocity).forEach(samandgen =>
                {
                    if (!samandgen.sample.isSampleLoaded)
                    {
                        samandgen.sample.getAudioData();
                    }
                });
            }
        }
    }
    
    /**
     * Preloads a specific key/velocity combo
     * @param key {number}
     * @param velocity {number}
     */
    preloadSpecific(key, velocity)
    {
        this.getSamplesAndGenerators(key, velocity).forEach(samandgen =>
        {
            if (!samandgen.sample.isSampleLoaded)
            {
                samandgen.sample.getAudioData();
            }
        });
    }
    
    /**
     * Returns generatorTranslator and generators for given note
     * @param {number} midiNote
     * @param {number} velocity
     * @returns {SampleAndGenerators[]}
     */
    getSamplesAndGenerators(midiNote, velocity)
    {
        // check if we already have a computed result
        const memo = this.foundSamplesAndGenerators[midiNote][velocity];
        if (memo)
        {
            return memo;
        }
        if (this.presetZones.length === 0)
        {
            return [];
        }
        
        const DEFAULT_RANGE = { min: 0, max: 127 };
        
        const isInRange = (range, number) => number >= range.min && number <= range.max;
        /**
         * @param main {Generator[]}
         * @param adder {Generator[]}
         */
        const addUnique = (main, adder) =>
        {
            const keys = new Set(main.map(g => g.generatorType));
            for (const item of adder)
            {
                if (!keys.has(item.generatorType))
                {
                    keys.add(item.generatorType);
                    main.push(item);
                }
            }
        };
        
        /**
         * @param main {Modulator[]}
         * @param adder {Modulator[]}
         */
        const addUniqueMods = (main, adder) =>
        {
            for (const mod of adder)
            {
                if (!main.some(m => Modulator.isIdentical(mod, m)))
                {
                    main.push(mod);
                }
            }
        };
        
        const results = [];
        
        // global preset zone (first zone) information
        const globalZone = this.presetZones[0];
        const globalPresetGenerators = globalZone.isGlobal ? [...globalZone.generators] : [];
        const globalPresetModulators = globalZone.isGlobal ? [...globalZone.modulators] : [];
        const globalKeyRange = globalZone.isGlobal ? globalZone.keyRange : DEFAULT_RANGE;
        const globalVelRange = globalZone.isGlobal ? globalZone.velRange : DEFAULT_RANGE;
        
        // filter preset zones that are in range and not global
        const presetZonesInRange = this.presetZones.filter(zone =>
            !zone.isGlobal &&
            isInRange(zone.hasKeyRange ? zone.keyRange : globalKeyRange, midiNote) &&
            isInRange(zone.hasVelRange ? zone.velRange : globalVelRange, velocity)
        );
        
        for (const zone of presetZonesInRange)
        {
            if (zone.instrument.instrumentZones.length === 0)
            {
                continue;
            }
            
            const presetGenerators = [...zone.generators];
            const presetModulators = [...zone.modulators];
            addUnique(presetGenerators, globalPresetGenerators);
            addUniqueMods(presetModulators, globalPresetModulators);
            
            // for instrument zones, use the first zone as the global defaults
            const firstInstZone = zone.instrument.instrumentZones[0];
            const globalInstrumentGenerators = firstInstZone.isGlobal ? [...firstInstZone.generators] : [];
            const globalInstrumentModulators = firstInstZone.isGlobal ? [...firstInstZone.modulators] : [];
            const instrumentGlobalKeyRange = firstInstZone.isGlobal ? firstInstZone.keyRange : DEFAULT_RANGE;
            const instrumentGlobalVelRange = firstInstZone.isGlobal ? firstInstZone.velRange : DEFAULT_RANGE;
            
            // filter instrument zones that are in range and not global
            const instrumentZonesInRange = zone.instrument.instrumentZones.filter(instZone =>
                !instZone.isGlobal &&
                isInRange(instZone.hasKeyRange ? instZone.keyRange : instrumentGlobalKeyRange, midiNote) &&
                isInRange(instZone.hasVelRange ? instZone.velRange : instrumentGlobalVelRange, velocity)
            );
            
            for (const instZone of instrumentZonesInRange)
            {
                // clone the generators and modulators to the wonders of JavaScript
                const instrumentGenerators = [...instZone.generators];
                const instrumentModulators = [...instZone.modulators];
                
                // merge in global instrument generators and modulators
                addUnique(instrumentGenerators, globalInstrumentGenerators);
                addUniqueMods(instrumentModulators, globalInstrumentModulators);
                addUniqueMods(instrumentModulators, this.defaultModulators);
                
                // combine instrument modulators with preset modulators by summing matching ones
                const finalModulators = [...instrumentModulators];
                for (const mod of presetModulators)
                {
                    const idx = finalModulators.findIndex(m => Modulator.isIdentical(mod, m));
                    if (idx !== -1)
                    {
                        finalModulators[idx] = finalModulators[idx].sumTransform(mod);
                    }
                    else
                    {
                        finalModulators.push(mod);
                    }
                }
                
                results.push({
                    instrumentGenerators,
                    presetGenerators,
                    modulators: finalModulators,
                    sample: instZone.sample,
                    sampleID: instZone.generators.find(g => g.generatorType === generatorTypes.sampleID).generatorValue
                });
            }
        }
        
        // memorize and return the computed result
        this.foundSamplesAndGenerators[midiNote][velocity] = results;
        return results;
    }
    
}