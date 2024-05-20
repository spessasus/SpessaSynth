/**
 * fancy_chorus.js
 * purpose: creates a simple chorus effect node
 */

const DEFAULT_DELAY = 0.02;
const DELAY_VARIATION = 0.015;

const OSC_FREQ = 1.5;
const OSC_GAIN = 0.001;
export class FancyChorus
{
    /**
     * @param output {AudioNode}
     */
    constructor(output) {
        const context = output.context;

        this.input = new GainNode(context,
            {
                gain: 1
            });

        const osc = new OscillatorNode(context, {
            type: 'sine',
            frequency: OSC_FREQ
        });

        const oscGain = new GainNode(context, {
            gain: OSC_GAIN
        });
        osc.connect(oscGain);
        osc.start();
        const delayOne = new DelayNode(context, {
            delayTime: DEFAULT_DELAY
        });
        const delayTwo = new DelayNode(context, {
            delayTime: DEFAULT_DELAY + DELAY_VARIATION
        });
        oscGain.connect(delayOne.delayTime);
        this.input.connect(delayOne);
        this.input.connect(delayTwo);
        delayTwo.connect(output);
        delayOne.connect(output);
    }
}