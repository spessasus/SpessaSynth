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
     * @param sampleName {string}
     * @param sampleRate {number}
     * @param samplePitch {number}
     * @param samplePitchCorrection {number}
     * @param sampleLink {number}
     * @param sampleType {number}
     * @param loopStart {number} relative to sample start
     * @param loopEnd {number} relative to sample start
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
    }
    
    /**
     * @returns {Uint8Array|IndexedByteArray}
     */
    getRawData()
    {
        const e = new Error("Not implemented");
        e.name = "NotImplementedError";
        throw e;
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
            this.sampleType &= -17;
        }
        
    }
    
    /**
     * @returns {Float32Array}
     */
    getAudioData()
    {
        const e = new Error("Not implemented");
        e.name = "NotImplementedError";
        throw e;
    }
}