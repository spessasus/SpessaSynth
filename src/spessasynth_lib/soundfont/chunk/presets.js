import {RiffChunk} from "./riff_chunk.js";
import {PresetZone} from "./zones.js";
import {readBytesAsString, readBytesAsUintLittleEndian} from "../../utils/byte_functions.js";
import {Sample} from "./samples.js";
import {Generator} from "./generators.js";

export class Preset {
    /**
     * Creates a preset
     * @param presetChunk {RiffChunk}
     */
    constructor(presetChunk) {
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

        // skip the DWORDs (4bytes times 3)
        readBytesAsUintLittleEndian(presetChunk.chunkData, 12);
    }

    /**
     * Loads all the preset zones, given the amount
     * @param amount {number}
     * @param zones {PresetZone[]}
     */
    getPresetZones(amount, zones) {
        this.presetZonesAmount = amount;
        for (let i = this.presetZoneStartIndex; i < this.presetZonesAmount + this.presetZoneStartIndex; i++) {
            this.presetZones.push(zones[i]);
        }
    }

    /**
     * @typedef {{
     *  instrumentGenerators: Generator[],
     *  presetGenerators: Generator[],
     *  sample: Sample
     * }} SampleAndGenerators
     */

    /**
     * Returns sampleOptions and generators for given note
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
         * @type {{
         *  instrumentGenerators: Generator[],
         *  presetGenerators: Generator[],
         *  sample: Sample
         * }[]}
         */
        let parsedGeneratorsAndSamples = [];

        /**
         * global zone is always first, so it or nothing
         * @type {Generator[]}
         */
        let globalPresetGenerators = this.presetZones[0].isGlobal ? [...this.presetZones[0].generators] : [];

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
            /**
             * global zone is always first, so it or nothing
             * @type {Generator[]}
             */
            let globalInstrumentGenerators = zone.instrument.instrumentZones[0].isGlobal ? [...zone.instrument.instrumentZones[0].generators] : [];

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

                // add the unique global preset generators (local replace global(
                presetGenerators.push(...globalPresetGenerators.filter(
                    gen => presetGenerators.find(existingGen =>
                        existingGen.generatorType === gen.generatorType) === undefined
                    )
                );

                // add the unique global instrument generators (local replace global)
                instrumentGenerators.push(...globalInstrumentGenerators.filter(
                    gen => instrumentGenerators.find(
                        existingGen => existingGen.generatorType === gen.generatorType) === undefined
                    )
                );

                // combine both generators and add to the final result
                parsedGeneratorsAndSamples.push({
                    instrumentGenerators: instrumentGenerators,
                    presetGenerators: presetGenerators,
                    sample: instrumentZone.sample
                });
            });
        });
        // if(parsedGeneratorsAndSamples.length < 1)
        // {
        //     console.warn(`No samples found for note ${midiNote} velocity ${velocity} for preset "${this.presetName}"`)
        // }

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
    if (presets.length > 1) {
        presets.pop();
    }
    return presets;
}