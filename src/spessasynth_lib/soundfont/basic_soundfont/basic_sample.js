/**
 * samples.js
 * purpose: parses soundfont samples, resamples if needed.
 * loads sample data, handles async loading of sf3 compressed samples
 */
import { SpessaSynthWarn } from "../../utils/loggin.js";

export class BasicSample
{
    /**
     * The basic representation of a soundfont sample
     * @param sampleName {string} The sample's name
     * @param sampleRate {number} The sample's rate in Hz
     * @param samplePitch {number} The sample's pitch as a MIDI note number
     * @param samplePitchCorrection {number} The sample's pitch correction in cents
     * @param sampleLink {number} The sample's link, currently unused
     * @param sampleType {number} The sample's type, an enum
     * @param loopStart {number} The sample's loop start relative to the sample start in sample points
     * @param loopEnd {number} The sample's loop end relative to the sample start in sample points
     */
    constructor(
        sampleName,
        sampleRate,
        samplePitch,
        samplePitchCorrection,
        sampleLink,
        sampleType,
        loopStart,
        loopEnd
    )
    {
        /**
         * Sample's name
         * @type {string}
         */
        this.sampleName = sampleName;
        /**
         * Sample rate in Hz
         * @type {number}
         */
        this.sampleRate = sampleRate;
        /**
         * Original pitch of the sample as a MIDI note number
         * @type {number}
         */
        this.samplePitch = samplePitch;
        /**
         * Pitch correction, in cents. Can be negative
         * @type {number}
         */
        this.samplePitchCorrection = samplePitchCorrection;
        /**
         * Sample link, currently unused.
         * @type {number}
         */
        this.sampleLink = sampleLink;
        /**
         * Type of the sample, an enum
         * @type {number}
         */
        this.sampleType = sampleType;
        /**
         * Relative to start of the sample in sample points
         * @type {number}
         */
        this.sampleLoopStartIndex = loopStart;
        /**
         * Relative to start of the sample in sample points
         * @type {number}
         */
        this.sampleLoopEndIndex = loopEnd;
        
        /**
         * Indicates if the sample is compressed
         * @type {boolean}
         */
        this.isCompressed = (sampleType & 0x10) > 0;
        
        /**
         * The compressed sample data if it was compressed by spessasynth
         * @type {Uint8Array}
         */
        this.compressedData = undefined;
        
        /**
         * The sample's use count
         * @type {number}
         */
        this.useCount = 0;
        
        /**
         * The sample's audio data
         * @type {Float32Array}
         */
        this.sampleData = undefined;
    }
    
    /**
     * @returns {Uint8Array|IndexedByteArray}
     */
    getRawData()
    {
        const uint8 = new Uint8Array(this.sampleData.length * 2);
        for (let i = 0; i < this.sampleData.length; i++)
        {
            const sample = Math.floor(this.sampleData[i] * 32768);
            uint8[i * 2] = sample & 0xFF; // lower byte
            uint8[i * 2 + 1] = (sample >> 8) & 0xFF; // upper byte
        }
        return uint8;
    }
    
    /**
     * @param quality {number}
     * @param encodeVorbis {EncodeVorbisFunction}
     */
    compressSample(quality, encodeVorbis)
    {
        // no need to compress
        if (this.isCompressed)
        {
            return;
        }
        // compress, always mono!
        try
        {
            this.compressedData = encodeVorbis([this.getAudioData()], 1, this.sampleRate, quality);
            // flag as compressed
            this.sampleType |= 0x10;
            this.isCompressed = true;
        }
        catch (e)
        {
            SpessaSynthWarn(`Failed to compress ${this.sampleName}. Leaving as uncompressed!`);
            this.isCompressed = false;
            this.compressedData = undefined;
            // flag as uncompressed
            this.sampleType &= 0xEF;
        }
        
    }
    
    /**
     * @returns {Float32Array}
     */
    getAudioData()
    {
        return this.sampleData;
    }
}