import {RiffChunk} from "./riff_chunk.js";
import {PresetZone} from "./zones.js";
import {readBytesAsUintLittleEndian} from "../../utils/byte_functions/little_endian.js";
import {Sample} from "./samples.js";
import { Generator, generatorTypes } from './generators.js'
import { defaultModulators } from './modulators.js'
import { readBytesAsString } from '../../utils/byte_functions/string.js'

/**
 * parses soundfont presets, also includes function for getting the generators and samples from midi note and velocity
 */

export class Preset {
    /**
     * Creates a preset
     * @param presetChunk {RiffChunk}
     */
    constructor(presetChunk)
    {
        this.presetName = readBytesAsString(presetChunk.chunkData, 20)
            .trim()
            .replace(/\d{3}:\d{3}/, ""); // remove those pesky "000:001"

        this.program = readBytesAsUintLittleEndian(presetChunk.chunkData, 2);
        this.bank = readBytesAsUintLittleEndian(presetChunk.chunkData, 2);
        this.presetZoneStartIndex = readBytesAsUintLittleEndian(presetChunk.chunkData, 2);
        this.presetZonesAmount = 0;
        /**
         * @type {PresetZone[]}
         */
        this.presetZones = [];

        /**
         * Stores already found getSamplesAndGenerators for reuse
         * @type {SampleAndGenerators[][][]}
         */
        this.foundSamplesAndGenerators = [];
        for(let i = 0; i < 128; i++)
        {
            this.foundSamplesAndGenerators[i] = [];
        }

        // read the dwords
        this.library = readBytesAsUintLittleEndian(presetChunk.chunkData, 4);
        this.genre = readBytesAsUintLittleEndian(presetChunk.chunkData, 4);
        this.morphology = readBytesAsUintLittleEndian(presetChunk.chunkData, 4);
    }

    /**
     * Loads all the preset zones, given the amount
     * @param amount {number}
     * @param zones {PresetZone[]}
     */
    getPresetZones(amount, zones)
    {
        this.presetZonesAmount = amount;
        for (let i = this.presetZoneStartIndex; i < this.presetZonesAmount + this.presetZoneStartIndex; i++)
        {
            this.presetZones.push(zones[i]);
        }
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
                setTimeout(() => {
                    this.getSamplesAndGenerators(key, velocity).forEach(samandgen => {
                        if(!samandgen.sample.isSampleLoaded)
                        {
                            samandgen.sample.getAudioData();
                        }
                    })
                });
            }
        }
    }

    /**
     * @typedef {{
     *  instrumentGenerators: Generator[],
     *  presetGenerators: Generator[],
     *  modulators: Modulator[],
     *  sample: Sample,
     *  sampleID: number,
     * }} SampleAndGenerators
     */

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

        function isInRange(min, max, number) {
            return number >= min && number <= max;
        }

        /**
         * @param mod1 {Modulator}
         * @param mod2 {Modulator}
         * @returns {boolean}
         */
        function identicalMod(mod1, mod2)
        {
            return (mod1.modulatorSource === mod2.modulatorSource)
                && (mod1.modulatorDestination === mod2.modulatorDestination)
                && (mod1.modulationSecondarySrc === mod2.modulationSecondarySrc)
                && (mod1.transformType === mod2.transformType);
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
            main.push(...adder.filter(m => !main.find(mm => identicalMod(m, mm))));
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
                addUniqueMods(instrumentModulators, defaultModulators);

                /**
                 * sum preset modulators to instruments (amount) sf spec page 54
                 * @type {Modulator[]}
                 */
                const finalModulatorList = [...instrumentModulators];
                for(let i = 0; i < presetModulators.length; i++)
                {
                    let mod = presetModulators[i];
                    const identicalInstrumentModulator = finalModulatorList.findIndex(m => identicalMod(mod, m));
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

/**
 * Reads the presets
 * @param presetChunk {RiffChunk}
 * @param presetZones {PresetZone[]}
 * @returns {Preset[]}
 */
export function readPresets(presetChunk, presetZones)
{
    /**
     * @type {Preset[]}
     */
    let presets = [];
    while(presetChunk.chunkData.length > presetChunk.chunkData.currentIndex)
    {
        let preset = new Preset(presetChunk);
        if(presets.length > 0)
        {
            let presetZonesAmount = preset.presetZoneStartIndex - presets[presets.length - 1].presetZoneStartIndex;
            presets[presets.length - 1].getPresetZones(presetZonesAmount, presetZones);
        }
        presets.push(preset);
    }
    // remove EOP
    if (presets.length > 1)
    {
        presets.pop();
    }
    return presets;
}