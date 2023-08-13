import {RiffChunk} from "./riff_chunk.js";
import {ShiftableByteArray} from "../../utils/shiftable_array.js";
import {readByte, readBytesAsUintLittleEndian, readBytesAsString, signedInt8} from "../../utils/byte_functions.js";
/**
 * Reads the sampleOptions from the shdr chunk
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

        if(samples.length % 1000 === 0)
        {
            console.log(`Loaded ${samples.length} samples...`);
        }
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

    // read the sample type
    let sampleTypes = {
        0: "EOS",
        1: "monoSample",
        2: "rightSample",
        4: "leftSample",
        8: "linkedSample",
        32769: "RomMonoSample",
        32770: "RomRightSample",
        32772: "RomLeftSample",
        32776: "RomLinkedSample"
    }
    let sampleType = readBytesAsUintLittleEndian(sampleHeaderData, 2);
    if(sampleTypes[sampleType])
    {
        sampleType = sampleTypes[sampleType];
    }
    else
    {
        sampleType = sampleType.toString();
    }



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

export class Sample{
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
     * @param sampleType {"EOS"|
     * "monoSample"|
     * "rightSample"|
     * "leftSample"|
     * "linkedSample"|
     * "RomMonoSample"|
     * "RomRightSample"|
     * "RomLeftSample"|
     * "RomLinkedSample"}
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
        this.sampleStartIndex = sampleStartIndex;
        this.sampleEndIndex = sampleEndIndex;
        this.sampleLoopStartIndex = sampleLoopStartIndex - sampleStartIndex;
        this.sampleLoopEndIndex = sampleLoopEndIndex - sampleStartIndex;
        this.sampleRate = sampleRate;
        this.samplePitch = samplePitch;
        this.samplePitchCorrection = samplePitchCorrection;
        this.sampleLink = sampleLink;
        this.sampleType = sampleType;
        this.sampleLength = this.sampleEndIndex - this.sampleStartIndex;
        this.indexRatio = 1;
        this.sampleDataArray = smplArr;

        if(this.sampleLength < 1 || this.sampleName.substring(0, 3).toLowerCase() === "eos")
        {
            return;
        }


        // try to create an audioBuffer, if unable to, resample the sample now, otherwise just load it dynamically
        try {
            this.buffer = new AudioBuffer({
                length: this.sampleLength / 2 + 1,
                sampleRate: this.sampleRate
            });
        }
        catch (e) {
            console.warn(`Error creating an audio buffer for ${this.sampleName}! Resampling the sample from ${this.sampleRate} to ${FIX_SAMPLERATE} to fix...`);
            const arr = this.loadBufferData(smplArr);
            this.sampleData = this.resampleData(arr);

            this.buffer = new AudioBuffer({
                length: this.sampleData.length,
                sampleRate: FIX_SAMPLERATE
            });
            this.buffer.getChannelData(0).set(this.sampleData);
        }
    }

    /**
     * creates a sample sampleData and stores it for reuse
     * @param startAddrOffset {number}
     * @param endAddrOffset {number}
     * @returns {Float32Array}
     */
    getAudioData(startAddrOffset = 0, endAddrOffset = 0)
    {
        if(!this.sampleData)
        {
            this.sampleData = this.loadBufferData(this.sampleDataArray);
        }
        // if no offset, return saved sampleData
        if(this.sampleData && startAddrOffset === 0 && endAddrOffset === 0)
        {
            return this.sampleData;
        }

        return this.getOffsetData(startAddrOffset, endAddrOffset);
    }

    /**
     * Creates an audioBuffer for later reuse
     * @param context {BaseAudioContext}
     * @param startAddrOffset {number}
     * @param endAddrOffset {number}
     * @returns {AudioBuffer}
     */
    getAudioBuffer(context, startAddrOffset, endAddrOffset)
    {
        if(!this.sampleData)
        {
            this.sampleData = this.loadBufferData(this.sampleDataArray);
            this.buffer.getChannelData(0).set(this.sampleData);
        }
        if(startAddrOffset === 0 && endAddrOffset === 0)
        {
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
    resampleData(audioData)
    {
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
    loadBufferData(smplArr)
    {
        if(this.sampleLength < 1)
        {
            // eos, do not do anything
            return new Float32Array(1);
        }
        // read the sample data
        let audioData =  new Float32Array(this.sampleLength / 2 + 1);
        const dataStartIndex = smplArr.currentIndex

        for(let i = this.sampleStartIndex; i < this.sampleEndIndex; i += 2)
        {
            // convert 2 uint8 bytes to singed int16
            let val  = (smplArr[dataStartIndex + i + 1] << 8) | smplArr[dataStartIndex + i];
            if(val > 32767)
            {
                val -= 65536
            }

            audioData[(i - this.sampleStartIndex) / 2] = val / 32768;
        }
        return audioData;
    }

    /**
     * Creates a sample sampleData
     * @param startOffset {number}
     * @param endOffset {number}
     * @returns {Float32Array}
     */
    getOffsetData(startOffset, endOffset)
    {
        // const soundfontFileArray = soundFont.dataArray;
        // // read the sample data
        // const audioData =  new Float32Array(((this.sampleEndIndex - this.sampleStartIndex) / 2) + 1);
        // soundfontFileArray.currentIndex = soundFont.sampleDataStartIndex;
        //
        // for(let i = this.sampleStartIndex + startOffset * 2; i < this.sampleEndIndex + endOffset * 2; i += 2)
        // {
        //     // convert 2 uint8 bytes to singed int16
        //     let val  = (soundfontFileArray[soundfontFileArray.currentIndex + i + 1] << 8) | soundfontFileArray[soundfontFileArray.currentIndex + i];
        //     if(val > 32767)
        //     {
        //         val -= 65536
        //     }
        //
        //     audioData[(i - this.sampleStartIndex - startOffset * 2) / 2] = val / 32768;
        // }
        return this.sampleData.subarray(startOffset, this.sampleData.length - endOffset + 1);
    }

    /**
     * calculates the playback rate
     * @param midiNote {number}
     * @param overridingRootKey {number}
     * @returns {number}
     */
    getPlaybackRate(midiNote, overridingRootKey=undefined)
    {
        let pitch = this.samplePitch;
        if(overridingRootKey)
        {
            pitch = overridingRootKey
        }
        return Math.pow(2, (1/12) * (midiNote - pitch)) * Math.pow(2, this.samplePitchCorrection / 1200);
    }
}