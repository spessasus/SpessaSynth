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
        this.presetName = readBytesAsString(presetChunk.chunkData, 20).trim();
        this.program = readBytesAsUintLittleEndian(presetChunk.chunkData, 2);
        this.bank = readBytesAsUintLittleEndian(presetChunk.chunkData, 2);
        this.presetZoneStartIndex = readBytesAsUintLittleEndian(presetChunk.chunkData, 2);
        this.presetZonesAmount = 0;
        /**
         * @type {number[]}
         */
        this.exclusiveClasses = [];
        /**
         * @type {PresetZone[]}
         */
        this.presetZones = [];

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
     * Searches for all exclusive classes within the preset
     */
    getExclusiveClasses()
    {
        for(let presetZone of this.presetZones)
        {
            if(!presetZone.instrument)
            {
                continue;
            }
            for(let instrumentZone of presetZone.instrument.instrumentZones)
            {
                let exclusiveClass = instrumentZone.generators.find(g => g.generatorType === "exclusiveClass");
                if(exclusiveClass)
                {
                    if(exclusiveClass.generatorValue !== 0)
                    {
                        if(!this.exclusiveClasses.includes(exclusiveClass.generatorValue)) {
                            this.exclusiveClasses.push(exclusiveClass.generatorValue);
                        }
                    }
                }
            }
        }
    }

    /**
     * Returns sampleOptions and generators for given note
     * @param midiNote {number}
     * @param velocity {number}
     * @returns {{
     *  instrumentGenerators: Generator[],
     *  presetGenerators: Generator[],
     *  sample: Sample
     * }[]}
     */
    getSampleAndGenerators(midiNote, velocity)
    {
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
        let presetZonesInRange = this.presetZones.filter(currentZone =>
            isInRange(currentZone.keyRange.min, currentZone.keyRange.max, midiNote)
            && isInRange(currentZone.velRange.min, currentZone.velRange.max, velocity));

        /**
         * @type {Generator[]}
         */
        let globalPresetGenerators = [];
        for(let presetZone of presetZonesInRange)
        {
            if(presetZone.isGlobal)
            {
                // global zone
                globalPresetGenerators.push(...presetZone.generators);
            }
        }
        for(let zone of presetZonesInRange)
        {
            if(zone.isGlobal) continue;
            let presetGenerators = zone.generators;
            /**
             * @type {Generator[]}
             */
            let globalInstrumentGenerators = [];

            let instrumentZonesInRange = zone.instrument.instrumentZones.filter(currentZone =>
                isInRange(currentZone.keyRange.min, currentZone.keyRange.max, midiNote)
                && isInRange(currentZone.velRange.min, currentZone.velRange.max, velocity));

            for(let instrumentZone of instrumentZonesInRange) {
                if (instrumentZone.isGlobal) {
                    // global zone
                    globalInstrumentGenerators.push(...instrumentZone.generators);
                }
            }

            for(let instrumentZone of instrumentZonesInRange)
            {
                if(instrumentZone.isGlobal) continue;
                let instrumentGenerators = Array.from(instrumentZone.generators);

                // add the unique global preset gen types
                presetGenerators.push(...globalPresetGenerators.filter(
                    gen => presetGenerators.find(existingGen => existingGen.generatorType === gen.generatorType) === undefined
                ));

                // add the unique global instrument gen types
                instrumentGenerators.push(...globalInstrumentGenerators.filter(
                    gen => instrumentGenerators.find(existingGen => existingGen.generatorType === gen.generatorType) === undefined
                ));

                // replace the global preset gens with global instrument gens
                // const globalGenerators = globalInstrumentGenerators;
                // for(const globalPresetGenerator of globalPresetGenerators)
                // {
                //     if(globalGenerators.find(g => g.generatorType === globalPresetGenerator.generatorType) === undefined)
                //     {
                //         globalGenerators.push(globalPresetGenerator);
                //     }
                // }
                //
                // // replace the preset gens with instrument gens
                // const generators = instrumentGenerators;
                // for(let presetGenerator of presetGenerators)
                // {
                //     if(generators.find(g => g.generatorType === presetGenerator.generatorType) === undefined)
                //     {
                //         generators.push(presetGenerator);
                //     }
                // }

                // combine both generators and add to the final result
                parsedGeneratorsAndSamples.push({
                    instrumentGenerators: instrumentGenerators,
                    presetGenerators: presetGenerators,
                    sample: instrumentZone.sample
                });
            }
        }
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
            presets[presets.length - 1].getExclusiveClasses()
        }
        if(preset.presetName !== 'EOP') {
            presets.push(preset);
        }
    }
    return presets;
}