import {RiffChunk} from "../basic_soundfont/riff_chunk.js";
import {PresetZone} from "./zones.js";
import {readBytesAsUintLittleEndian} from "../../utils/byte_functions/little_endian.js";
import { readBytesAsString } from '../../utils/byte_functions/string.js'
import { BasicPreset } from '../basic_soundfont/basic_preset.js'

/**
 * parses soundfont presets, also includes function for getting the generators and samples from midi note and velocity
 */

export class Preset extends BasicPreset
{
    /**
     * Creates a preset
     * @param presetChunk {RiffChunk}
     */
    constructor(presetChunk)
    {
        super();
        this.presetName = readBytesAsString(presetChunk.chunkData, 20)
            .trim()
            .replace(/\d{3}:\d{3}/, ""); // remove those pesky "000:001"

        this.program = readBytesAsUintLittleEndian(presetChunk.chunkData, 2);
        this.bank = readBytesAsUintLittleEndian(presetChunk.chunkData, 2);
        this.presetZoneStartIndex = readBytesAsUintLittleEndian(presetChunk.chunkData, 2);

        // read the dwords
        this.library = readBytesAsUintLittleEndian(presetChunk.chunkData, 4);
        this.genre = readBytesAsUintLittleEndian(presetChunk.chunkData, 4);
        this.morphology = readBytesAsUintLittleEndian(presetChunk.chunkData, 4);
        this.presetZonesAmount = 0;
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