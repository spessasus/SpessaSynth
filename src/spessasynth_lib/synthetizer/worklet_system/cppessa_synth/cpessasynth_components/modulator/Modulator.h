//
// Created by spessasus on 21.05.24.
//

#ifndef SPESSASYNTH_MODULATOR_H
#define SPESSASYNTH_MODULATOR_H

#include "../constants.h"

class Modulator {
public:
    /**
     * Computes a modulator and alters the destination generator in the modulatedGenerators array
     * @param channelControllerTable 14 bit channel controller table (every controller is listed here e.g. channelControllerTable[1] would output modulation wheel value in 14 bit)
     * @param generators the input generators, leaves them unmodified
     * @param modulatedGenerators the modulated generators, adds to them
     * @param midiNote the midi note for the voice modulator is for
     * @param velocity the velocity for the voice modulator is for
     */
    void computeModulator(
            const int (&channelControllerTable)[MIDI_CONTROLLER_TABLE_SIZE],
            int (&modulatedGenerators)[GENERATORS_AMOUNT_TOTAL],
            unsigned char midiNote,
            unsigned char velocity) const;

    Modulator(int sourceEnum, int secSourceEnum, char destination, int transformAmount, char transformType);

    void debugString();

    enum CurveTypes {
        linearCurve = 0,
        concaveCurve = 1,
        convexCurve = 2,
        switchCurve = 3
    };

    enum SourceEnums {
            noController = 0,
            noteOnVelocity = 2,
            noteOnKeyNum = 3,
            polyPressure = 10,
            channelPressure = 13,
            pitchWheel = 14,
            pitchWheelRange = 16,
            channelTuning = 17,
            channelTranspose = 18,
            link = 127
    };

private:
    /**
     * modulator's transform amount
     */
    int transformAmount;

    /**
     * modulator's destination. Note: 127 - linked sample - is not supported
     */
    unsigned char destination;

    /**
     * undecoded source enumeration
     */
    int sourceEnum;

    /**
     * undecoded secondary source enumeration
     */
    int secSourceEnum;

    /**
     * 0 linear
     * 2 absolute
     * 1 - nothing????
     */
    char transformType;

    // source decode values
    bool sourcePolarity;
    bool sourceDirection;
    bool sourceUsesCC;
    char sourceIndex;
    char sourceCurveType;

    bool secSourcePolarity;
    bool secSourceDirection;
    bool secSourceUsesCC;
    char secSourceIndex;
    char secSourceCurveType;
};


#endif //SPESSASYNTH_MODULATOR_H
