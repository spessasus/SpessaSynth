//
// Created by spessasus on 23.05.24.
//

#include "WavetableOscillator.h"

bool WavetableOscillator::getOscillatorData(VoiceSample& voiceSample,
                                            bool isVoiceInRelease,
                                            DumpedSample& sampleData,
                                            float *outputBuffer,
                                            int outputBufferLength,
                                            float tuningRatio) {
    float cursor = voiceSample.cursor;
    bool isLooped = (voiceSample.loopingMode == VoiceSample::LoopingMode::loop)
            ||
            (voiceSample.loopingMode == VoiceSample::LoopingMode::loopThenPlay && !isVoiceInRelease);
    float loopLength = (float)voiceSample.loopEnd - (float)voiceSample.loopStart;

    if(isLooped)
    {
        for (int i = 0; i < outputBufferLength; ++i) {
            // check for loop
            while(cursor >= (float)voiceSample.loopEnd)
            {
                cursor -= loopLength;
            }

            // grab the 2 nearest points of the cursor
            unsigned int floorIndex = (int)cursor;
            unsigned int ceilIndex = floorIndex + 1;

            // make sure that ceiling is in the loop
            while(ceilIndex >= voiceSample.loopEnd)
            {
                ceilIndex -= (unsigned int)loopLength;
            }

            // linear interpolation
            float fraction = cursor - (float)floorIndex;
            float upperSample = sampleData.sampleData[ceilIndex];
            float lowerSample = sampleData.sampleData[floorIndex];
            outputBuffer[i] = (lowerSample + (upperSample - lowerSample) * fraction);

            cursor += voiceSample.playbackRate * tuningRatio;
        }
    }
    else
    {
        // check and correct end errors (only end because loopend is fine in sf3, end can only be determined after
        if(voiceSample.end >= sampleData.sampleLength)
        {
            voiceSample.end = sampleData.sampleLength - 1;
        }

        for (int i = 0; i < outputBufferLength; ++i) {
            // linear interpolation
            unsigned int floorIndex = (int)cursor;
            unsigned int ceilIndex = floorIndex + 1;

            // flag the voice as finished if needed
            if(ceilIndex >= voiceSample.end)
            {
                // the voice has finished!
                // fill the rest of the array with zeros
                for (int j = i; j < outputBufferLength; ++j) {
                    sampleData.sampleData[j] = 0.0f;

                }
                return true;
            }

            float fraction = cursor - (float)floorIndex;

            // grab the samples and interpolate
            float upperSample = sampleData.sampleData[ceilIndex];
            float lowerSample = sampleData.sampleData[floorIndex];
            outputBuffer[i] = (lowerSample + (upperSample - lowerSample) * fraction);

            cursor += voiceSample.playbackRate * tuningRatio;
        }
    }
    voiceSample.cursor = cursor;
    return false;
}
