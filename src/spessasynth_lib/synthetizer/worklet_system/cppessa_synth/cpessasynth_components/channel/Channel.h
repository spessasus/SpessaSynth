//
// Created by spessasus on 22.05.24.
//

#ifndef SPESSASYNTH_CHANNEL_H
#define SPESSASYNTH_CHANNEL_H

#include <iostream>
#include "../voice/Voice.h"
#include "ChannelVibrato.h"

class Channel {
public:
    std::vector<Voice>* voices;
    std::vector<Voice>* sustainedVoices;
    ChannelVibrato vibrato;
};


#endif //SPESSASYNTH_CHANNEL_H
