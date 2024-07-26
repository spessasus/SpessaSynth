import {RiffChunk} from "./riff_chunk.js";
import {IndexedByteArray} from "../../utils/indexed_array.js";
import { readBytesAsUintLittleEndian, signedInt8} from "../../utils/byte_functions/little_endian.js";
import { stbvorbis } from '../../externals/stbvorbis_sync.min.js'
import { SpessaSynthWarn } from '../../utils/loggin.js'
import { readBytesAsString } from '../../utils/byte_functions/string.js'
import { encodeVorbis } from '../../utils/encode_vorbis.js'

/**
 * samples.js
 * purpose: parses soundfont samples, resamples if needed.
 * loads sample data, handles async loading of sf3 compressed samples
 */

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
         * Relative to start of the sample, bytes
         * @type {number}
         */
        this.sampleLoopStartIndex = loopStart;
        /**
         * Relative to start of the sample, in bytes
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
     */
    compressSample(quality)
    {
        // no need to compress
        if(this.isCompressed)
        {
            return;
        }
        // compress, always mono!
        try {
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

export class Sample extends BasicSample
{
    /**
     * Creates a sample
     * @param sampleName {string}
     * @param sampleStartIndex {number}
     * @param sampleEndIndex {number}
     * @param sampleLoopStartIndex {number}
     * @param sampleLoopEndIndex {number}
     * @param sampleRate {number}
     * @param samplePitch {number}
     * @param samplePitchCorrection {number}
     * @param sampleLink {number}
     * @param sampleType {number}
     * @param smplArr {IndexedByteArray}
     * @param sampleIndex {number} initial sample index when loading the sfont
     */
    constructor(sampleName,
                sampleStartIndex,
                sampleEndIndex,
                sampleLoopStartIndex,
                sampleLoopEndIndex,
                sampleRate,
                samplePitch,
                samplePitchCorrection,
                sampleLink,
                sampleType,
                smplArr,
                sampleIndex
                )
    {
        super(
            sampleName,
            sampleRate,
            samplePitch,
            samplePitchCorrection,
            sampleLink,
            sampleType,
            sampleLoopStartIndex - sampleStartIndex,
            sampleLoopEndIndex - sampleStartIndex
            );
        this.sampleName = sampleName
        // in bytes
        this.sampleStartIndex = sampleStartIndex;
        this.sampleEndIndex = sampleEndIndex;
        this.isSampleLoaded = false;
        this.sampleID = sampleIndex;
        this.useCount = 0;
        // in bytes
        this.sampleLength = this.sampleEndIndex - this.sampleStartIndex;
        this.indexRatio = 1;
        this.sampleDataArray = smplArr;
        this.sampleData = new Float32Array(0);
        if(this.isCompressed)
        {
            // correct loop points
            this.sampleLoopStartIndex += this.sampleStartIndex;
            this.sampleLoopEndIndex += this.sampleStartIndex;
            this.sampleLength = 99999999; // set to 999999 before we decode it
        }

    }

    /**
     * Get raw data, whether it's compressed or not as we simply write it to the file
     * @return {Uint8Array}
     */
    getRawData()
    {
        const smplArr = this.sampleDataArray;
        if(this.isCompressed)
        {
            if(this.compressedData)
            {
                return this.compressedData;
            }
            const smplStart = smplArr.currentIndex;
            return smplArr.slice(this.sampleStartIndex / 2 + smplStart, this.sampleEndIndex / 2 + smplStart);
        }
        else
        {
            const dataStartIndex = smplArr.currentIndex;
            return smplArr.slice(dataStartIndex + this.sampleStartIndex, dataStartIndex + this.sampleEndIndex)
        }
    }

    /**
     * Decode binary vorbis into a float32 pcm
     */
    decodeVorbis()
    {
        if (this.sampleLength < 1)
        {
            // eos, do not do anything
            return;
        }
        // get the compressed byte stream
        const smplArr = this.sampleDataArray;
        const smplStart = smplArr.currentIndex;
        const buff = smplArr.slice(this.sampleStartIndex / 2 + smplStart, this.sampleEndIndex / 2 + smplStart);
        // reset array and being decoding
        this.sampleData = new Float32Array(0);
        /**
         * @type {{data: Float32Array[], error: (string|null), sampleRate: number, eof: boolean}}
         */
        const vorbis = stbvorbis.decode(buff.buffer);
        this.sampleData = vorbis.data[0];
    }

    /**
     * Loads the audio data and stores it for reuse
     * @returns {Float32Array} The audioData
     */
    getAudioData()
    {
        if (!this.isSampleLoaded)
        {
            // start loading data if not loaded
            return this.loadBufferData();
        }
        return this.sampleData;
    }

    /**
     * @returns {Float32Array}
     */
    loadUncompressedData()
    {
        if(this.isCompressed)
        {
            SpessaSynthWarn("Trying to load a compressed sample via loadUncompressedData()... aborting!");
            return new Float32Array(0);
        }

        // read the sample data
        let audioData = new Float32Array(this.sampleLength / 2);
        const dataStartIndex = this.sampleDataArray.currentIndex;
        let convertedSigned16 = new Int16Array(
            this.sampleDataArray.slice(dataStartIndex + this.sampleStartIndex, dataStartIndex + this.sampleEndIndex)
                .buffer
        );

        // convert to float
        for(let i = 0; i < convertedSigned16.length; i++)
        {
            audioData[i] = convertedSigned16[i] / 32768;
        }

        this.sampleData = audioData;
        this.isSampleLoaded = true;
        return audioData;
    }

    /**
     * @returns {Float32Array}
     */
    loadBufferData()
    {
        if (this.sampleLength < 1)
        {
            // eos, do not do anything
            return new Float32Array(1);
        }

        if(this.isCompressed)
        {
            this.decodeVorbis();
            this.isSampleLoaded = true;
            return this.sampleData;
        }
        return this.loadUncompressedData();
    }
}

/**
 * Reads the generatorTranslator from the shdr read
 * @param sampleHeadersChunk {RiffChunk}
 * @param smplChunkData {IndexedByteArray}
 * @returns {Sample[]}
 */
export function readSamples(sampleHeadersChunk, smplChunkData)
{
    /**
     * @type {Sample[]}
     */
    let samples = [];
    let index = 0;
    while(sampleHeadersChunk.chunkData.length > sampleHeadersChunk.chunkData.currentIndex)
    {
        const sample = readSample(index, sampleHeadersChunk.chunkData, smplChunkData);
        samples.push(sample);
        index++;
    }
    // remove EOS
    if (samples.length > 1)
    {
        samples.pop();
    }
    return samples;
}

/**
 * Reads it into a sample
 * @param index {number}
 * @param sampleHeaderData {IndexedByteArray}
 * @param smplArrayData {IndexedByteArray}
 * @returns {Sample}
 */
function readSample(index, sampleHeaderData, smplArrayData) {

    // read the sample name
    let sampleName = readBytesAsString(sampleHeaderData, 20);

    // read the sample start index
    let sampleStartIndex = readBytesAsUintLittleEndian(sampleHeaderData, 4) * 2;

    // read the sample end index
    let sampleEndIndex = readBytesAsUintLittleEndian(sampleHeaderData, 4) * 2;

    // read the sample looping start index
    let sampleLoopStartIndex = readBytesAsUintLittleEndian(sampleHeaderData, 4) * 2;

    // read the sample looping end index
    let sampleLoopEndIndex = readBytesAsUintLittleEndian(sampleHeaderData, 4) * 2;

    // read the sample rate
    let sampleRate = readBytesAsUintLittleEndian(sampleHeaderData, 4);

    // read the original sample pitch
    let samplePitch = sampleHeaderData[sampleHeaderData.currentIndex++];
    if(samplePitch === 255)
    {
        // if it's 255, then default to 60
        samplePitch = 60;
    }

    // readt the sample pitch correction
    let samplePitchCorrection = signedInt8(sampleHeaderData[sampleHeaderData.currentIndex++]);


    // read the link to the other channel
    let sampleLink = readBytesAsUintLittleEndian(sampleHeaderData, 2);
    let sampleType = readBytesAsUintLittleEndian(sampleHeaderData, 2);



    return new Sample(sampleName,
        sampleStartIndex,
        sampleEndIndex,
        sampleLoopStartIndex,
        sampleLoopEndIndex,
        sampleRate,
        samplePitch,
        samplePitchCorrection,
        sampleLink,
        sampleType,
        smplArrayData,
        index);
}