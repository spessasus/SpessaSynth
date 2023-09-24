// Based on Freeverb, a public domain reverb implementation by Jezar at Dreampoint

import { CombFilter } from './comb_filter.js'

const COMB_FILTER_TUNINGS_LEFT = [1557, 1617, 1491, 1422];
const COMB_FILTER_TUNINGS_RIGHT = [1277, 1356, 1188, 1116];
const ALLPASS_FREQS = [225, 556, 441, 341];

const ROOM_SIZE_DEFAULT = 0.5;
const DAMPERING_DEFAULT = 3000;
export class Freeverb
{
    /**
     * Creates a new Freeverb instance
     * @param context {BaseAudioContext}
     * @param defaultLevel {number} 0-127
     */
    constructor(context, defaultLevel) {
        /*
         *                 +-------------+
         *              +->|comb filter 1|------+
         *              |  +-------------+      |
         *         left |                      \|/
         *          +--------+  6 more       +------+   +---------+  +---------+  +---------+  +---------+  +------+
         * |input|->|splitter|  filters here |merger|-> |allpass 1|->|allpass 2|->|allpass 3|->|allpass 4|->|output|
         *          +--------+               +------+   +---------+  +---------+  +---------+  +---------+  +------+
         *        right |                      /|\
         *              |  +-------------+      |
         *              +->|comb filter 8|------+
         *                 +-------------+
         *
         *
         *    i think thats how it works
         *
         */
        // merger and splitter
        this.splitter = new ChannelSplitterNode(context, {
            numberOfOutputs: 2
        });
        this.merger = new ChannelMergerNode(context, {
            numberOfInputs: 2
        });
        // reverb level controllers
        this.wetGain = new GainNode(context, {
            gain: defaultLevel / 127
        });
        this.dryGain = new GainNode(context, {
            gain: (127 - defaultLevel) / 127
        });

        this.wetGain.connect(this.splitter);

        // comb filters left
        this.combFiltersLeft = COMB_FILTER_TUNINGS_LEFT.map(tuning => {
            const comb = new CombFilter(context,  tuning / context.sampleRate);
            comb.reasonance = ROOM_SIZE_DEFAULT;
            comb.dampening = DAMPERING_DEFAULT;

            this.splitter.connect(comb.input, 0);
            comb.output.connect(this.merger, 0, 0);
            return comb;
        });

        // comb filters right
        this.combFiltersRight = COMB_FILTER_TUNINGS_RIGHT.map(tuning => {
            const comb = new CombFilter(context,  tuning / context.sampleRate);
            comb.reasonance = ROOM_SIZE_DEFAULT;
            comb.dampening = DAMPERING_DEFAULT;

            this.splitter.connect(comb.input, 1);
            comb.output.connect(this.merger, 0, 1);
            return comb;
        });
        this.splitter.connect(this.merger, 1, 1);
        this.splitter.connect(this.merger, 0, 0);

        /**
         * allpass filters
         * @type {BiquadFilterNode[]}
          */
        this.allpassFilters = [];
        ALLPASS_FREQS.forEach((frequency, index) => {
            const allpass = new BiquadFilterNode(context, {
                type: 'allpass',
                frequency: frequency
            });

            if(this.allpassFilters[index - 1])
            {
                this.allpassFilters[index - 1].connect(allpass);
            }
            this.allpassFilters.push(allpass);
        });

        this.merger.connect(this.allpassFilters[0]);
    }

    /**
     * @returns {{connect: function(AudioNode)}}
     */
    get input()
    {
        return {
            connect: node => {
                node.connect(this.dryGain);
                node.connect(this.wetGain);
            }
        }
    }

    /**
     * @param output {AudioNode}
     */
    connectOutput(output)
    {
        this.dryGain.connect(output);
        this.allpassFilters[this.allpassFilters.length - 1].connect(output);
    }

    /**
     * @param level {number} 0-127
     */
    setLevel(level)
    {
        this.wetGain.gain.value = level / 127;
        this.dryGain.gain.value = (127 - level) / 127;
    }
}