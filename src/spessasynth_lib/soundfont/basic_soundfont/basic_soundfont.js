import {
    SpessaSynthGroup,
    SpessaSynthGroupCollapsed,
    SpessaSynthGroupEnd,
    SpessaSynthInfo,
    SpessaSynthWarn
} from "../../utils/loggin.js";
import { consoleColors } from "../../utils/other.js";
import { write } from "./write_sf2/write.js";
import { defaultModulators, Modulator } from "./modulator.js";
import { writeDLS } from "./write_dls/write_dls.js";
import { BasicSample } from "./basic_sample.js";
import { BasicInstrumentZone, BasicPresetZone } from "./basic_zones.js";
import { Generator, generatorTypes } from "./generator.js";
import { BasicInstrument } from "./basic_instrument.js";
import { BasicPreset } from "./basic_preset.js";

class BasicSoundBank
{
    /**
     * Creates a new basic soundfont template
     * @param data {undefined|{presets: BasicPreset[], info: Object<string, string>}}
     */
    constructor(data = undefined)
    {
        /**
         * Soundfont's info stored as name: value. ifil and iver are stored as string representation of float (e.g., 2.1)
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
     * @param soundfonts {...BasicSoundBank} the soundfonts to merge, the first overwrites the last
     * @returns {BasicSoundBank}
     */
    static mergeSoundBanks(...soundfonts)
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
        
        return new BasicSoundBank({ presets: presets, info: mainSf.soundFontInfo });
    }
    
    /**
     * Creates a simple soundfont with one saw wave preset.
     * @returns {ArrayBufferLike}
     */
    static getDummySoundfontFile()
    {
        const font = new BasicSoundBank();
        const sample = new BasicSample(
            "Saw",
            44100,
            65,
            20,
            0,
            0,
            0,
            127
        );
        sample.sampleData = new Float32Array(128);
        for (let i = 0; i < 128; i++)
        {
            sample.sampleData[i] = (i / 128) * 2 - 1;
        }
        font.samples.push(sample);
        
        const gZone = new BasicInstrumentZone();
        gZone.isGlobal = true;
        gZone.generators.push(new Generator(generatorTypes.initialAttenuation, 375));
        gZone.generators.push(new Generator(generatorTypes.releaseVolEnv, -1000));
        gZone.generators.push(new Generator(generatorTypes.sampleModes, 1));
        
        const zone1 = new BasicInstrumentZone();
        zone1.sample = sample;
        
        const zone2 = new BasicInstrumentZone();
        zone2.sample = sample;
        zone2.generators.push(new Generator(generatorTypes.fineTune, -9));
        
        
        const inst = new BasicInstrument();
        inst.instrumentName = "Saw Wave";
        inst.instrumentZones.push(gZone);
        inst.instrumentZones.push(zone1);
        inst.instrumentZones.push(zone2);
        font.instruments.push(inst);
        
        const pZone = new BasicPresetZone();
        pZone.instrument = inst;
        
        const preset = new BasicPreset(font.defaultModulators);
        preset.presetName = "Saw Wave";
        preset.presetZones.push(pZone);
        font.presets.push(preset);
        
        font.soundFontInfo["ifil"] = "2.1";
        font.soundFontInfo["isng"] = "EMU8000";
        font.soundFontInfo["INAM"] = "Dummy";
        return font.write().buffer;
    }
    
    /**
     * Trims a sound bank to only contain samples in a given MIDI file
     * @param mid {BasicMIDI} - the MIDI file
     */
    trimSoundBank(mid)
    {
        const soundfont = this;
        
        /**
         * @param instrument {Instrument}
         * @param combos {{key: number, velocity: number}[]}
         * @returns {number}
         */
        function trimInstrumentZones(instrument, combos)
        {
            let trimmedIZones = 0;
            for (let iZoneIndex = 0; iZoneIndex < instrument.instrumentZones.length; iZoneIndex++)
            {
                const iZone = instrument.instrumentZones[iZoneIndex];
                if (iZone.isGlobal)
                {
                    continue;
                }
                const iKeyRange = iZone.keyRange;
                const iVelRange = iZone.velRange;
                let isIZoneUsed = false;
                for (const iCombo of combos)
                {
                    if (
                        (iCombo.key >= iKeyRange.min && iCombo.key <= iKeyRange.max) &&
                        (iCombo.velocity >= iVelRange.min && iCombo.velocity <= iVelRange.max)
                    )
                    {
                        isIZoneUsed = true;
                        break;
                    }
                }
                if (!isIZoneUsed)
                {
                    SpessaSynthInfo(
                        `%c${iZone.sample.sampleName} %cremoved from %c${instrument.instrumentName}%c. Use count: %c${iZone.useCount - 1}`,
                        consoleColors.recognized,
                        consoleColors.info,
                        consoleColors.recognized,
                        consoleColors.info,
                        consoleColors.recognized
                    );
                    if (instrument.safeDeleteZone(iZoneIndex))
                    {
                        trimmedIZones++;
                        iZoneIndex--;
                        SpessaSynthInfo(
                            `%c${iZone.sample.sampleName} %cdeleted`,
                            consoleColors.recognized,
                            consoleColors.info
                        );
                    }
                    if (iZone.sample.useCount < 1)
                    {
                        soundfont.deleteSample(iZone.sample);
                    }
                }
                
            }
            return trimmedIZones;
        }
        
        SpessaSynthGroup(
            "%cTrimming soundfont...",
            consoleColors.info
        );
        const usedProgramsAndKeys = mid.getUsedProgramsAndKeys(soundfont);
        
        SpessaSynthGroupCollapsed(
            "%cModifying soundfont...",
            consoleColors.info
        );
        SpessaSynthInfo("Detected keys for midi:", usedProgramsAndKeys);
        // modify the soundfont to only include programs and samples that are used
        for (let presetIndex = 0; presetIndex < soundfont.presets.length; presetIndex++)
        {
            const p = soundfont.presets[presetIndex];
            const string = p.bank + ":" + p.program;
            const used = usedProgramsAndKeys[string];
            if (used === undefined)
            {
                SpessaSynthInfo(
                    `%cDeleting preset %c${p.presetName}%c and its zones`,
                    consoleColors.info,
                    consoleColors.recognized,
                    consoleColors.info
                );
                soundfont.deletePreset(p);
                presetIndex--;
            }
            else
            {
                const combos = [...used].map(s =>
                {
                    const split = s.split("-");
                    return {
                        key: parseInt(split[0]),
                        velocity: parseInt(split[1])
                    };
                });
                SpessaSynthGroupCollapsed(
                    `%cTrimming %c${p.presetName}`,
                    consoleColors.info,
                    consoleColors.recognized
                );
                SpessaSynthInfo(`Keys for ${p.presetName}:`, combos);
                let trimmedZones = 0;
                // clean the preset to only use zones that are used
                for (let zoneIndex = 0; zoneIndex < p.presetZones.length; zoneIndex++)
                {
                    const zone = p.presetZones[zoneIndex];
                    if (zone.isGlobal)
                    {
                        continue;
                    }
                    const keyRange = zone.keyRange;
                    const velRange = zone.velRange;
                    // check if any of the combos matches the zone
                    let isZoneUsed = false;
                    for (const combo of combos)
                    {
                        if (
                            (combo.key >= keyRange.min && combo.key <= keyRange.max) &&
                            (combo.velocity >= velRange.min && combo.velocity <= velRange.max)
                        )
                        {
                            // zone is used, trim the instrument zones
                            isZoneUsed = true;
                            const trimmedIZones = trimInstrumentZones(zone.instrument, combos);
                            SpessaSynthInfo(
                                `%cTrimmed off %c${trimmedIZones}%c zones from %c${zone.instrument.instrumentName}`,
                                consoleColors.info,
                                consoleColors.recognized,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            break;
                        }
                    }
                    if (!isZoneUsed)
                    {
                        trimmedZones++;
                        p.deleteZone(zoneIndex);
                        if (zone.instrument.useCount < 1)
                        {
                            soundfont.deleteInstrument(zone.instrument);
                        }
                        zoneIndex--;
                    }
                }
                SpessaSynthInfo(
                    `%cTrimmed off %c${trimmedZones}%c zones from %c${p.presetName}`,
                    consoleColors.info,
                    consoleColors.recognized,
                    consoleColors.info,
                    consoleColors.recognized
                );
                SpessaSynthGroupEnd();
            }
        }
        soundfont.removeUnusedElements();
        
        soundfont.soundFontInfo["ICMT"] = `NOTE: This soundfont was trimmed by SpessaSynth to only contain presets used in "${mid.midiName}"\n\n`
            + soundfont.soundFontInfo["ICMT"];
        
        SpessaSynthInfo(
            "%cSoundfont modified!",
            consoleColors.recognized
        );
        SpessaSynthGroupEnd();
        SpessaSynthGroupEnd();
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
                // non-drum preset: find any preset with the given program that is not a drum preset
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
    
    destroySoundBank()
    {
        delete this.presets;
        delete this.instruments;
        delete this.samples;
    }
}

BasicSoundBank.prototype.write = write;
BasicSoundBank.prototype.writeDLS = writeDLS;

export { BasicSoundBank };