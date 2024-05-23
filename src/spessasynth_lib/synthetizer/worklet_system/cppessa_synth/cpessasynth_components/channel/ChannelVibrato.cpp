//
// Created by spessasus on 23.05.24.
//

#include "ChannelVibrato.h"

ChannelVibrato::ChannelVibrato(unsigned int depth, float delay, float frequency) {
    this->depthCents = depth;
    this->delaySeconds = delay;
    this->frequencyHz = frequency;
}
