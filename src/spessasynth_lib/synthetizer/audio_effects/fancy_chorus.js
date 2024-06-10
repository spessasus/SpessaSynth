/**
 * fancy_chorus.js
 * purpose: creates a simple chorus effect node
 */

/**
 * @typedef {{
 *     oscillator: OscillatorNode,
 *     oscillatorGain: GainNode,
 *     delay: DelayNode
 * }} ChorusNode
 */

const NODES_AMOUNT = 3;
const DEFAULT_DELAY = 0.02;
const DELAY_VARIATION = 0.01;
const STEREO_DIFF = 0.01;

const OSC_FREQ = 0.3;
const OSC_FREQ_VARIATION = 0.1;
const OSC_GAIN = 0.002;
export class FancyChorus
{
    /**
     * Creates a fancy chorus effect
     * @param output {AudioNode}
     */
    constructor(output) {
        const context = output.context;

        this.input = new ChannelSplitterNode(context,
            {
                numberOfOutputs: 2
            }
        );

        const merger = new ChannelMergerNode(context, {
            numberOfInputs: 2
        });

        /**
         * @type {ChorusNode[]}
         */
        const chorusNodesLeft = [];
        /**
         * @type {ChorusNode[]}
         */
        const chorusNodesRight = [];
        let freq = OSC_FREQ;
        let delay = DEFAULT_DELAY;
        for (let i = 0; i < NODES_AMOUNT; i++) {
            // left node
            this.createChorusNode(freq, delay - STEREO_DIFF, chorusNodesLeft, 0, merger, 0, context);
            // right node
            this.createChorusNode(freq, delay + STEREO_DIFF, chorusNodesRight, 1, merger, 1, context);
            freq += OSC_FREQ_VARIATION;
            delay += DELAY_VARIATION;
        }

        merger.connect(output);
    }

    /**
     * @param freq {number}
     * @param delay {number}
     * @param list {ChorusNode[]}
     * @param input {number}
     * @param output {AudioNode}
     * @param outputNum {number}
     * @param context {BaseAudioContext}
     */
    createChorusNode(freq, delay, list, input, output, outputNum, context)
    {
        const oscillator = new OscillatorNode(context, {
            type: "triangle",
            frequency: freq
        });
        const gainNode = new GainNode(context, {
            gain: OSC_GAIN
        });
        const delayNode = new DelayNode(context, {
            delayTime: delay
        });
        oscillator.connect(gainNode);
        gainNode.connect(delayNode.delayTime);
        oscillator.start(context.currentTime + delay);
        this.input.connect(delayNode, input);
        delayNode.connect(output, 0, outputNum);
        list.push({
            oscillator: oscillator,
            oscillatorGain: gainNode,
            delay: delayNode
        })
    }
}