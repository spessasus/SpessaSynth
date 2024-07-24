import {RiffChunk} from "./riff_chunk.js";
import {IndexedByteArray} from "../../utils/indexed_array.js";
import { readBytesAsUintLittleEndian, signedInt8} from "../../utils/byte_functions/little_endian.js";
import { stbvorbis } from '../../utils/stbvorbis_sync.min.js'
import { SpessaSynthWarn } from '../../utils/loggin.js'
import { readBytesAsString } from '../../utils/byte_functions/string.js'

/**
 * samples.js
 * purpose: parses soundfont samples, resamples if needed.
 * loads sample data, handles async loading of sf3 compressed samples
 */

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

export class Sample {
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
        this.sampleName = sampleName
        // in bytes
        this.sampleStartIndex = sampleStartIndex;
        this.sampleEndIndex = sampleEndIndex;
        this.isSampleLoaded = false;
        this.sampleID = sampleIndex;
        this.useCount = 0;

        this.sampleLoopStartIndex = sampleLoopStartIndex - sampleStartIndex;
        this.sampleLoopEndIndex = sampleLoopEndIndex - sampleStartIndex;
        this.sampleRate = sampleRate;
        this.samplePitch = samplePitch;
        this.samplePitchCorrection = samplePitchCorrection;
        this.sampleLink = sampleLink;
        this.sampleType = sampleType;
        // in bytes
        this.sampleLength = this.sampleEndIndex - this.sampleStartIndex;
        this.indexRatio = 1;
        this.sampleDataArray = smplArr;
        this.sampleData = new Float32Array(0);
        this.sampleLengthSeconds = this.sampleLength / (this.sampleRate * 2);
        this.loopAllowed = this.sampleLoopStartIndex !== this.sampleLoopEndIndex;
        this.isCompressed = (this.sampleType & 0x10) > 0;
        if(this.isCompressed)
        {
            // correct loop points
            this.sampleLoopStartIndex += this.sampleStartIndex;
            this.sampleLoopEndIndex += this.sampleStartIndex;
            this.sampleLength = 99999999; // set to 999999 before we decode it
        }

    }

    /**
     * @param smplArr {IndexedByteArray}
     */
    decodeVorbis(smplArr)
    {
        if (this.sampleLength < 1)
        {
            // eos, do not do anything
            return;
        }
        // get the compressed byte stream
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
     * @param smplArr {IndexedByteArray}
     * @returns {Float32Array}
     */
    loadUncompressedData(smplArr)
    {
        if(this.isCompressed)
        {
            SpessaSynthWarn("Trying to load a compressed sample via loadUncompressedData()... aborting!");
            return new Float32Array(0);
        }

        // read the sample data
        let audioData = new Float32Array(this.sampleLength / 2 + 1);
        const dataStartIndex = smplArr.currentIndex;
        let convertedSigned16 = new Int16Array(
            smplArr.slice(dataStartIndex + this.sampleStartIndex, dataStartIndex + this.sampleEndIndex)
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
            this.decodeVorbis(this.sampleDataArray);
            this.isSampleLoaded = true;
            return this.sampleData;
        }
        return this.loadUncompressedData(this.sampleDataArray);
    }
}