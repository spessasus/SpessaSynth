/**
 * @typedef {{
 *  instrumentGenerators: Generator[],
 *  presetGenerators: Generator[],
 *  modulators: Modulator[],
 *  sample: BasicSample,
 *  sampleID: number,
 * }} SampleAndGenerators
 */
import { generatorTypes } from '../read_sf2/generators.js'
import { Modulator } from '../read_sf2/modulators.js'

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
        for(let i = 0; i < 128; i++)
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

    /**
     * Preloads all samples (async)
     */
    preload(keyMin, keyMax)
    {
        for (let key = keyMin; key < keyMax + 1; key++)
        {
            for (let velocity = 0; velocity < 128; velocity++)
            {
                this.getSamplesAndGenerators(key, velocity).forEach(samandgen => {
                    if(!samandgen.sample.isSampleLoaded)
                    {
                        samandgen.sample.getAudioData();
                    }
                })
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
        this.getSamplesAndGenerators(key, velocity).forEach(samandgen => {
            if(!samandgen.sample.isSampleLoaded)
            {
                samandgen.sample.getAudioData();
            }
        })
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
        if(memorized)
        {
            return memorized;
        }

        if(this.presetZones.length < 1)
        {
            return [];
        }

        function isInRange(min, max, number)
        {
            return number >= min && number <= max;
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

        let globalPresetModulators = this.presetZones[0].isGlobal ? [...this.presetZones[0].modulators] : [];

        // find the preset zones in range
        let presetZonesInRange = this.presetZones.filter(currentZone =>
            (
                isInRange(currentZone.keyRange.min, currentZone.keyRange.max, midiNote)
                &&
                isInRange(currentZone.velRange.min, currentZone.velRange.max, velocity)
            ) && !currentZone.isGlobal);

        presetZonesInRange.forEach(zone =>
        {
            if(zone.instrument.instrumentZones.length < 1)
            {
                return;
            }
            let presetGenerators = zone.generators;
            let presetModulators = zone.modulators;
            /**
             * global zone is always first, so it or nothing
             * @type {Generator[]}
             */
            let globalInstrumentGenerators = zone.instrument.instrumentZones[0].isGlobal ? [...zone.instrument.instrumentZones[0].generators] : [];
            let globalInstrumentModulators = zone.instrument.instrumentZones[0].isGlobal ? [...zone.instrument.instrumentZones[0].modulators] : [];

            let instrumentZonesInRange = zone.instrument.instrumentZones
                .filter(currentZone =>
                    (
                        isInRange(currentZone.keyRange.min,
                            currentZone.keyRange.max,
                            midiNote)
                        &&
                        isInRange(currentZone.velRange.min,
                            currentZone.velRange.max,
                            velocity)
                    ) && !currentZone.isGlobal
                );

            instrumentZonesInRange.forEach(instrumentZone =>
            {
                let instrumentGenerators = [...instrumentZone.generators];
                let instrumentModulators = [...instrumentZone.modulators];

                addUnique(presetGenerators, globalPresetGenerators);
                // add the unique global preset generators (local replace global(


                // add the unique global instrument generators (local replace global)
                addUnique(instrumentGenerators, globalInstrumentGenerators);

                addUniqueMods(presetModulators, globalPresetModulators);
                addUniqueMods(instrumentModulators, globalInstrumentModulators);

                // default mods
                addUniqueMods(instrumentModulators, this.defaultModulators);

                /**
                 * sum preset modulators to instruments (amount) sf spec page 54
                 * @type {Modulator[]}
                 */
                const finalModulatorList = [...instrumentModulators];
                for(let i = 0; i < presetModulators.length; i++)
                {
                    let mod = presetModulators[i];
                    const identicalInstrumentModulator = finalModulatorList.findIndex(m => Modulator.isIdentical(mod, m));
                    if(identicalInstrumentModulator !== -1)
                    {
                        // sum the amounts (this makes a new modulator because otherwise it would overwrite the one in the soundfont!!!
                        finalModulatorList[identicalInstrumentModulator] = finalModulatorList[identicalInstrumentModulator].sumTransform(mod);
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
                    sampleID: instrumentZone.generators.find(g => g.generatorType === generatorTypes.sampleID).generatorValue
                });
            });
        });

        // save and return
        this.foundSamplesAndGenerators[midiNote][velocity] = parsedGeneratorsAndSamples;
        return parsedGeneratorsAndSamples;
    }
}