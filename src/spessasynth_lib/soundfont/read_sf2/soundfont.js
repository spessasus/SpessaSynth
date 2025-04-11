import { IndexedByteArray } from "../../utils/indexed_array.js";
import { readSamples } from "./samples.js";
import { readLittleEndian } from "../../utils/byte_functions/little_endian.js";
import { readGenerators } from "./generators.js";
import { InstrumentZone, readInstrumentZones, readPresetZones } from "./zones.js";
import { readPresets } from "./presets.js";
import { readInstruments } from "./instruments.js";
import { readModulators } from "./modulators.js";
import { readRIFFChunk, RiffChunk } from "../basic_soundfont/riff_chunk.js";
import { consoleColors } from "../../utils/other.js";
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo, SpessaSynthWarn } from "../../utils/loggin.js";
import { readBytesAsString } from "../../utils/byte_functions/string.js";
import { stbvorbis } from "../../externals/stbvorbis_sync/stbvorbis_sync.min.js";
import { BasicSoundBank } from "../basic_soundfont/basic_soundfont.js";
import { Generator } from "../basic_soundfont/generator.js";
import { Modulator } from "../basic_soundfont/modulator.js";

/**
 * soundfont.js
 * purpose: parses a soundfont2 (or sfe) file
 */

export class SoundFont2 extends BasicSoundBank
{
    /**
     * Initializes a new SoundFont2 Parser and parses the given data array
     * @param arrayBuffer {ArrayBuffer}
     * @param warnDeprecated {boolean}
     */
    constructor(arrayBuffer, warnDeprecated = true)
    {
        super();
        if (warnDeprecated)
        {
            console.warn("Using the constructor directly is deprecated. Use loadSoundFont instead.");
        }
        this.dataArray = new IndexedByteArray(arrayBuffer);
        SpessaSynthGroup("%cParsing SoundFont...", consoleColors.info);
        if (!this.dataArray)
        {
            SpessaSynthGroupEnd();
            this.parsingError("No data provided!");
        }
        
        // read the main read
        let firstChunk = readRIFFChunk(this.dataArray, false);
        const firstHeader = firstChunk.header.toLowerCase();
        if (firstHeader !== "riff" && firstHeader !== "rf64")
        {
            SpessaSynthGroupEnd();
            this.parsingError(`Invalid chunk header! Expected "riff" or "rf64" got "${firstHeader}"`);
        }

        const type = readBytesAsString(this.dataArray, 4).toLowerCase();
        if (type !== "sfbk" && type !== "sfpk" && type !== "sfen")
        {
            SpessaSynthGroupEnd();
            throw new SyntaxError(`Invalid soundFont! Expected "sfbk", "sfpk" or "sfen" got "${type}"`);
        }
        /*
        Some SF2Pack description:
        this is essentially sf2, but the entire smpl chunk is compressed (we only support Ogg Vorbis here)
        and the only other difference is that the main chunk isn't "sfbk" but rather "sfpk"
         */
        
        let bankType = "";
        
        switch (firstHeader)
        {
            case "riff":
                switch (type)
                {
                    case "sfbk":
                        bankType = "sf2";
                        break;
                    case "sfpk":
                        bankType = "sf2pack";
                        break;
                    case "sfen":
                        bankType = "sfe32";
                        break;
                    default:
                        bankType = "invalid";
                }
                break;
            case "rf64":
                switch (type)
                {
                    // 64-bit chunk headers can't be used with SF2 or SF2Pack.
                    case "sfen":
                        bankType = "sfe64";
                        break;
                    default:
                        bankType = "invalid";
                }
                break;
        }
        const isSF2Pack = bankType === "sf2pack";

        if (bankType === "invalid")
        {
            SpessaSynthGroupEnd();
            this.parsingError(`Invalid bank type: "${firstHeader}" and "${type}"`);
        }
        
        // INFO
        let infoChunk = readRIFFChunk(this.dataArray);
        this.verifyHeader(infoChunk, "list");
        readBytesAsString(infoChunk.chunkData, 4);
        
        while (infoChunk.chunkData.length > infoChunk.chunkData.currentIndex)
        {
            let chunk = readRIFFChunk(infoChunk.chunkData);
            let text;
            let sfeVersion;
            // special cases
            switch (chunk.header.toLowerCase())
            {
                case "ifil":
                case "iver":
                    const wMajor = `${readLittleEndian(chunk.chunkData, 2)}`
                    const wMinor = `${readLittleEndian(chunk.chunkData, 2)}`
                    // Legacy code for combined ifil/iver value representation
                    // Separated values are useful for implementation of SFe
                    text = `${wMajor}.${wMinor}`;
                    this.soundFontInfo[chunk.header + ".wMajor"] = wMajor;
                    this.soundFontInfo[chunk.header + ".wMinor"] = wMinor;
                    SpessaSynthInfo(
                        `%c"${chunk.header}": %c"${text}"`,
                        consoleColors.info,
                        consoleColors.recognized
                    );
                    if (chunk.header.toLowerCase() === "ifil")
                    {
                        switch (wMajor)
                        {
                            case `4`:
                                if (bankType === "sfe64")
                                {
                                    const sfeVersion = text;
                                } else {
                                    SpessaSynthWarn(`Bank version not fully supported: "${text}"`)
                                }
                                break;
                            case `3`:
                            case `2`:
                                if (wMinor >= 1024)
                                {
                                    // Load the highest SFe version for the ifil.wMinor value.
                                    // SFvx data is used to determine the precise version. 
                                    // If SFvx data is invalid, then sfeVersion falls back to this value.
                                    sfeVersion = `4.0`; // Highest SFe version with ifil.wMinor=1024 is 4.0 (for now).
                                } else {
                                    sfeVersion = text;
                                }
                                switch (bankType)
                                {
                                    case `sfe64`:
                                        SpessaSynthWarn(`Banks using 64-bit chunk headers use the specification version in ifil.`);
                                        break;
                                    case `sfe32`:
                                        if (wMajor === 2)
                                        {
                                            SpessaSynthWarn(`Non-containerised SFe banks are deprecated.`);
                                        }
                                        break;
                                }

                                break;
                            case `1`:
                                // We don't know the structure of an SBK file, but we assume that wMajor=1 in that case.
                                SpessaSynthGroupEnd(`.SBK files are not currently supported.`)
                                break;
                            default:
                                SpessaSynthWarn(`Bank version not fully supported: "${text}"`)
                                break;
                        }
                    }
                    break;
                case "isng":
                    text = readBytesAsString(chunk.chunkData, chunk.chunkData.length, undefined, false);
                    this.soundFontInfo[chunk.header] = text;

                    switch (text)
                    {
                        case "EMU8000":
                            SpessaSynthInfo(
                                `%cSynthesis engine: %cAWE32/AWE64`,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            if (bankType === "sfe32" || bankType === "sfe64")
                            {
                                SpessaSynthWarn(`Legacy synthesis engines are deprecated.`);
                            } 
                            break;
                        case "E-mu 10K1":
                            SpessaSynthInfo(
                                `%cSynthesis engine: %cSB Live!`,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            if (bankType === "sfe32" || bankType === "sfe64")
                            {
                                SpessaSynthWarn(`Legacy synthesis engines are deprecated.`);
                            }
                            break;
                        case "E-mu 10K2":
                            SpessaSynthInfo(
                                `%cSynthesis engine: %cSB Audigy`,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            if (bankType === "sfe32" || bankType === "sfe64")
                            {
                                SpessaSynthWarn(`Legacy synthesis engines are deprecated.`);
                            }
                            break;
                        case "X-Fi":
                            SpessaSynthInfo(
                                `%cSynthesis engine: %cSB X-Fi`,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            if (bankType === "sfe32" || bankType === "sfe64")
                            {
                                SpessaSynthWarn(`Legacy synthesis engines are deprecated.`);
                            }
                            break;
                        case "SFe 4":
                            SpessaSynthInfo(
                                `%cSynthesis engine: %cSFe 4`,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            break;
                        default:
                            SpessaSynthWarn(`Unknown synthesis engine: "${text}". Using SFe 4 engine.`);
                    }
                    break;
                case "icrd":
                    text = readBytesAsString(chunk.chunkData, chunk.chunkData.length, undefined, false);
                    this.soundFontInfo[chunk.header] = text;
                    let dateValue;
                    let dateMonth;
                    let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; // Todo: add localisation
                    let timeValue;
                    switch (text.length)
                    {
                        case 10: // Date only, time set to 12:00:00
                            this.soundFontInfo[chunk.header + ".year"] = text.substring(0,4);
                            this.soundFontInfo[chunk.header + ".month"] = text.substring(5,7);
                            this.soundFontInfo[chunk.header + ".day"] = text.substring(8,10);
                            this.soundFontInfo[chunk.header + ".hour"] = `12`;
                            this.soundFontInfo[chunk.header + ".minute"] = `00`;
                            this.soundFontInfo[chunk.header + ".second"] = `00`;

                            // Create human-readable date value for display in console
                            dateMonth = months[parseInt(`${this.soundFontInfo[chunk.header + ".month"]}`) - 1];
                            dateValue = `${this.soundFontInfo[chunk.header + ".day"]} ${dateMonth} ${this.soundFontInfo[chunk.header + ".year"]}`; 
                            SpessaSynthInfo(
                                `%cCreation date: %c${dateValue}`,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            break;
                        case 20: // Date and time
                            this.soundFontInfo[chunk.header + ".year"] = text.substring(0,4);
                            this.soundFontInfo[chunk.header + ".month"] = text.substring(5,7);
                            this.soundFontInfo[chunk.header + ".day"] = text.substring(8,10);
                            this.soundFontInfo[chunk.header + ".hour"] = text.substring(11,13);
                            this.soundFontInfo[chunk.header + ".minute"] = text.substring(14,16);
                            this.soundFontInfo[chunk.header + ".second"] = text.substring(17,19);

                            // Create human-readable date and time value for display in console
                            dateMonth = months[parseInt(`${this.soundFontInfo[chunk.header + ".month"]}`) - 1];
                            dateValue = `${this.soundFontInfo[chunk.header + ".day"]} ${dateMonth} ${this.soundFontInfo[chunk.header + ".year"]}`; 
                            SpessaSynthInfo(
                                `%cCreation date: %c${dateValue}`,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            if (parseInt(`${this.soundFontInfo[chunk.header + ".hour"]}`) === 0)
                            {
                                timeValue = `12:${text.substring(14,19)} am`;
                            } else if ((parseInt(`${this.soundFontInfo[chunk.header + ".hour"]}`) > 0) && (parseInt(`${this.soundFontInfo[chunk.header + ".hour"]}`) < 12))
                            {
                                timeValue = `${this.soundFontInfo[chunk.header + ".hour"]}:${text.substring(14,19)} am`;
                            } else if (parseInt(`${this.soundFontInfo[chunk.header + ".hour"]}`) === 12) 
                            {
                                timeValue = `12:${text.substring(14,19)} pm`;
                            } else if ((parseInt(`${this.soundFontInfo[chunk.header + ".hour"]}`) > 12) && (parseInt(`${this.soundFontInfo[chunk.header + ".hour"]}`) < 24)) 
                            {
                                timeValue = `${this.soundFontInfo[chunk.header + ".hour"] - 12}:${text.substring(14,19)} pm`;
                            }
                            SpessaSynthInfo(
                                `%cCreation time: %c${timeValue}`,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            break;
                        default: // Length isn't valid
                        if (bankType === "sfe32" || bankType === "sfe64")
                        {
                            SpessaSynthWarn(`Creation date not in ISO8601 format: "${text}"`);
                        }
                    }
                    break;

                case "icmt":
                    text = readBytesAsString(chunk.chunkData, chunk.chunkData.length, undefined, false);
                    this.soundFontInfo[chunk.header] = text;
                    SpessaSynthInfo(
                        `%c"${chunk.header}": %c"${text}"`,
                        consoleColors.info,
                        consoleColors.recognized
                    );
                    break;
                
                // dmod: default modulators
                case "dmod":
                    const newModulators = readModulators(chunk);
                    newModulators.pop(); // remove the terminal record
                    text = `Modulators: ${newModulators.length}`;
                    // override default modulators
                    const oldDefaults = this.defaultModulators;
                    
                    this.defaultModulators = newModulators;
                    this.defaultModulators.push(...oldDefaults.filter(m => !this.defaultModulators.find(mm => Modulator.isIdentical(
                        m,
                        mm
                    ))));
                    this.soundFontInfo[chunk.header] = chunk.chunkData;
                    SpessaSynthInfo(
                        `%c"${chunk.header}": %c"${text}"`,
                        consoleColors.info,
                        consoleColors.recognized
                    );
                    break;
                // nested lists: isfe is nested inside info.
                case "list":
                    const listHeader = readBytesAsString(chunk.chunkData, 4);
                    let nestedChunk;
                    let nestedText;
                    while (chunk.chunkData.length > chunk.chunkData.currentIndex)
                        {
                            switch (listHeader.toLowerCase())
                            {
                                case "isfe":
                                    nestedChunk = readRIFFChunk(chunk.chunkData);
                                    nestedText = readBytesAsString(nestedChunk.chunkData, nestedChunk.chunkData.length);
                                    switch (nestedChunk.header.toLowerCase())
                                    {
                                        case "sfty":
                                            this.soundFontInfo[listHeader + "-list." + nestedChunk.header] = nestedText;
                                            switch (nestedText)
                                            {
                                                case "SFe standard":
                                                    SpessaSynthInfo(
                                                        `%cSFe bank format: %cSFe Standard`,
                                                        consoleColors.info,
                                                        consoleColors.recognized
                                                    );
                                                    break;
                                                case "SFe standard with TSC":
                                                    SpessaSynthGroupEnd(`Banks with trailing sdta chunks are unsupported!`);
                                                    break;
                                                default:
                                                    SpessaSynthWarn(`Unrecognised bank format: "${nestedChunk.header}". Assuming "SFe standard"...`)
                                            }
                                            break;
                                        case "sfvx":
                                            // this is awful code but readLittleEndian returns zero for some reason
                                            // slicing the data somehow fixes this issue idk why
                                            let sfeMajor = `${readLittleEndian(nestedChunk.chunkData.slice(0,2),2)}`; 
                                            let sfeMinor = `${readLittleEndian(nestedChunk.chunkData.slice(2,4),2)}`;
                                            let sfeSpecType = `${readBytesAsString(nestedChunk.chunkData.slice(4,24),20)}`;
                                            let sfeDraft = `${readLittleEndian(nestedChunk.chunkData.slice(24,26),2)}`;
                                            let sfeVerStr = `${readBytesAsString(nestedChunk.chunkData.slice(26,46),20)}`;
                                            this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".wSFeSpecMajorVersion"] = sfeMajor;
                                            this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".wSFeSpecMinorVersion"] = sfeMinor;
                                            this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".achSFeSpecType"] = sfeSpecType;
                                            this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".wSFeDraftMilestone"] = sfeDraft;
                                            this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".achSFeFullVersion"] = sfeVerStr;

                                            sfeVersion = `${sfeMajor}.${sfeMinor}`
                                            SpessaSynthInfo(
                                                `%c"SFe Version": %c"${sfeVersion}"`,
                                                consoleColors.info,
                                                consoleColors.recognized
                                            );
                                            SpessaSynthInfo(
                                                `%c"${listHeader + "-list." + nestedChunk.header + ".achSFeSpecType"}": %c"${sfeSpecType}"`,
                                                consoleColors.info,
                                                consoleColors.recognized
                                            );
                                            SpessaSynthInfo(
                                                `%c"${listHeader + "-list." + nestedChunk.header + ".wSFeDraftMilestone"}": %c"${sfeDraft}"`,
                                                consoleColors.info,
                                                consoleColors.recognized
                                            );
                                            SpessaSynthInfo(
                                                `%c"${listHeader + "-list." + nestedChunk.header + ".achSFeFullVersion"}": %c"${sfeVerStr}"`,
                                                consoleColors.info,
                                                consoleColors.recognized
                                            );
                                            break;
                                        case "flag":
                                            // Todo: rewrite as a function similar to readModulators()
                                            let flagIndex = 0;
                                            let flagBranch;
                                            let flagLeaf;
                                            let flagFlags;
                                            let flagWarn = false;
                                            let endOfFlags = false;
                                            let leafIndexArray = new Uint16Array(nestedChunk.chunkData.length / 6);
                                            while (flagIndex < nestedChunk.chunkData.length)
                                            {
                                                // Access feature flags with this.soundFontInfo[ISFe-list.flag.<branch>.<leaf>] and use a bitwise AND operator for the desired flag(s).
                                                flagBranch = `${readLittleEndian(nestedChunk.chunkData.slice(flagIndex,flagIndex+1),1)}`; // branch
                                                flagLeaf = `${readLittleEndian(nestedChunk.chunkData.slice(flagIndex+1,flagIndex+2),1)}`; // leaf
                                                flagFlags = `${readLittleEndian(nestedChunk.chunkData.slice(flagIndex+2,flagIndex+6),1)}`; // flags (32 bits)
                                                this.soundFontInfo[listHeader + "-list." + nestedChunk.header + "." + flagBranch + "." + flagLeaf] = flagFlags;
                                                // This code assumes SFe 4.0 but will be changed for future versions.
                                                leafIndexArray[flagIndex / 6] = 256 * parseInt(flagBranch) + parseInt(flagLeaf);
                                                if ((parseInt(flagBranch) < 5))
                                                {
                                                    SpessaSynthInfo(
                                                        `%c"${"Feature flags, branch " + flagBranch + " leaf " + flagLeaf}": %c"${flagFlags}"`,
                                                        consoleColors.info,
                                                        consoleColors.recognized
                                                    );
                                                } else if ((parseInt(flagBranch) === 5) && (parseInt(flagLeaf) === 0))
                                                {
                                                    endOfFlags = true;
                                                } else if ((parseInt(flagBranch) < 240) && (flagWarn === false))
                                                {
                                                    SpessaSynthWarn(`Undefined leaves ignored.`);
                                                    flagWarn = true;
                                                } else if (parseInt(flagBranch) < 256)
                                                {
                                                    SpessaSynthInfo(
                                                        `%c"${"Feature flags, private-use branch " + flagBranch + " leaf " + flagLeaf}": %c"${flagFlags}"`,
                                                        consoleColors.info,
                                                        consoleColors.recognized
                                                    );
                                                }
                                                flagIndex += 6; // Go to the next leaf of 32 flags
                                            }
                                            if (!endOfFlags)
                                            {
                                                SpessaSynthWarn(`The end of flags record was not found.`);
                                            }
                                            // Code to verify support for all functions required by the bank
                                            // This should also be turned into a separate function in the future
                                            for (const val in leafIndexArray)
                                            {
                                                flagBranch = leafIndexArray[val] >>> 8;
                                                flagLeaf = leafIndexArray[val] & 255;
                                                // Todo: Not hardcode the values to test against.
                                                switch (parseInt(leafIndexArray[val]))
                                                {
                                                    case 0: // tuning
                                                        this.verifyFlag(15,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.0"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 1: // looping
                                                        this.verifyFlag(3,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.1"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 2: // filter types
                                                        this.verifyFlag(1,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.2"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 3: // filter params
                                                        this.verifyFlag(884736096,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.3"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 4: // attenuation
                                                        this.verifyFlag(7,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.4"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 5: // effects
                                                        this.verifyFlag(69391,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.5"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 6: // LFO
                                                        this.verifyFlag(15,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.6"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 7: // envelopes
                                                        this.verifyFlag(524287,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.7"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 8: // MIDI CC
                                                        this.verifyFlag(231169,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.8"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 9: // generators
                                                        this.verifyFlag(127,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.9"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 10: // zones
                                                        this.verifyFlag(127,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.10"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 11: // reserved
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".0.11"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 256: // modulators
                                                        this.verifyFlag(16383,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".1.0"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 257: // mod controllers
                                                        this.verifyFlag(51,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".1.1"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 258: // mod params 1
                                                        this.verifyFlag(998838,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".1.2"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 259: // mod params 2
                                                        this.verifyFlag(672137215,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".1.3"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 260: // mod params 3
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".1.4"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 261: // NRPN
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".1.5"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 262: // default modulators
                                                        this.verifyFlag(263167,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".1.6"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 263: // reserved
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".1.7"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 264: // reserved
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".1.8"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 512: // 24bit
                                                        this.verifyFlag(1,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".2.0"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 513: // 8bit
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".2.1"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 514: // 32bit
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".2.2"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 515: // 64bit
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".2.3"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 768: // SFe Compression
                                                        this.verifyFlag(1,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".3.0"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 769: // compression formats
                                                        this.verifyFlag(1,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".3.1"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 1024: // metadata
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".4.0"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 1025: // reserved
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".4.1"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 1026: // sample ROMs
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".4.2"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 1027: // ROM emulator
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".4.3"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 1028: // reserved
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".4.4"])}`,flagBranch,flagLeaf);
                                                        break;
                                                    case 1280: // end of flags
                                                        this.verifyFlag(0,`${parseInt(this.soundFontInfo[listHeader + "-list." + nestedChunk.header + ".5.0"])}`,flagBranch,flagLeaf);
                                                }
                                            }
                                            break;
                                        default:
                                            SpessaSynthWarn(`Unrecognised sub-chunk found in ISFe: ${nestedChunk.header}`);
                                    }
                                    break;
                                default:
                                    SpessaSynthWarn(`Unrecognised nested list chunk found: ${listHeader}`);
                            }
                        }
                    break;
                default:
                    text = readBytesAsString(chunk.chunkData, chunk.chunkData.length);
                    this.soundFontInfo[chunk.header] = text;
                    SpessaSynthInfo(
                        `%c"${chunk.header}": %c"${text}"`,
                        consoleColors.info,
                        consoleColors.recognized
                    );
            }
        }
        
        // SDTA
        const sdtaChunk = readRIFFChunk(this.dataArray, false);
        this.verifyHeader(sdtaChunk, "list");
        this.verifyText(readBytesAsString(this.dataArray, 4), "sdta");
        
        // smpl
        SpessaSynthInfo("%cVerifying smpl chunk...", consoleColors.warn);
        let sampleDataChunk = readRIFFChunk(this.dataArray, false);
        this.verifyHeader(sampleDataChunk, "smpl");
        /**
         * @type {IndexedByteArray|Float32Array}
         */
        let sampleData;
        // SF2Pack: the entire data is compressed
        if (isSF2Pack)
        {
            SpessaSynthInfo(
                "%cSF2Pack detected, attempting to decode the smpl chunk...",
                consoleColors.info
            );
            try
            {
                /**
                 * @type {Float32Array}
                 */
                sampleData = stbvorbis.decode(this.dataArray.buffer.slice(
                    this.dataArray.currentIndex,
                    this.dataArray.currentIndex + sdtaChunk.size - 12
                )).data[0];
            }
            catch (e)
            {
                SpessaSynthGroupEnd();
                throw new Error(`SF2Pack Ogg Vorbis decode error: ${e}`);
            }
            SpessaSynthInfo(
                `%cDecoded the smpl chunk! Length: %c${sampleData.length}`,
                consoleColors.info,
                consoleColors.value
            );
        }
        else
        {
            /**
             * @type {IndexedByteArray}
             */
            sampleData = this.dataArray;
            this.sampleDataStartIndex = this.dataArray.currentIndex;
        }
        
        SpessaSynthInfo(
            `%cSkipping sample chunk, length: %c${sdtaChunk.size - 12}`,
            consoleColors.info,
            consoleColors.value
        );
        this.dataArray.currentIndex += sdtaChunk.size - 12;
        
        // PDTA
        SpessaSynthInfo("%cLoading preset data chunk...", consoleColors.warn);
        let presetChunk = readRIFFChunk(this.dataArray);
        this.verifyHeader(presetChunk, "list");
        readBytesAsString(presetChunk.chunkData, 4);
        
        // read the hydra chunks
        const presetHeadersChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetHeadersChunk, "phdr");
        
        const presetZonesChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetZonesChunk, "pbag");
        
        const presetModulatorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetModulatorsChunk, "pmod");
        
        const presetGeneratorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetGeneratorsChunk, "pgen");
        
        const presetInstrumentsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentsChunk, "inst");
        
        const presetInstrumentZonesChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentZonesChunk, "ibag");
        
        const presetInstrumentModulatorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentModulatorsChunk, "imod");
        
        const presetInstrumentGeneratorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentGeneratorsChunk, "igen");
        
        const presetSamplesChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetSamplesChunk, "shdr");
        
        /**
         * read all the samples
         * (the current index points to start of the smpl read)
         */
        this.dataArray.currentIndex = this.sampleDataStartIndex;
        this.samples.push(...readSamples(presetSamplesChunk, sampleData, !isSF2Pack));
        
        /**
         * read all the instrument generators
         * @type {Generator[]}
         */
        let instrumentGenerators = readGenerators(presetInstrumentGeneratorsChunk);
        
        /**
         * read all the instrument modulators
         * @type {Modulator[]}
         */
        let instrumentModulators = readModulators(presetInstrumentModulatorsChunk);
        
        /**
         * read all the instrument zones
         * @type {InstrumentZone[]}
         */
        let instrumentZones = readInstrumentZones(
            presetInstrumentZonesChunk,
            instrumentGenerators,
            instrumentModulators,
            this.samples
        );
        
        this.instruments = readInstruments(presetInstrumentsChunk, instrumentZones);
        
        /**
         * read all the preset generators
         * @type {Generator[]}
         */
        let presetGenerators = readGenerators(presetGeneratorsChunk);
        
        /**
         * Read all the preset modulatorrs
         * @type {Modulator[]}
         */
        let presetModulators = readModulators(presetModulatorsChunk);
        
        let presetZones = readPresetZones(presetZonesChunk, presetGenerators, presetModulators, this.instruments);
        
        this.presets.push(...readPresets(presetHeadersChunk, presetZones, this));
        this.presets.sort((a, b) => (a.program - b.program) + (a.bank - b.bank));
        this._parseInternal();
        SpessaSynthInfo(
            `%cParsing finished! %c"${this.soundFontInfo["INAM"]}"%c has %c${this.presets.length} %cpresets,
        %c${this.instruments.length}%c instruments and %c${this.samples.length}%c samples.`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info
        );
        SpessaSynthGroupEnd();
        
        if (isSF2Pack)
        {
            delete this.dataArray;
        }
    }
    
    /**
     * @param chunk {RiffChunk}
     * @param expected {string}
     */
    verifyHeader(chunk, expected)
    {
        if (chunk.header.toLowerCase() !== expected.toLowerCase())
        {
            SpessaSynthGroupEnd();
            this.parsingError(`Invalid chunk header! Expected "${expected.toLowerCase()}" got "${chunk.header.toLowerCase()}"`);
        }
    }
    
    /**
     * @param text {string}
     * @param expected {string}
     */
    verifyText(text, expected)
    {
        if (text.toLowerCase() !== expected.toLowerCase())
        {
            SpessaSynthGroupEnd();
            this.parsingError(`Invalid FourCC: Expected "${expected.toLowerCase()}" got "${text.toLowerCase()}"\``);
        }
    }
    
    /**
     * @param supported {uint32}
     * @param bankFlags {uint32}
     * @param branch {uint8}
     * @param leaf {uint8}
     */
    verifyFlag(supported, bankFlags, branch, leaf)
    {
        if (parseInt(supported & bankFlags) != bankFlags) // Using a strict inequality breaks this code.
        {
            SpessaSynthWarn(`Feature not fully supported at branch ${branch} leaf ${leaf}.`);
        }
    }

    destroySoundBank()
    {
        super.destroySoundBank();
        delete this.dataArray;
    }
}