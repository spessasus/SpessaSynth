const OSC_GAIN = 0.001;
const OSC_FREQ = 1.766;
const DELAY_TIME = 0.017;
export class Chorus
{
    /**
     * Creates a new chorus effect
     * @param input {AudioNode}
     * @param output {AudioNode}
     * @param defaultGain {number}
     */
    constructor(input, output, defaultGain) {
        this.input = input;
        this.output = output;
        this.context = input.context;

        this.delayLine = new DelayNode(this.context, {
            delayTime: DELAY_TIME
        });
        this.wetController = new GainNode(this.context, {
            gain: defaultGain
        });
        this.delayOscillator = new OscillatorNode(this.context, {
            type: "triangle",
            frequency: OSC_FREQ
        });
        this.delayGain = new GainNode(this.context, {
            gain: OSC_GAIN
        });
        this.delayOscillator.start();

        /*
        +-----+    +--------------+    +----------+    +------+
        |input| -> |wet controller| -> |delay line| -> |output|
        +-----+    +--------------+    +----------+    +------+
                                           /|\ delay time
        +----------+    +----------+        |
        |oscillator| -> |delay gain| -------+
        +----------+    +----------+
         */

        this.delayOscillator.connect(this.delayGain);
        this.delayGain.connect(this.delayLine.delayTime);

        this.input.connect(this.wetController);
        this.wetController.connect(this.delayLine);
        this.delayLine.connect(this.output);
    }

    /**
     * @param level {number} 0-127
     */
    setChorusLevel(level)
    {
        this.wetController.gain.value = level / 127;
    }

    disconnectChorus()
    {
        this.input.disconnect(this.wetController);
        this.delayLine.disconnect(this.output);
    }
}