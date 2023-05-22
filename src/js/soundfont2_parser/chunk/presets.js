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
        this.midiPresetNumber = readBytesAsUintLittleEndian(presetChunk.chunkData, 2);
        this.midiBankNumber = readBytesAsUintLittleEndian(presetChunk.chunkData, 2);
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
     * @returns {{generators: Generator[], sample: Sample}[]}
     */
    getSampleAndGenerators(midiNote)
    {
        function isInRange(min, max, number) {
            return number >= min && number <= max;
        }
        /**
         * @type {{generators: Generator[], sample: Sample}[]}
         */
        let parsedGeneratorsAndSamples = [];
        let presetZonesInRange = this.presetZones.filter(zone => isInRange(zone.keyRange.min, zone.keyRange.max, midiNote));
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
            let presetZoneGenerators = zone.generators;
            /**
             * @type {Generator[]}
             */
            let globalInstrumentGenerators = [];

            let instrumentZonesInRange = zone.instrument.instrumentZones.filter(z =>
                isInRange(z.keyRange.min, z.keyRange.max, midiNote));

            for(let instrumentZone of instrumentZonesInRange) {
                if (instrumentZone.isGlobal) {
                    // global zone
                    globalInstrumentGenerators.push(...instrumentZone.generators);
                }
            }

            for(let instrumentZone of instrumentZonesInRange)
            {
                if(instrumentZone.isGlobal) continue;
                let sampleGenerators = Array.from(instrumentZone.generators);

                // add the unique global preset gen types
                presetZoneGenerators.push(...globalPresetGenerators.filter(
                    gen => presetZoneGenerators.find(existingGen => existingGen.generatorType === gen.generatorType) === undefined
                ));

                // add the unique global instrument gen types
                sampleGenerators.push(...globalInstrumentGenerators.filter(
                    gen => sampleGenerators.find(existingGen => existingGen.generatorType === gen.generatorType) === undefined
                ));
                // console.log(presetZoneGenerators, sampleGenerators);
                // //debugger;
                // for(let gen of sampleGenerators)
                // {
                //     if(getGeneratorValueType(gen.generatorType) === "value")
                //     {
                //         console.log(gen.generatorType)
                //         // if theres one in the preset zone, sum it
                //         let presetGen = presetZoneGenerators.find(g => g.generatorType === gen.generatorType);
                //         if(presetGen) {
                //             gen.generatorValue += presetGen.generatorValue;
                //         }
                //     }
                // }

                parsedGeneratorsAndSamples.push({
                    generators: /*sampleGenerators,*/ sampleGenerators.concat(presetZoneGenerators),
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
        presets.push(preset);
    }
    return presets;
}