import { SpessaSynthWarn } from "../../utils/loggin.js";
import { consoleColors } from "../../utils/other.js";
import { write } from "./write_sf2/write.js";
import { defaultModulators, Modulator } from "./modulator.js";

class BasicSoundFont
{
    /**
     * Creates a new basic soundfont template
     * @param data {undefined|{presets: BasicPreset[], info: Object<string, string>}}
     */
    constructor(data = undefined)
    {
        /**
         * Soundfont's info stored as name: value. ifil and iver are stored as string representation of float (e.g. 2.1)
         * @type {Object<string, string|IndexedByteArray>}
         */
        this.soundFontInfo = {};
        
        /**
         * The soundfont's presets
         * @type {BasicPreset[]}
         */
        this.presets = [];
        
        /**
         * The soundfont's samples
         * @type {BasicSample[]}
         */
        this.samples = [];
        
        /**
         * The soundfont's instruments
         * @type {BasicInstrument[]}
         */
        this.instruments = [];
        
        /**
         * Soundfont's default modulatorss
         * @type {Modulator[]}
         */
        this.defaultModulators = defaultModulators.map(m => Modulator.copy(m));
        
        if (data?.presets)
        {
            this.presets.push(...data.presets);
            this.soundFontInfo = data.info;
        }
    }
    
    /**
     * Merges soundfonts with the given order. Keep in mind that the info read is copied from the first one
     * @param soundfonts {...BasicSoundFont} the soundfonts to merge, the first overwrites the last
     * @returns {BasicSoundFont}
     */
    static mergeSoundfonts(...soundfonts)
    {
        const mainSf = soundfonts.shift();
        const presets = mainSf.presets;
        while (soundfonts.length)
        {
            const newPresets = soundfonts.shift().presets;
            newPresets.forEach(newPreset =>
            {
                if (
                    presets.find(existingPreset => existingPreset.bank === newPreset.bank && existingPreset.program === newPreset.program) === undefined
                )
                {
                    presets.push(newPreset);
                }
            });
        }
        
        return new BasicSoundFont({ presets: presets, info: mainSf.soundFontInfo });
    }
    
    removeUnusedElements()
    {
        this.instruments.forEach(i =>
        {
            if (i.useCount < 1)
            {
                i.instrumentZones.forEach(z =>
                {
                    if (!z.isGlobal)
                    {
                        z.sample.useCount--;
                    }
                });
            }
        });
        this.instruments = this.instruments.filter(i => i.useCount > 0);
        this.samples = this.samples.filter(s => s.useCount > 0);
    }
    
    /**
     * @param instrument {BasicInstrument}
     */
    deleteInstrument(instrument)
    {
        if (instrument.useCount > 0)
        {
            throw new Error(`Cannot delete an instrument that has ${instrument.useCount} usages.`);
        }
        this.instruments.splice(this.instruments.indexOf(instrument), 1);
        instrument.deleteInstrument();
        this.removeUnusedElements();
    }
    
    /**
     * @param preset {BasicPreset}
     */
    deletePreset(preset)
    {
        preset.deletePreset();
        this.presets.splice(this.presets.indexOf(preset), 1);
        this.removeUnusedElements();
    }
    
    /**
     * @param sample {BasicSample}
     */
    deleteSample(sample)
    {
        if (sample.useCount > 0)
        {
            throw new Error(`Cannot delete sample that has ${sample.useCount} usages.`);
        }
        this.samples.splice(this.samples.indexOf(sample), 1);
        this.removeUnusedElements();
    }
    
    /**
     * To avoid overlapping on multiple desfonts
     * @param offset {number}
     */
    setSampleIDOffset(offset)
    {
        this.presets.forEach(p => p.sampleIDOffset = offset);
    }
    
    /**
     * Get the appropriate preset, undefined if not foun d
     * @param bankNr {number}
     * @param programNr {number}
     * @param fallbackToProgram {boolean} if true, if no exact match is found, will use any bank with the given preset
     * @return {BasicPreset}
     */
    getPresetNoFallback(bankNr, programNr, fallbackToProgram = false)
    {
        const p = this.presets.find(p => p.bank === bankNr && p.program === programNr);
        if (p)
        {
            return p;
        }
        if (fallbackToProgram === false)
        {
            return undefined;
        }
        if (bankNr === 128)
        {
            // any drum preset
            return this.presets.find(p => p.bank === 128);
        }
        return this.presets.find(p => p.program === programNr);
    }
    
    /**
     * Get the appropriate preset
     * @param bankNr {number}
     * @param programNr {number}
     * @returns {BasicPreset}
     */
    getPreset(bankNr, programNr)
    {
        // check for exact match
        let preset = this.presets.find(p => p.bank === bankNr && p.program === programNr);
        if (!preset)
        {
            // no match...
            if (bankNr === 128)
            {
                // drum preset: find any preset with bank 128
                preset = this.presets.find(p => p.bank === 128 && p.program === programNr);
                if (!preset)
                {
                    preset = this.presets.find(p => p.bank === 128);
                }
            }
            else
            {
                // non drum preset: find any preset with the given program that is not a drum preset
                preset = this.presets.find(p => p.program === programNr && p.bank !== 128);
            }
            if (preset)
            {
                SpessaSynthWarn(
                    `%cPreset ${bankNr}.${programNr} not found. Replaced with %c${preset.presetName} (${preset.bank}.${preset.program})`,
                    consoleColors.warn,
                    consoleColors.recognized
                );
            }
        }
        // no preset, use the first one available
        if (!preset)
        {
            SpessaSynthWarn(`Preset ${programNr} not found. Defaulting to`, this.presets[0].presetName);
            preset = this.presets[0];
        }
        return preset;
    }
    
    /**
     * gets preset by name
     * @param presetName {string}
     * @returns {BasicPreset}
     */
    getPresetByName(presetName)
    {
        let preset = this.presets.find(p => p.presetName === presetName);
        if (!preset)
        {
            SpessaSynthWarn("Preset not found. Defaulting to:", this.presets[0].presetName);
            preset = this.presets[0];
        }
        return preset;
    }
    
    /**
     * @param error {string}
     */
    parsingError(error)
    {
        throw new Error(`SF parsing error: ${error} The file may be corrupted.`);
    }
}

BasicSoundFont.prototype.write = write;

export { BasicSoundFont };