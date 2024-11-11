import { SpessaSynthWarn } from "../../../../utils/loggin.js";
import { WorkletSoundfontManagerMessageType } from "./sfman_message.js";
import { loadSoundFont } from "../../../../soundfont/load_soundfont.js";

/**
 * @typedef {Object} SoundFontType
 * @property {string} id - unique id for the soundfont
 * @property {BasicSoundFont} soundfont - the soundfont itself
 * @property {number} bankOffset - the soundfont's bank offset
 */

export class WorkletSoundfontManager
{
    /**
     * Creates a new instance of worklet soundfont manager (worklet scope)
     * @param initialSoundFontBuffer {ArrayBuffer} Array buffer of the soundfont. This soudfont always has the id "main"
     * @param readyCallback {function} postReady() method from synth
     */
    constructor(initialSoundFontBuffer, readyCallback)
    {
        /**
         * @type {Function}
         */
        this.ready = readyCallback;
        this.totalSoundfontOffset = 0;
        this.reloadManager(initialSoundFontBuffer);
    }
    
    _assingSampleOffsets()
    {
        let offset = 0;
        this.soundfontList.forEach(s =>
        {
            s.soundfont.setSampleIDOffset(offset);
            offset += s.soundfont.samples.length;
        });
        this.totalSoundfontOffset = offset;
    }
    
    generatePresetList()
    {
        this._assingSampleOffsets();
        /**
         * <"bank-program", "presetName">
         * @type {Object<string, string>}
         */
        const presetList = {};
        // gather the presets in reverse and replace if necessary
        for (let i = this.soundfontList.length - 1; i >= 0; i--)
        {
            const font = this.soundfontList[i];
            /**
             * prevent preset names from the same soudfont from being overriden
             * if the soundfont has two presets with matching bank and program
             * @type {Set<string>}
             */
            const presets = new Set();
            for (const p of font.soundfont.presets)
            {
                const presetString = `${p.bank + font.bankOffset}-${p.program}`;
                if (presets.has(presetString))
                {
                    continue;
                }
                presets.add(presetString);
                presetList[presetString] = p.presetName;
            }
        }
        
        /**
         * @type {{bank: number, presetName: string, program: number}[]}
         */
        this.presetList = [];
        for (const [string, name] of Object.entries(presetList))
        {
            const pb = string.split("-");
            this.presetList.push({
                presetName: name,
                program: parseInt(pb[1]),
                bank: parseInt(pb[0])
            });
        }
    }
    
    /**
     * @param type {WorkletSoundfontManagerMessageType}
     * @param data {any}
     */
    handleMessage(type, data)
    {
        switch (type)
        {
            case WorkletSoundfontManagerMessageType.addNewSoundFont:
                this.addNewSoundFont(data[0], data[1], data[2]);
                break;
            
            case WorkletSoundfontManagerMessageType.reloadSoundFont:
                this.reloadManager(data);
                break;
            
            case WorkletSoundfontManagerMessageType.deleteSoundFont:
                this.deleteSoundFont(data);
                break;
            
            case WorkletSoundfontManagerMessageType.rearrangeSoundFonts:
                this.rearrangeSoundFonts(data);
        }
    }
    
    /**
     * Get the final preset list
     * @returns {{bank: number, presetName: string, program: number}[]}
     */
    getPresetList()
    {
        return this.presetList.slice();
    }
    
    /**
     * Clears all soundfonts and adds a new one
     * @param soundFontArrayBuffer {ArrayBuffer}
     */
    reloadManager(soundFontArrayBuffer)
    {
        const font = loadSoundFont(soundFontArrayBuffer);
        /**
         * All the soundfonts, ordered from the most important to the least.
         * @type {SoundFontType[]}
         */
        this.soundfontList = [];
        this.soundfontList.push({
            id: "main",
            bankOffset: 0,
            soundfont: font
        });
        this.generatePresetList();
        this.ready();
    }
    
    deleteSoundFont(id)
    {
        if (this.soundfontList.length === 0)
        {
            SpessaSynthWarn("1 soundfont left. Aborting!");
            return;
        }
        const index = this.soundfontList.findIndex(s => s.id === id);
        if (index === -1)
        {
            SpessaSynthWarn(`No soundfont with id of "${id}" found. Aborting!`);
            return;
        }
        delete this.soundfontList[index].soundfont.presets;
        delete this.soundfontList[index].soundfont.instruments;
        delete this.soundfontList[index].soundfont.samples;
        this.soundfontList.splice(index, 1);
        this.generatePresetList();
    }
    
    /**
     * Adds a new soundfont buffer with a given ID
     * @param buffer {ArrayBuffer}
     * @param id {string}
     * @param bankOffset {number}
     */
    addNewSoundFont(buffer, id, bankOffset)
    {
        if (this.soundfontList.find(s => s.id === id) !== undefined)
        {
            throw new Error("Cannot overwrite the existing soundfont. Use soundfontManager.delete(id) instead.");
        }
        this.soundfontList.push({
            id: id,
            soundfont: loadSoundFont(buffer),
            bankOffset: bankOffset
        });
        this.generatePresetList();
        this.ready();
    }
    
    /**
     * Rearranges the soundfonts
     * @param newList {string[]} the order of soundfonts, a list of strings, first overwrites second
     */
    rearrangeSoundFonts(newList)
    {
        this.soundfontList.sort((a, b) =>
            newList.indexOf(a.id) - newList.indexOf(b.id)
        );
        this.generatePresetList();
    }
    
    /**
     * Gets a given preset from the soundfont stack
     * @param bankNumber {number}
     * @param programNumber {number}
     * @returns {BasicPreset} the preset
     */
    getPreset(bankNumber, programNumber)
    {
        if (this.soundfontList.length < 1)
        {
            throw new Error("No soundfonts! This should never happen.");
        }
        for (const sf of this.soundfontList)
        {
            // check for the preset (with given offset)
            const preset = sf.soundfont.getPresetNoFallback(bankNumber - sf.bankOffset, programNumber);
            if (preset !== undefined)
            {
                return preset;
            }
            // if not found, advance to the next soundfont
        }
        // if none found, return the first correct preset found
        if (bankNumber !== 128)
        {
            for (const sf of this.soundfontList)
            {
                const preset = sf.soundfont.presets.find(p => p.program === programNumber);
                if (preset)
                {
                    return preset;
                }
            }
            // if nothing at all, use the first preset
            return this.soundfontList[0].soundfont.presets[0];
        }
        else
        {
            for (const sf of this.soundfontList)
            {
                const preset = sf.soundfont.presets.find(p => p.bank === 128);
                if (preset)
                {
                    return preset;
                }
            }
            // if nothing at all, use the first preset
            return this.soundfontList[0].soundfont.presets[0];
        }
    }
    
    destroyManager()
    {
        this.soundfontList.forEach(s =>
        {
            s.soundfont.destroySoundfont();
        });
        delete this.soundfontList;
    }
}