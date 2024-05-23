//
// Created by spessasus on 23.05.24.
//

#include "DumpedSample.h"

DumpedSample::DumpedSample(float *sampleData, unsigned int sampleLength) {
    this->sampleData = sampleData;
    this->sampleLength = sampleLength;
    this->isEmpty = false;
}

DumpedSample::DumpedSample() {
    this->sampleData = nullptr;
    this->sampleLength = 0;
    this->isEmpty = true;
}
