//
// Created by spessasus on 23.05.24.
//

#ifndef SPESSASYNTH_WAVETABLEOSCILLATOR_H
#define SPESSASYNTH_WAVETABLEOSCILLATOR_H

#include "../voice/VoiceSample.h"
#include "../sample_dump_manager/DumpedSample.h"

class WavetableOscillator {
public:
    /**
     * Fills the output buffer with raw sample data at an arbitrary playback rate
     * @param voiceSample the voice's sample playback data (cursor, loop etc.)
     * @param isVoiceInRelease if the voice is in the release state, set to true, false otherwise
     * @param sampleData the sample's sample data as DumpedSample instance
     * @param outputBuffer the output buffer to fill
     * @param outputBufferLength the output buffer's length
     * @param tuningRatio effectively the playback rate
     * @return true if voice is finished, false otherwise
     */
    static bool getOscillatorData(VoiceSample& voiceSample,
                                  bool isVoiceInRelease,
                                  DumpedSample& sampleData,
                                  float* outputBuffer,
                                  int outputBufferLength,
                                  float tuningRatio);
};


#endif //SPESSASYNTH_WAVETABLEOSCILLATOR_H
