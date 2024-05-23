//
// Created by spessasus on 23.05.24.
//

#ifndef SPESSASYNTH_SAMPLEDUMPMANAGER_H
#define SPESSASYNTH_SAMPLEDUMPMANAGER_H


#include "DumpedSample.h"

class SampleDumpManager {
public:
    DumpedSample* dumpedSamples;

    explicit SampleDumpManager(unsigned int totalSamplesAmount);

    void DumpSample(float* sampleData, unsigned int sampleLength, unsigned int sampleID) const;

    /**
     * Deletes all the samples and initializes a new array
     * @param totalSamplesAmount the new amount
     */
    void ClearDumpedSamples(unsigned int totalSamplesAmount);
};


#endif //SPESSASYNTH_SAMPLEDUMPMANAGER_H
