import { BasicSample } from '../basic_soundfont/basic_sample.js'

export class DLSSample extends BasicSample
{
    /**
     * @param name {string}
     * @param rate {number}
     * @param pitch {number}
     * @param pitchCorrection {number}
     * @param loopStart {number} sample data points
     * @param loopEnd {number} sample data points
     * @param data {Float32Array}
     * @param sampleDbAttenuation {number} in db
     */
    constructor(
        name,
        rate,
        pitch,
        pitchCorrection,
        loopStart,
        loopEnd,
        data,
        sampleDbAttenuation
    )
    {
        super(
            name,
            rate,
            pitch,
            pitchCorrection,
            0,
            1,
            loopStart * 2,
            (loopEnd - 1) * 2 // -1 sample because soundfont end is last sample and dls end is next sample
        );
        this.sampleData = data;
        this.sampleDbAttenuation = sampleDbAttenuation;
    }

    getAudioData()
    {
        return this.sampleData;
    }

    /**
     * in decibels of attenuation, WITHOUT EMU CORRECTION
     * @type {number}
     */
    sampleDbAttenuation;

    /**
     * @type {Float32Array}
     */
    sampleData;

    getRawData()
    {
        if(this.isCompressed)
        {
            if (!this.compressedData)
            {
                throw new Error("Compressed but no data??")
            }
            return this.compressedData;
        }
        const uint8 = new Uint8Array(this.sampleData.length * 2);
        for (let i = 0; i < this.sampleData.length; i++)
        {
            const sample = Math.floor(this.sampleData[i] * 32767);
            uint8[i * 2] = sample & 0xFF; // lower byte
            uint8[i * 2 + 1] = (sample >> 8) & 0xFF; // upper byte
        }
        return uint8;
    }
}