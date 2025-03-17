import { BasicInstrumentZone } from "../basic_soundfont/basic_zones.js";
import { Generator, generatorTypes } from "../basic_soundfont/generator.js";

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
     * @param samplePitchCorrection {number} cents
     */
    setWavesample(
        attenuationCb,
        loopingMode,
        loop,
        sampleKey,
        sample,
        sampleID,
        samplePitchCorrection
    )
    {
        if (loopingMode !== 0)
        {
            this.generators.push(new Generator(generatorTypes.sampleModes, loopingMode));
        }
        this.generators.push(new Generator(generatorTypes.initialAttenuation, attenuationCb));
        this.isGlobal = false;
        
        // correct tuning if needed
        samplePitchCorrection -= sample.samplePitchCorrection;
        const coarseTune = Math.trunc(samplePitchCorrection / 100);
        if (coarseTune !== 0)
        {
            this.generators.push(new Generator(generatorTypes.coarseTune, coarseTune));
        }
        const fineTune = samplePitchCorrection - (coarseTune * 100);
        if (fineTune !== 0)
        {
            this.generators.push(new Generator(generatorTypes.fineTune, fineTune));
        }
        
        // correct loop if needed
        if (loopingMode !== 0)
        {
            const diffStart = loop.start - sample.sampleLoopStartIndex;
            const diffEnd = loop.end - sample.sampleLoopEndIndex;
            if (diffStart !== 0)
            {
                const fine = diffStart % 32768;
                this.generators.push(new Generator(generatorTypes.startloopAddrsOffset, fine));
                // coarse generator uses 32768 samples per step
                const coarse = Math.trunc(diffStart / 32768);
                if (coarse !== 0)
                {
                    this.generators.push(new Generator(generatorTypes.startloopAddrsCoarseOffset, coarse));
                }
            }
            if (diffEnd !== 0)
            {
                const fine = diffEnd % 32768;
                this.generators.push(new Generator(generatorTypes.endloopAddrsOffset, fine));
                // coarse generator uses 32768 samples per step
                const coarse = Math.trunc(diffEnd / 32768);
                if (coarse !== 0)
                {
                    this.generators.push(new Generator(generatorTypes.endloopAddrsCoarseOffset, coarse));
                }
            }
        }
        // correct the key if needed
        if (sampleKey !== sample.samplePitch)
        {
            this.generators.push(new Generator(generatorTypes.overridingRootKey, sampleKey));
        }
        // add sample ID
        this.generators.push(new Generator(generatorTypes.sampleID, sampleID));
        this.sample = sample;
        sample.useCount++;
    }
}