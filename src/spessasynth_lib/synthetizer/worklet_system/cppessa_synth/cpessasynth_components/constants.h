//
// Created by spessasus on 23.05.24.
//

#ifndef SPESSASYNTH_CONSTANTS_H
#define SPESSASYNTH_CONSTANTS_H

// modulator related
const int MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH = 16384;
const char CURVE_TYPES_AMOUNT = 4;
const char DIRECTIONS_AMOUNT = 2;
const char POLARITIES_AMOUNT = 2;
// the index offset for non-controller values (pitch bend, etc)
const unsigned char NON_CC_INDEX_OFFSET = 128;

// unit converter related
const int DECIBEL_TABLE_STATIC_POINT = 100;
const int MIN_TIMECENT = -15000;
const int MAX_TIMECENT = 15000;
const int MIN_ABS_CENT = -20000; // freqVibLfo
const int MAX_ABS_CENT = 16500;  // filterFc
const int MIN_DECIBELS = -1660;
const int MAX_DECIBELS = 1600;

// midi related
const unsigned char MIDI_CONTROLLER_TABLE_SIZE = 147;

// generator related
const char GENERATORS_AMOUNT_TOTAL = 60;
const int GENERATORS_PAN_MINIMUM = -500;
const int GENERATORS_PAN_MAXIMUM = 500;
const int GENERATORS_REVERB_DIVIDER = 500;
const int GENERATORS_CHORUS_DIVIDER = 500;

// volume envelope related
const char DB_SILENCE = 100;
const float GAIN_SILENCE = 0.005f;

// modulation envelope related
const int MODULATION_ENVELOPE_CONVEX_LENGTH = 1000;
const float MODULATION_ENVELOPE_PEAK = 1.0f;
#endif //SPESSASYNTH_CONSTANTS_H