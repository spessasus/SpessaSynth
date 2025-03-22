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

/**
 * @typedef {Object} ChorusConfig
 * @property {number?} nodesAmount - the amount of delay nodes (for each channel) and the corresponding oscillators
 * @property {number?} defaultDelay - the initial delay, in seconds
 * @property {number?} delayVariation - the difference between delays in the delay nodes
 * @property {number?} stereoDifference - the difference of delays between two channels (added to the left channel and subtracted from the right)
 * @property {number?} oscillatorFrequency - the initial delay time oscillator frequency, in Hz.
 * @property {number?} oscillatorFrequencyVariation - the difference between frequencies of oscillators, in Hz
 * @property {number?} oscillatorGain - how much will oscillator alter the delay in delay nodes, in seconds
 */

const NODES_AMOUNT = 4;
const DEFAULT_DELAY = 0.03;
const DELAY_VARIATION = 0.01;
const STEREO_DIFF = 0.02;

const OSC_FREQ = 0.2;
const OSC_FREQ_VARIATION = 0.05;
const OSC_GAIN = 0.003;

export const DEFAULT_CHORUS_CONFIG = {
    nodesAmount: NODES_AMOUNT,
    defaultDelay: DEFAULT_DELAY,
    delayVariation: DELAY_VARIATION,
    stereoDifference: STEREO_DIFF,
    oscillatorFrequency: OSC_FREQ,
    oscillatorFrequencyVariation: OSC_FREQ_VARIATION,
    oscillatorGain: OSC_GAIN
};

export class FancyChorus
{
    /**
     * Creates a fancy chorus effect
     * @param output {AudioNode}
     * @param config {ChorusConfig}
     */
    constructor(output, config = DEFAULT_CHORUS_CONFIG)
    {
        const context = output.context;
        
        this.input = context.createChannelSplitter(2);
        
        const merger = context.createChannelMerger(2);
        
        /**
         * @type {ChorusNode[]}
         */
        const chorusNodesLeft = [];
        /**
         * @type {ChorusNode[]}
         */
        const chorusNodesRight = [];
        let freq = config.oscillatorFrequency;
        let delay = config.defaultDelay;
        for (let i = 0; i < config.nodesAmount; i++)
        {
            // left node
            this.createChorusNode(
                freq,
                delay - config.stereoDifference,
                chorusNodesLeft,
                0,
                merger,
                0,
                context,
                config
            );
            // right node
            this.createChorusNode(
                freq,
                delay + config.stereoDifference,
                chorusNodesRight,
                1,
                merger,
                1,
                context,
                config
            );
            freq += config.oscillatorFrequencyVariation;
            delay += config.delayVariation;
        }
        
        merger.connect(output);
        this.merger = merger;
        this.chorusLeft = chorusNodesLeft;
        this.chorusRight = chorusNodesRight;
    }
    
    delete()
    {
        this.input.disconnect();
        delete this.input;
        this.merger.disconnect();
        delete this.merger;
        for (const chorusLeftElement of this.chorusLeft)
        {
            chorusLeftElement.delay.disconnect();
            chorusLeftElement.oscillator.disconnect();
            chorusLeftElement.oscillatorGain.disconnect();
            delete chorusLeftElement.delay;
            delete chorusLeftElement.oscillatorGain;
            delete chorusLeftElement.oscillatorGain;
        }
        for (const chorusRightElement of this.chorusRight)
        {
            chorusRightElement.delay.disconnect();
            chorusRightElement.oscillator.disconnect();
            chorusRightElement.oscillatorGain.disconnect();
            delete chorusRightElement.delay;
            delete chorusRightElement.oscillatorGain;
            delete chorusRightElement.oscillatorGain;
        }
    }
    
    /**
     * @param freq {number}
     * @param delay {number}
     * @param list {ChorusNode[]}
     * @param input {number}
     * @param output {AudioNode}
     * @param outputNum {number}
     * @param context {BaseAudioContext}
     * @param config {ChorusConfig}
     */
    createChorusNode(freq, delay, list, input, output, outputNum, context, config)
    {
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = freq;
        const gainNode = context.createGain();
        gainNode.gain.value = config.oscillatorGain;
        const delayNode = context.createDelay();
        delayNode.delayTime.value = delay;
        
        oscillator.connect(gainNode);
        gainNode.connect(delayNode.delayTime);
        oscillator.start(context.currentTime /*+ delay*/);
        
        this.input.connect(delayNode, input);
        delayNode.connect(output, 0, outputNum);
        
        list.push({
            oscillator: oscillator,
            oscillatorGain: gainNode,
            delay: delayNode
        });
    }
}
