//
// Created by spessasus on 23.05.24.
//

#ifndef SPESSASYNTH_STEREOPANNER_H
#define SPESSASYNTH_STEREOPANNER_H


class StereoPanner {
public:
    /**
     * Pans the voice and writes it out to the output buffers
     * @param pan 0-1, 0.5 is middle
     * @param inputBuffer the input buffer
     * @param outputLeft left dry output buffer
     * @param outputRight right dry output buffer
     * @param reverbLeft left reverb output
     * @param reverbRight right reverb output
     * @param chorusLeft left chorus output
     * @param chorusRight right chorus output
     * @param chorusLevel the chorusEffectsSend generator
     * @param reverbLevel the reverbEffectsSend generator
     * @param bufferLength the length of ALL the buffers
     */
    static void panVoice(float pan,
                         const float* inputBuffer,
                         float* outputLeft, float* outputRight,
                         float* reverbLeft, float* reverbRight,
                         float* chorusLeft, float* chorusRight,
                         int chorusLevel,
                         int reverbLevel,
                         int bufferLength);
};


#endif //SPESSASYNTH_STEREOPANNER_H
