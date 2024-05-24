//
// Created by spessasus on 23.05.24.
//

#include <cstdio>
#include "SampleDumpManager.h"

void SampleDumpManager::ClearDumpedSamples(unsigned int totalSamplesAmount) {
    delete[] this->dumpedSamples;
    this->dumpedSamples = new DumpedSample[totalSamplesAmount];

}

SampleDumpManager::SampleDumpManager(unsigned int totalSamplesAmount) {
    this->dumpedSamples = new DumpedSample[totalSamplesAmount];
}

void SampleDumpManager::DumpSample(float *sampleData, unsigned int sampleLength, unsigned int sampleID) const {
    // add data and flag as not empty
    this->dumpedSamples[sampleID].sampleData = sampleData;
    this->dumpedSamples[sampleID].sampleLength = sampleLength;
    this->dumpedSamples[sampleID].isEmpty = false;
    printf("successfully dumped sample with ID of %d and length of %d\n", sampleID, sampleLength);
}
