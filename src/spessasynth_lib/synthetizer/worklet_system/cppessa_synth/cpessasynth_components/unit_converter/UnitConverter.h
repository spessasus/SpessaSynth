//
// Created by spessasus on 21.05.24.
//

#ifndef SPESSASYNTH_UNITCONVERTER_H
#define SPESSASYNTH_UNITCONVERTER_H

const int DECIBEL_TABLE_STATIC_POINT = 100;

class UnitConverter {
public:
    /**
     * Converts timecents to seconds
     * @param timecents timecents
     * @return seconds
     */
    static float timecentsToSeconds(unsigned int timecents);

    /**
     * Converts absolute cents to hertz
     * @param absoluteCents absolute cents
     * @return hertz
     */
    static float absCentsToHz(unsigned int absoluteCents);

    /**
     * Converts decibel attenuation (-decibels) to linear amplitude
     * @param decibels decibels of attenuation
     * @return linear amplitude
     */
    static float decibelAttenuationToGain(float decibels);

private:
    static const int MIN_TIMECENT = -15000;
    static const int MAX_TIMECENT = 15000;
    static float timecentLookupTable[MAX_TIMECENT - MIN_TIMECENT + 1];

    static const int MIN_ABS_CENT = -20000; // freqVibLfo
    static const int MAX_ABS_CENT = 16500;  // filterFc
    static float absoluteCentLookupTable[MAX_ABS_CENT - MIN_ABS_CENT + 1];

    static const int MIN_DECIBELS = -1660;
    static const int MAX_DECIBELS = 1600;
    static float decibelLookupTable[(MAX_DECIBELS - MIN_DECIBELS) * DECIBEL_TABLE_STATIC_POINT + 1];

    static void initializeLookupTables();
};


#endif //SPESSASYNTH_UNITCONVERTER_H
