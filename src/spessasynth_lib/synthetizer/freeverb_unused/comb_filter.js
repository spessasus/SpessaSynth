export class CombFilter
{
    /**
     * Feedback lowpass comb filter
     * @param context {BaseAudioContext}
     * @param delayTime {number}
     */
    constructor(context, delayTime) {
        //const context = inputNode.context;
        this.delayLine = new DelayNode(context, {
            delayTime: delayTime
        });
        this.lowPassFilter = new BiquadFilterNode(context, {
            type: "lowpass",
            frequency: 440
        });
        this.reasonanceGain = new GainNode(context, {
            gain: 0.5
        });

        /*            +---------------+
                      |reasonance gain|
                      +---------------+
                       |            /|\
                      \|/            |
        +-----+   +---------+   +-------+   +------+
        |input|-->|delayLine|-->|lowpass|-->|output|
        +-----+   +---------+   +-------+   +------+
           |                                   /|\
           +------------------------------------+
         */
        this.delayLine.connect(this.lowPassFilter);
        this.lowPassFilter.connect(this.reasonanceGain);
        this.reasonanceGain.connect(this.delayLine);
    }

    get input()
    {
        return this.delayLine;
    }

    get output()
    {
        return this.delayLine//this.lowPassFilter;
    }

    /**
     * @param value {number}
     */
    set dampening(value)
    {
        this.lowPassFilter.frequency.value = value;
    }

    /**
     * @param value {number}
     */
    set delayTime(value)
    {
        this.delayLine.delayTime.value = value;
    }

    /**
     * @param value {number}
     */
    set reasonance(value)
    {
        this.reasonanceGain.gain.value = value;
    }
}