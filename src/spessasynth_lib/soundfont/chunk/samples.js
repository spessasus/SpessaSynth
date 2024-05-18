import {RiffChunk} from "./riff_chunk.js";
import {ShiftableByteArray} from "../../utils/shiftable_array.js";
import {readByte, readBytesAsUintLittleEndian, readBytesAsString, signedInt8} from "../../utils/byte_functions.js";
import { consoleColors } from '../../utils/other.js';
/**
 * Reads the generatorTranslator from the shdr chunk
 * @param sampleHeadersChunk {RiffChunk}
 * @param smplChunkData {ShiftableByteArray}
 * @returns {Sample[]}
 */

const FIX_SAMPLERATE = 44100    ;

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


        // try to create an audioBuffer, if unable to, resample the sample now, otherwise just load it dynamically
        try {
            this.buffer = new AudioBuffer({
                length: this.sampleLength / 2 + 1,
                sampleRate: this.sampleRate
            });
        } catch (e) {
            console.warn(`Error creating an audio buffer for ${this.sampleName}! Resampling the sample from ${this.sampleRate} to ${FIX_SAMPLERATE} to fix...`);
            this.loadBufferData().then(arr => {
                /**
                 * @type {Float32Array}
                 */
                this.sampleData = this.resampleData(arr);
                this.buffer = new AudioBuffer({
                    length: this.sampleData.length,
                    sampleRate: FIX_SAMPLERATE
                });
                this.buffer.getChannelData(0).set(this.sampleData);
            })
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
    async decodeVorbis(smplArr)
    {
        if (this.sampleLength < 1) {
            // eos, do not do anything
            return;
        }
        // get the compressed byte stream
        const smplStart = smplArr.currentIndex;
        const buff = smplArr.slice(this.sampleStartIndex / 2 + smplStart, this.sampleEndIndex / 2 + smplStart);
        await new Promise((resolve) => {
            // reset array and being decoding
            this.sampleData = new Float32Array(0);
            stbvorbis.decode(buff.buffer, decoded =>
            {
                // check for errors
                if(decoded.error !== null)
                {
                    console.warn("%cError decoding sample! " + decoded.error,
                        consoleColors.unrecognized);
                    this.sampleData = new Float32Array(0);
                }

                // check if we finished decoding
                if(decoded.eof === false)
                {
                    /**
                     * @type {Float32Array}
                     */
                    const decodedData = decoded.data[0];

                    // add the chunk of data
                    const addedData = new Float32Array(this.sampleData.length + decodedData.length);
                    addedData.set(this.sampleData, 0);
                    addedData.set(decodedData, this.sampleData.length);
                    this.sampleData = addedData;
                }
                else
                {
                    if(decoded.data) {
                        /**
                         * if any data remains, add it
                         * @type {Float32Array}
                         */
                        const decodedData = decoded.data[0];
                        const addedData = new Float32Array(this.sampleData.length + decodedData.length);
                        addedData.set(this.sampleData, 0);
                        addedData.set(decodedData, this.sampleData.length);
                        this.sampleData = addedData;
                    }

                    // correct sample length and resolve decoding
                    this.sampleLength = this.sampleData.length * 2;
                    resolve();
                }
            })
        });
    }

    /**
     * creates a sample sampleData and stores it for reuse
     * @param startAddrOffset {number}
     * @param endAddrOffset {number}
     * @returns {Promise<Float32Array>} The audioData
     */
     async getAudioData(startAddrOffset = 0, endAddrOffset = 0) {
        if (!this.isSampleLoaded) {
            // start loading data if not loaded
            return await this.loadBufferData();
        }
        // if no offset, return saved sampleData
        if (this.sampleData && startAddrOffset === 0 && endAddrOffset === 0) {
            return this.sampleData;
        }

        return this.getOffsetData(startAddrOffset, endAddrOffset);
    }

    /**
     * creates a sample sampleData and stores it for reuse. Note: this version ONLY SUPPORTS UNCOMPRESSED SAMPLES!
     * @param startAddrOffset {number}
     * @param endAddrOffset {number}
     * @returns {Float32Array} The audioData
     */
    getAudioDataSync(startAddrOffset = 0, endAddrOffset = 0)
    {
        if (!this.isSampleLoaded) {
            // start loading data if not loaded
            return this.loadUncompressedData(this.sampleDataArray);
        }
        // if no offset, return saved sampleData
        if (this.sampleData && startAddrOffset === 0 && endAddrOffset === 0) {
            return this.sampleData;
        }

        return this.getOffsetData(startAddrOffset, endAddrOffset);
    }

    /**
     * Creates an audioBuffer for later reuse
     * @param context {BaseAudioContext}
     * @param startAddrOffset {number}
     * @param endAddrOffset {number}
     * @returns {Promise<AudioBuffer>}
     */
    async getAudioBuffer(context, startAddrOffset, endAddrOffset) {
        // no sample data means no buffe
        if (!this.isSampleLoaded) {
            //  start loading the buffer if no data
            await this.loadBufferData()

            // if it was compressed, the length has changed
            if(this.sampleLength / 2 + 1 !== this.buffer.length)
            {
                this.buffer = new AudioBuffer({
                    length: this.sampleLength / 2 + 1,
                    sampleRate: this.sampleRate
                })
            }
            this.buffer.getChannelData(0).set(this.sampleData);
        }
        if (startAddrOffset === 0 && endAddrOffset === 0) {
            return this.buffer;
        }
        const data = this.getOffsetData(startAddrOffset, endAddrOffset);
        const buff = context.createBuffer(1, data.length, this.sampleRate);
        buff.getChannelData(0).set(data);
        return buff;
    }

    /**
     *
     * @param audioData {Float32Array}
     * @returns {Float32Array}
     */
    resampleData(audioData) {
        const lengthRatio = this.sampleRate / FIX_SAMPLERATE;
        const outputLength = Math.round(audioData.length / lengthRatio);
        const outputData = new Float32Array(outputLength);


        for (let i = 0; i < outputLength; i++) {
            const index = i * lengthRatio;
            const indexPrev = Math.floor(index);
            const indexNext = Math.min(indexPrev + 1, audioData.length - 1);
            const fraction = index - indexPrev;

            outputData[i] = (1 - fraction) * audioData[indexPrev] + fraction * audioData[indexNext];
        }

        // change every property correctly
        this.sampleData = outputData;
        this.sampleRate = FIX_SAMPLERATE;
        this.indexRatio = 1 / lengthRatio;
        this.sampleLoopStartIndex = Math.round(this.indexRatio * this.sampleLoopStartIndex);
        this.sampleLoopEndIndex = Math.round(this.indexRatio * this.sampleLoopEndIndex);
        return outputData;
    }

    /**
     * @param smplArr {ShiftableByteArray}
     * @returns {Float32Array}
     */
    loadUncompressedData(smplArr)
    {
        if(this.isCompressed)
        {
            console.warn("Trying to load a compressed sample via loadUncompressedData()... aborting!");
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
     * @returns {Promise<Float32Array>}
     */
    async loadBufferData() {
        if (this.sampleLength < 1) {
            // eos, do not do anything
            return new Float32Array(1);
        }

        if(this.isCompressed)
        {
            await this.decodeVorbis(this.sampleDataArray);
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