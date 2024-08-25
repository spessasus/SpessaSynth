import { BasicInstrumentZone } from '../basic_soundfont/basic_zones.js'
import { Generator, generatorTypes } from '../read_sf2/generators.js'

export class DLSZone extends BasicInstrumentZone
{
    /**
     * @param keyRange {SoundFontRange}
     * @param velRange {SoundFontRange}
     */
    constructor(keyRange, velRange)
    {
        super();
        this.keyRange = keyRange;
        this.velRange = velRange;
        this.isGlobal = true;
    }

    /**
     * @param attenuationCb {number} with EMU correction
     * @param loopingMode {number} the sfont one
     * @param loop {{start: number, end: number}}
     * @param sampleKey {number}
     * @param sample {BasicSample}
     * @param sampleID {number}
     */
    setWavesample(
        attenuationCb,
        loopingMode,
        loop,
        sampleKey,
        sample,
        sampleID,
    )
    {
        if(loopingMode !== 0)
        {
            this.generators.push(new Generator(generatorTypes.sampleModes, loopingMode));
        }
        this.generators.push(new Generator(generatorTypes.initialAttenuation, attenuationCb));
        this.isGlobal = false;

        // correct loop if needed
        const diffStart = loop.start - (sample.sampleLoopStartIndex / 2);
        const diffEnd = loop.end - (sample.sampleLoopEndIndex / 2);
        if(diffStart !== 0)
        {
            const fine = diffStart % 32768;
            this.generators.push(new Generator(generatorTypes.startloopAddrsOffset, fine));
            const coarse = Math.round(diffStart / 32768);
            if(coarse !== 0)
            {
                this.generators.push(new Generator(generatorTypes.startloopAddrsCoarseOffset, fine));
            }
        }
        if(diffEnd !== 0)
        {
            const fine = diffEnd % 32768;
            this.generators.push(new Generator(generatorTypes.endloopAddrsOffset, fine));
            const coarse = Math.round(diffEnd / 32768);
            if(coarse !== 0)
            {
                this.generators.push(new Generator(generatorTypes.endloopAddrsCoarseOffset, fine));
            }
        }
        // correct key if needed
        if(sampleKey !== sample.samplePitch)
        {
            this.generators.push(new Generator(generatorTypes.overridingRootKey, sampleKey));
        }
        // add sample ID
        this.generators.push(new Generator(generatorTypes.sampleID, sampleID));
        this.sample = sample;
        sample.useCount++;
    }
}