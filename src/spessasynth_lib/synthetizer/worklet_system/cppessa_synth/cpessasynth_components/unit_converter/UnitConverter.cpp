//
// Created by spessasus on 21.05.24.
//

#include <cmath>
#include <emscripten/emscripten.h>
#include <cstdio>
#include "UnitConverter.h"

float UnitConverter::timecentLookupTable[MAX_TIMECENT - MIN_TIMECENT + 1];
float UnitConverter::absoluteCentLookupTable[MAX_ABS_CENT - MIN_ABS_CENT + 1];
//float UnitConverter::decibelLookupTable[(MAX_DECIBELS - MIN_DECIBELS) * DECIBEL_TABLE_STATIC_POINT + 1];

EMSCRIPTEN_KEEPALIVE
void UnitConverter::initializeLookupTables() {
    // timecent
    for (int i = 0; i < MAX_TIMECENT - MIN_TIMECENT + 1; ++i) {
        int timecents = i + MIN_TIMECENT;
        UnitConverter::timecentLookupTable[i] = powf(2.0f, (float)timecents / 1200.0f);
    }
    printf("\n");

    // absolute cent
    for (int i = 0; i < MAX_ABS_CENT - MIN_ABS_CENT + 1; ++i) {
        int absoluteCents = i + MIN_ABS_CENT;
        UnitConverter::absoluteCentLookupTable[i] = 440.0f * powf(2.0f, ((float)absoluteCents - 6900.0f) / 1200.0f);
    }

    // decibel (2 points of precision)
//    for (int i = 0; i < (MAX_DECIBELS - MIN_DECIBELS) * 100 + 1; ++i) {
//        float decibels = (MIN_DECIBELS * DECIBEL_TABLE_STATIC_POINT + (float)i) / DECIBEL_TABLE_STATIC_POINT;
//        UnitConverter::decibelLookupTable[i] = powf(10.0f, -decibels / 20.0f);
//        printf("%f %f ", UnitConverter::decibelLookupTable[i], decibels);
//    }
//    printf("\n");
}

EMSCRIPTEN_KEEPALIVE
float UnitConverter::timecentsToSeconds(int timecents) {
    return UnitConverter::timecentLookupTable[timecents - MIN_TIMECENT];
}

EMSCRIPTEN_KEEPALIVE
float UnitConverter::absCentsToHz(int absoluteCents) {
    return UnitConverter::absoluteCentLookupTable[absoluteCents - MIN_ABS_CENT];
}

EMSCRIPTEN_KEEPALIVE
float UnitConverter::decibelAttenuationToGain(float decibels) {
    return powf(10.0f, -decibels / 20.0f); //UnitConverter::decibelLookupTable[(unsigned int)floor((decibels - MIN_DECIBELS) * DECIBEL_TABLE_STATIC_POINT)];
}