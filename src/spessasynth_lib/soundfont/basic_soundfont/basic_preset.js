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
import { isXGDrums } from "../../utils/xg_hacks.js";

export class BasicPreset
{
    /**
     * The parent soundbank instance
     * Currently used for determining default modulators and XG status
     * @type {BasicSoundBank}
     */
    parentSoundBank;
    
    /**
     * The preset's name
     * @type {string}
     */
    presetName = "";
    
    /**
     * The preset's MIDI program number
     * @type {number}
     */
    program = 0;
    
    /**
     * The preset's MIDI bank number
     * @type {number}
     */
    bank = 0;
    
    /**
     * The preset's zones
     * @type {BasicPresetZone[]}
     */
    presetZones = [];
    
    /**
     * Stores already found getSamplesAndGenerators for reuse
     * @type {SampleAndGenerators[][][]}
     */
    foundSamplesAndGenerators = [];
    
    /**
     * unused metadata
     * @type {number}
     */
    library = 0;
    /**
     * unused metadata
     * @type {number}
     */
    genre = 0;
    /**
     * unused metadata
     * @type {number}
     */
    morphology = 0;
    
    /**
     * Creates a new preset representation
     * @param parentSoundBank {BasicSoundBank}
     */
    constructor(parentSoundBank)
    {
        this.parentSoundBank = parentSoundBank;
        for (let i = 0; i < 128; i++)
        {
            this.foundSamplesAndGenerators[i] = [];
        }
    }
    
    /**
     * @param allowXG {boolean}
     * @param allowSFX {boolean}
     * @returns {boolean}
     */
    isDrumPreset(allowXG, allowSFX = false)
    {
        const xg = allowXG && this.parentSoundBank.isXGBank;
        // sfx is not cool
        return this.bank === 128 || (
            xg &&
            (isXGDrums(this.bank) && (this.bank !== 126 || allowSFX))
        );
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
     * @param midiNote {number}
     * @param velocity {number}
     * @returns {SampleAndGenerators[]}
     */
    getSamplesAndGenerators(midiNote, velocity)
    {
        const memorized = this.foundSamplesAndGenerators[midiNote][velocity];
        if (memorized)
        {
            return memorized;
        }
        
        if (this.presetZones.length < 1)
        {
            return [];
        }
        
        /**
         * @param range {SoundFontRange}
         * @param number {number}
         * @returns {boolean}
         */
        function isInRange(range, number)
        {
            return number >= range.min && number <= range.max;
        }
        
        /**
         * @param main {Generator[]}
         * @param adder {Generator[]}
         */
        function addUnique(main, adder)
        {
            main.push(...adder.filter(g => !main.find(mg => mg.generatorType === g.generatorType)));
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
         * @type {SampleAndGenerators[]}
         */
        let parsedGeneratorsAndSamples = [];
        
        /**
         * global zone is always first, so it or nothing
         * @type {Generator[]}
         */
        let globalPresetGenerators = this.presetZones[0].isGlobal ? [...this.presetZones[0].generators] : [];
        
        /**
         * @type {Modulator[]}
         */
        let globalPresetModulators = this.presetZones[0].isGlobal ? [...this.presetZones[0].modulators] : [];
        const globalKeyRange = this.presetZones[0].isGlobal ? this.presetZones[0].keyRange : { min: 0, max: 127 };
        const globalVelRange = this.presetZones[0].isGlobal ? this.presetZones[0].velRange : { min: 0, max: 127 };
        
        // find the preset zones in range
        let presetZonesInRange = this.presetZones.filter(currentZone =>
            (
                isInRange(
                    currentZone.hasKeyRange ? currentZone.keyRange : globalKeyRange,
                    midiNote
                )
                &&
                isInRange(
                    currentZone.hasVelRange ? currentZone.velRange : globalVelRange,
                    velocity
                )
            ) && !currentZone.isGlobal);
        
        presetZonesInRange.forEach(zone =>
        {
            // the global zone is already taken into account earlier
            if (zone.instrument.instrumentZones.length < 1)
            {
                return;
            }
            let presetGenerators = zone.generators;
            let presetModulators = zone.modulators;
            const firstZone = zone.instrument.instrumentZones[0];
            /**
             * global zone is always first, so it or nothing
             * @type {Generator[]}
             */
            let globalInstrumentGenerators = firstZone.isGlobal ? [...firstZone.generators] : [];
            let globalInstrumentModulators = firstZone.isGlobal ? [...firstZone.modulators] : [];
            const globalKeyRange = firstZone.isGlobal ? firstZone.keyRange : { min: 0, max: 127 };
            const globalVelRange = firstZone.isGlobal ? firstZone.velRange : { min: 0, max: 127 };
            
            
            let instrumentZonesInRange = zone.instrument.instrumentZones
                .filter(currentZone =>
                    (
                        isInRange(
                            currentZone.hasKeyRange ? currentZone.keyRange : globalKeyRange,
                            midiNote
                        )
                        &&
                        isInRange(
                            currentZone.hasVelRange ? currentZone.velRange : globalVelRange,
                            velocity
                        )
                    ) && !currentZone.isGlobal
                );
            
            instrumentZonesInRange.forEach(instrumentZone =>
            {
                let instrumentGenerators = [...instrumentZone.generators];
                let instrumentModulators = [...instrumentZone.modulators];
                
                addUnique(
                    presetGenerators,
                    globalPresetGenerators
                );
                // add the unique global preset generators (local replace global(
                
                
                // add the unique global instrument generators (local replace global)
                addUnique(
                    instrumentGenerators,
                    globalInstrumentGenerators
                );
                
                addUniqueMods(
                    presetModulators,
                    globalPresetModulators
                );
                addUniqueMods(
                    instrumentModulators,
                    globalInstrumentModulators
                );
                
                // default mods
                addUniqueMods(
                    instrumentModulators,
                    this.parentSoundBank.defaultModulators
                );
                
                /**
                 * sum preset modulators to instruments (amount) sf spec page 54
                 * @type {Modulator[]}
                 */
                const finalModulatorList = [...instrumentModulators];
                for (let i = 0; i < presetModulators.length; i++)
                {
                    let mod = presetModulators[i];
                    const identicalInstrumentModulator = finalModulatorList.findIndex(
                        m => Modulator.isIdentical(mod, m));
                    if (identicalInstrumentModulator !== -1)
                    {
                        // sum the amounts
                        // (this makes a new modulator because otherwise it would overwrite the one in the soundfont!
                        finalModulatorList[identicalInstrumentModulator] = finalModulatorList[identicalInstrumentModulator].sumTransform(
                            mod);
                    }
                    else
                    {
                        finalModulatorList.push(mod);
                    }
                }
                
                
                // combine both generators and add to the final result
                parsedGeneratorsAndSamples.push({
                    instrumentGenerators: instrumentGenerators,
                    presetGenerators: presetGenerators,
                    modulators: finalModulatorList,
                    sample: instrumentZone.sample,
                    sampleID: instrumentZone.generators.find(
                        g => g.generatorType === generatorTypes.sampleID).generatorValue
                });
            });
        });
        
        // save and return
        this.foundSamplesAndGenerators[midiNote][velocity] = parsedGeneratorsAndSamples;
        return parsedGeneratorsAndSamples;
    }
}