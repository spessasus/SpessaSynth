import { RiffChunk } from "../basic_soundfont/riff_chunk.js";
import { IndexedByteArray } from "../../utils/indexed_array.js";
import { readLittleEndian, signedInt8 } from "../../utils/byte_functions/little_endian.js";
import { stbvorbis } from "../../externals/stbvorbis_sync/stbvorbis_sync.min.js";
import { SpessaSynthWarn } from "../../utils/loggin.js";
import { readBytesAsString } from "../../utils/byte_functions/string.js";
import { BasicSample } from "../basic_soundfont/basic_sample.js";

export class SoundFontSample extends BasicSample
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
     * @param smplArr {IndexedByteArray|Float32Array}
     * @param sampleIndex {number} initial sample index when loading the sfont
     * @param isDataRaw {boolean} if false, the data is decoded as float32.
     * Used for SF2Pack support
     */
    constructor(
        sampleName,
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
        sampleIndex,
        isDataRaw
    )
    {
        super(
            sampleName,
            sampleRate,
            samplePitch,
            samplePitchCorrection,
            sampleLink,
            sampleType,
            sampleLoopStartIndex - (sampleStartIndex / 2),
            sampleLoopEndIndex - (sampleStartIndex / 2)
        );
        this.sampleName = sampleName;
        // in bytes
        this.sampleStartIndex = sampleStartIndex;
        this.sampleEndIndex = sampleEndIndex;
        this.isSampleLoaded = false;
        this.sampleID = sampleIndex;
        // in bytes
        this.sampleLength = this.sampleEndIndex - this.sampleStartIndex;
        this.sampleDataArray = smplArr;
        this.sampleData = new Float32Array(0);
        if (this.isCompressed)
        {
            // correct loop points
            this.sampleLoopStartIndex += this.sampleStartIndex / 2;
            this.sampleLoopEndIndex += this.sampleStartIndex / 2;
            this.sampleLength = 99999999; // set to 999,999 before we decode it
        }
        this.isDataRaw = isDataRaw;
    }
    
    /**
     * Get raw data, whether it's compressed or not as we simply write it to the file
     * @return {Uint8Array} either s16 or vorbis data
     */
    getRawData()
    {
        const smplArr = this.sampleDataArray;
        if (this.isCompressed)
        {
            if (this.compressedData)
            {
                return this.compressedData;
            }
            const smplStart = smplArr.currentIndex;
            return smplArr.slice(this.sampleStartIndex / 2 + smplStart, this.sampleEndIndex / 2 + smplStart);
        }
        else
        {
            if (!this.isDataRaw)
            {
                // encode the f32 into s16 manually
                super.getRawData();
            }
            const dataStartIndex = smplArr.currentIndex;
            return smplArr.slice(dataStartIndex + this.sampleStartIndex, dataStartIndex + this.sampleEndIndex);
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
        try
        {
            /**
             * @type {{data: Float32Array[], error: (string|null), sampleRate: number, eof: boolean}}
             */
            const vorbis = stbvorbis.decode(buff.buffer);
            this.sampleData = vorbis.data[0];
            if (this.sampleData === undefined)
            {
                SpessaSynthWarn(`Error decoding sample ${this.sampleName}: Vorbis decode returned undefined.`);
            }
        }
        catch (e)
        {
            // do not error out, fill with silence
            SpessaSynthWarn(`Error decoding sample ${this.sampleName}: ${e}`);
            this.sampleData = new Float32Array(this.sampleLoopEndIndex + 1);
        }
    }
    
    /**
     * Loads the audio data and stores it for reuse
     * @returns {Float32Array} The audioData
     */
    getAudioData()
    {
        if (!this.isSampleLoaded)
        {
            // start loading data if it is not loaded
            if (this.sampleLength < 1)
            {
                SpessaSynthWarn(`Invalid sample ${this.sampleName}! Invalid length: ${this.sampleLength}`);
                return new Float32Array(1);
            }
            
            if (this.isCompressed)
            {
                // if compressed, decode
                this.decodeVorbis();
                this.isSampleLoaded = true;
                return this.sampleData;
            }
            else if (!this.isDataRaw)
            {
                return this.getUncompressedReadyData();
            }
            return this.loadUncompressedData();
        }
        return this.sampleData;
    }
    
    /**
     * @returns {Float32Array}
     */
    loadUncompressedData()
    {
        if (this.isCompressed)
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
        for (let i = 0; i < convertedSigned16.length; i++)
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
    getUncompressedReadyData()
    {
        /**
         * read the sample data
         * @type {Float32Array}
         */
        let audioData = this.sampleDataArray.slice(this.sampleStartIndex / 2, this.sampleEndIndex / 2);
        this.sampleData = audioData;
        this.isSampleLoaded = true;
        return audioData;
    }
}

/**
 * Reads the generatorTranslator from the shdr read
 * @param sampleHeadersChunk {RiffChunk}
 * @param smplChunkData {IndexedByteArray|Float32Array}
 * @param isSmplDataRaw {boolean}
 * @returns {SoundFontSample[]}
 */
export function readSamples(sampleHeadersChunk, smplChunkData, isSmplDataRaw = true)
{
    /**
     * @type {SoundFontSample[]}
     */
    let samples = [];
    let index = 0;
    while (sampleHeadersChunk.chunkData.length > sampleHeadersChunk.chunkData.currentIndex)
    {
        const sample = readSample(index, sampleHeadersChunk.chunkData, smplChunkData, isSmplDataRaw);
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
 * @param smplArrayData {IndexedByteArray|Float32Array}
 * @param isDataRaw {boolean} true means binary 16-bit data, false means float32
 * @returns {SoundFontSample}
 */
function readSample(index, sampleHeaderData, smplArrayData, isDataRaw)
{
    
    // read the sample name
    let sampleName = readBytesAsString(sampleHeaderData, 20);
    
    // read the sample start index
    let sampleStartIndex = readLittleEndian(sampleHeaderData, 4) * 2;
    
    // read the sample end index
    let sampleEndIndex = readLittleEndian(sampleHeaderData, 4) * 2;
    
    // read the sample looping start index
    let sampleLoopStartIndex = readLittleEndian(sampleHeaderData, 4);
    
    // read the sample looping end index
    let sampleLoopEndIndex = readLittleEndian(sampleHeaderData, 4);
    
    // read the sample rate
    let sampleRate = readLittleEndian(sampleHeaderData, 4);
    
    // read the original sample pitch
    let samplePitch = sampleHeaderData[sampleHeaderData.currentIndex++];
    if (samplePitch === 255)
    {
        // if it's 255, then default to 60
        samplePitch = 60;
    }
    
    // read the sample pitch correction
    let samplePitchCorrection = signedInt8(sampleHeaderData[sampleHeaderData.currentIndex++]);
    
    
    // read the link to the other channel
    let sampleLink = readLittleEndian(sampleHeaderData, 2);
    let sampleType = readLittleEndian(sampleHeaderData, 2);
    
    
    return new SoundFontSample(
        sampleName,
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
        index,
        isDataRaw
    );
}