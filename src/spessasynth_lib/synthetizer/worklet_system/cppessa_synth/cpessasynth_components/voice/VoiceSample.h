//
// Created by spessasus on 21.05.24.
//

#ifndef SPESSASYNTH_WASM_TEST_VOICESAMPLE_H
#define SPESSASYNTH_WASM_TEST_VOICESAMPLE_H


class VoiceSample {
public:

    enum LoopingMode {
        noLoop = 0,
        loop = 1,
        loopThenPlay = 3
    };

    /**
     * The id of the sample in the global sample list
     */
    unsigned int sampleID;

    /**
     * Normalized playbackRate of the sample (e.g. sample.sampleRate / output.sampleRate * calculated pitch correction)
     */
    float playbackRate;

    /**
     * The current playback position in the sample
     */
    float cursor;

    /**
     * The rootKey of a sample
     */
    unsigned int rootKey;

    /**
     * the start index of a loop
     */
    unsigned int loopStart;

    /**
     * the end index of a loop
     */
    unsigned int loopEnd;

    /**
     * the end index of a sample
     */
    unsigned int end;

    /**
     * the looping mode of the sample
     */
    unsigned char loopingMode;

    VoiceSample(unsigned int sampleID,
                float playbackRate,
                unsigned int rootKey,
                unsigned int loopStart,
                unsigned int loopEnd,
                unsigned int startIndex,
                unsigned int endIndex,
                LoopingMode loopingMode);

    ~VoiceSample();

};


#endif //SPESSASYNTH_WASM_TEST_VOICESAMPLE_H
