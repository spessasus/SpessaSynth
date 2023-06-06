import {RiffChunk} from "./riff_chunk.js";
import {ShiftableByteArray} from "../../utils/shiftable_array.js";
import {readByte, readBytesAsUintLittleEndian, readBytesAsString, signedInt16, signedInt8} from "../../utils/byte_functions.js";
import {SoundFont2} from "../soundfont_parser.js";
/**
 * Reads the sampleOptions from the shdr chunk
 * @param sampleHeadersChunk {RiffChunk}
 * @returns {Sample[]}
 */
export function readSamples(sampleHeadersChunk)
{
    let samples = [];
    while(sampleHeadersChunk.chunkData.length > sampleHeadersChunk.chunkData.currentIndex)
    {
        samples.push(readSample(sampleHeadersChunk.chunkData));
    }
    return samples;
}

/**
 * Reads it into a sample
 * @param sampleHeaderData {ShiftableByteArray}
 * @returns {Sample}
 */
function readSample(sampleHeaderData) {

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
        sampleType);
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
                sampleType) {
        this.sampleName = sampleName
        this.sampleStartIndex = sampleStartIndex;
        this.sampleEndIndex = sampleEndIndex;
        this.sampleLoopStartIndex = sampleLoopStartIndex;
        this.sampleLoopEndIndex = sampleLoopEndIndex;
        this.sampleRate = sampleRate;
        this.samplePitch = samplePitch;
        this.samplePitchCorrection = samplePitchCorrection;
        this.sampleLink = sampleLink;
        this.sampleType = sampleType;
        this.sampleLength = this.sampleEndIndex - this.sampleStartIndex;
    }

    /**
     * creates an audio buffer and stores it for reuse
     * @param context {BaseAudioContext}
     * @param startAddr {number}
     * @param endAddr {number}
     * @returns {AudioBuffer}
     */
    getBuffer(context, startAddr, endAddr)
    {
        if(!this.buffer)
        {
            this.buffer = this.getOffsetBuffer(context, window.soundFontParser, 0, 0);
        }
        // if no offset, return saved buffer
        if(this.buffer && startAddr === 0 && endAddr === 0)
        {
            return this.buffer;
        }

        return this.getOffsetBuffer(context, window.soundFontParser, startAddr, endAddr);
    }

    /**
     * Creates audio buffer
     * @param context {BaseAudioContext}
     * @param soundFont {SoundFont2}
     * @param startOffset {number}
     * @param endOffset {number}
     * @returns {AudioBuffer}
     */
    getOffsetBuffer(context, soundFont, startOffset, endOffset)
    {
        const soundfontFileArray = soundFont.dataArray;
        // read the sample data
        const audioData =  new Float32Array(((this.sampleEndIndex - this.sampleStartIndex) / 2) + 1);
        soundfontFileArray.currentIndex = window.soundFontParser.sampleDataStartIndex;

        for(let i = this.sampleStartIndex + startOffset * 2; i < this.sampleEndIndex + endOffset * 2; i += 2)
        {
            // convert 2 uint8 bytes to singed int16
            const byte1 = soundfontFileArray[soundfontFileArray.currentIndex + i];
            const byte2 = soundfontFileArray[soundfontFileArray.currentIndex + i + 1];

            audioData[(i - this.sampleStartIndex - startOffset * 2) / 2] = signedInt16(byte1, byte2) / 32768;
        }

        let buffer;
        switch(this.sampleType)
        {
            case "leftSample":
            case "RomLeftSample":
                buffer = context.createBuffer(2, audioData.length, this.sampleRate);
                buffer.getChannelData(0).set(audioData);
                break;

            case "rightSample":
            case "RomRightSample":
                buffer = context.createBuffer(2, audioData.length, this.sampleRate);
                buffer.getChannelData(1).set(audioData);
                break;

            default:
                buffer = context.createBuffer(1, audioData.length, this.sampleRate);
                buffer.getChannelData(0).set(audioData);
                break;
        }
        return buffer;
    }

    /**
     * calculates the playback rate
     * @param midiNote {number}
     * @param overridingRootKey {number}
     * @returns {number}
     */
    getPlaybackRate(midiNote, overridingRootKey=undefined)
    {
        // const diff = midiNote - this.samplePitch;
        // return 1 + diff / 128;
        // const baseDetune = 100 * this.samplePitch// + this.samplePitchCorrection;// this breaks it for some fucking reason
        // const cents = midiNote * 100 - baseDetune;
        // return Math.pow(2, cents / 1200);
        let pitch = this.samplePitch;
        if(overridingRootKey)
        {
            pitch = overridingRootKey
        }
        return Math.pow(2, (1/12) * (midiNote - pitch)) * Math.pow(2, this.samplePitchCorrection / 1200);
    }
}