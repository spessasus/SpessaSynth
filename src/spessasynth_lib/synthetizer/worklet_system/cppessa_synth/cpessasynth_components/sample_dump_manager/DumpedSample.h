//
// Created by spessasus on 23.05.24.
//

#ifndef SPESSASYNTH_DUMPEDSAMPLE_H
#define SPESSASYNTH_DUMPEDSAMPLE_H


class DumpedSample {
public:
    float* sampleData;
    unsigned int sampleLength;
    bool isEmpty;

    DumpedSample(float* sampleData, unsigned int sampleLength);
    DumpedSample();
};


#endif //SPESSASYNTH_DUMPEDSAMPLE_H
