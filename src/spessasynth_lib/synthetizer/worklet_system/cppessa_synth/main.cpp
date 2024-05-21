#include <iostream>
#include <emscripten.h>

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    int* addTwoNums(int* numArray1, int* numArray2, int len) {
        int* array = new int[len];
        for (int i = 0; i < len; i++) {
            array[i] = numArray2[i] + numArray1[i];
            std::cout << numArray1[i] << " + " << numArray2[i] << " = " << array[i] << "\n";  // Corrected log statement
        }
        return array;
    }

    EMSCRIPTEN_KEEPALIVE
    void freeArray(int* array) {
        delete[] array;
    }
}
