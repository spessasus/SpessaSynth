//
// Created by spessasus on 21.05.24.
//

#include <cmath>
#include "UnitConverter.h"

void UnitConverter::initializeLookupTables() {
    // timecent
    for (int i = 0; i < MAX_TIMECENT - MIN_TIMECENT + 1; ++i) {
        unsigned int timecents = i + MIN_TIMECENT;
        timecentLookupTable[i] = powf(2.0f, (float)timecents / 1200.0f);
    }

    // absolute cent
    for (int i = 0; i < MAX_ABS_CENT - MIN_ABS_CENT + 1; ++i) {
        unsigned int absoluteCents = i + MIN_ABS_CENT;
        absoluteCentLookupTable[i] = powf(2.0f, ((float)absoluteCents - 6900.0f) / 1200.0f);
    }

    // decibel (2 points of precision)
    for (int i = 0; i < MAX_DECIBELS - MIN_DECIBELS + 1; ++i) {
        float decibels = (MIN_DECIBELS * DECIBEL_TABLE_STATIC_POINT * (float)i) / DECIBEL_TABLE_STATIC_POINT;
        decibelLookupTable[i] = powf(10.0f, -decibels / 20.0f);
    }
}

float UnitConverter::timecentsToSeconds(unsigned int timecents) {
    return timecentLookupTable[timecents - MIN_TIMECENT];
}

float UnitConverter::absCentsToHz(unsigned int absoluteCents) {
    return absoluteCentLookupTable[absoluteCents - MIN_ABS_CENT];
}

float UnitConverter::decibelAttenuationToGain(float decibels) {
    return decibelLookupTable[(unsigned int)floor((decibels - MIN_DECIBELS) * DECIBEL_TABLE_STATIC_POINT)];
}