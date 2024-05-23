//
// Created by spessasus on 23.05.24.
//

#ifndef SPESSASYNTH_CHANNELVIBRATO_H
#define SPESSASYNTH_CHANNELVIBRATO_H


class ChannelVibrato {
public:
    unsigned int depthCents;
    float delaySeconds;
    float frequencyHz;

    ChannelVibrato(unsigned int depth, float delay, float frequency);
};


#endif //SPESSASYNTH_CHANNELVIBRATO_H
