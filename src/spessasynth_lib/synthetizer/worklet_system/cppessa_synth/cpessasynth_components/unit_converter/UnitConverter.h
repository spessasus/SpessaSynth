//
// Created by spessasus on 21.05.24.
//

#ifndef SPESSASYNTH_UNITCONVERTER_H
#define SPESSASYNTH_UNITCONVERTER_H


#include "../constants.h"

class UnitConverter {
public:
    /**
     * Converts timecents to seconds
     * @param timecents timecents
     * @return seconds
     */
    static float timecentsToSeconds(int timecents);

    /**
     * Converts absolute cents to hertz
     * @param absoluteCents absolute cents
     * @return hertz
     */
    static float absCentsToHz(int absoluteCents);

    /**
     * Converts decibel attenuation (-decibels) to linear amplitude
     * @param decibels decibels of attenuation
     * @return linear amplitude
     */
    static float decibelAttenuationToGain(float decibels);
    static void initializeLookupTables();

    static float timecentLookupTable[MAX_TIMECENT - MIN_TIMECENT + 1];
    static float absoluteCentLookupTable[MAX_ABS_CENT - MIN_ABS_CENT + 1];
    //static float decibelLookupTable[(MAX_DECIBELS - MIN_DECIBELS) * DECIBEL_TABLE_STATIC_POINT + 1];
};


#endif //SPESSASYNTH_UNITCONVERTER_H
