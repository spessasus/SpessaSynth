//
// Created by spessasus on 21.05.24.
//

#ifndef SPESSASYNTH_LOWPASSFILTER_H
#define SPESSASYNTH_LOWPASSFILTER_H

class LowpassFilter {
private:
    float a0;
    float a1;
    float a2;
    float a3;
    float a4;

    float x1;
    float x2;
    float y1;
    float y2;

    /**
     * reasonance in absolute centibels
     */
    unsigned int reasonanceCb;

    /**
     * reasonance converted to linear amplitude
     */
    float reasonanceGain;

    /**
     * the sample rate that the filter is operating on
     */
    unsigned int sampleRate;

    /**
     * filter cutoff frequency in absolute centibels
     */
    unsigned int cutoffCents;

    /**
     * filter cutoff frequency in hertz
     */
    unsigned int cutoffHz;

    void calculateCoefficients();

public:
    /**
     * @param filterQcBCurrent the current filter Q in dB if differs from the internal value, the coefficients will be recalculated
     * @param cutoffCentsCurrent the current cutoff cents. if differs from the internal value, the coefficients will be recalculated
     * @param outputBuffer the buffer to process
     * @param bufferLength the length of the buffer
     */
    void applyLowpassFilter(unsigned int filterQcBCurrent, unsigned int cutoffCentsCurrent, float* outputBuffer, int bufferLength);
    LowpassFilter(unsigned int sampleRate);
};


#endif //SPESSASYNTH_LOWPASSFILTER_H
