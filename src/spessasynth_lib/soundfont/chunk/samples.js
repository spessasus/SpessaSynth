import {RiffChunk} from "./riff_chunk.js";
import {ShiftableByteArray} from "../../utils/shiftable_array.js";
import {readByte, readBytesAsUintLittleEndian, readBytesAsString, signedInt8} from "../../utils/byte_functions.js";
import { stbvorbis} from '../../utils/stbvorbis_sync.js'
import { SpessaSynthWarn } from '../../utils/loggin.js'

/**
 * samples.js
 * purpose: parses soundfont samples, resamples if needed.
 * loads sample data, handles async loading of sf3 compressed samples
 */

/**
 * Reads the generatorTranslator from the shdr chunk
 * @param sampleHeadersChunk {RiffChunk}
 * @param smplChunkData {ShiftableByteArray}
 * @returns {Sample[]}
 */
export function readSamples(sampleHeadersChunk, smplChunkData)
{
    /**
     * @type {Sample[]}
     */
    let samples = [];
    while(sampleHeadersChunk.chunkData.length > sampleHeadersChunk.chunkData.currentIndex)
    {
        const sample = readSample(sampleHeadersChunk.chunkData, smplChunkData);
        samples.push(sample);
    }
    return samples;
}

/**
 * Reads it into a sample
 * @param sampleHeaderData {ShiftableByteArray}
 * @param smplArrayData {ShiftableByteArray}
 * @returns {Sample}
 */
function readSample(sampleHeaderData, smplArrayData) {

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
    let samplePitch = readByte(sampleHeaderData);
    if(samplePitch === 255)
    {
        // if it's 255, then default to 60
        samplePitch = 60;
    }

    // readt the sample pitch correction
    let samplePitchCorrection = signedInt8(readByte(sampleHeaderData));


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
        smplArrayData);
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
     * @param smplArr {ShiftableByteArray}
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
                smplArr) {
        this.sampleName = sampleName
        // in bytes
        this.sampleStartIndex = sampleStartIndex;
        this.sampleEndIndex = sampleEndIndex;
        this.isSampleLoaded = false;

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

        if (this.sampleLength < 1 || this.sampleName.substring(0, 3).toLowerCase() === "eos") {
            return;
        }

        if(this.isCompressed)
        {
            // correct loop points
            this.sampleLoopStartIndex += this.sampleStartIndex;
            this.sampleLoopEndIndex += this.sampleStartIndex;
            this.sampleLength = 99999999; // set to 999999 before we decode it
        }

    }

    /**
     * @param smplArr {ShiftableByteArray}
     */
    decodeVorbis(smplArr)
    {
        if (this.sampleLength < 1) {
            // eos, do not do anything
            return;
        }
        // get the compressed byte stream
        const smplStart = smplArr.currentIndex;
        const buff = smplArr.slice(this.sampleStartIndex / 2 + smplStart, this.sampleEndIndex / 2 + smplStart);
        // reset array and being decoding
        this.sampleData = new Float32Array(0);
        const vorbis = stbvorbis.decode(buff.buffer);
        this.sampleData = vorbis.data[0];
    }

    /**
     * creates a sample sampleData and stores it for reuse
     * @param startAddrOffset {number}
     * @param endAddrOffset {number}
     * @returns {Float32Array} The audioData
     */
     getAudioData(startAddrOffset = 0, endAddrOffset = 0) {
        if (!this.isSampleLoaded) {
            // start loading data if not loaded
            return this.loadBufferData();
        }
        // if no offset, return saved sampleData
        if (this.sampleData && startAddrOffset === 0 && endAddrOffset === 0) {
            return this.sampleData;
        }

        return this.getOffsetData(startAddrOffset, endAddrOffset);
    }

    /**
     * @param smplArr {ShiftableByteArray}
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
    loadBufferData() {
        if (this.sampleLength < 1) {
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

    /**
     * Creates a sample sampleData
     * @param startOffset {number}
     * @param endOffset {number}
     * @returns {Float32Array}
     */
    getOffsetData(startOffset, endOffset) {
        return this.sampleData.subarray(startOffset, this.sampleData.length - endOffset + 1);
    }
}