em++ main.cpp \
cpessasynth_components/voice/Voice.cpp \
cpessasynth_components/voice/VoiceSample.cpp \
cpessasynth_components/lowpass_filter/LowpassFilter.cpp \
cpessasynth_components/unit_converter/UnitConverter.cpp \
cpessasynth_components/modulator/Modulator.cpp \
cpessasynth_components/volumeEnvelope/VolumeEnvelope.cpp \
cpessasynth_components/channel/Channel.cpp \
cpessasynth_components/sample_dump_manager/SampleDumpManager.cpp \
cpessasynth_components/sample_dump_manager/DumpedSample.cpp \
cpessasynth_components/low_frequency_oscillator/LowFrequencyOscillator.cpp \
cpessasynth_components/channel/ChannelVibrato.cpp \
cpessasynth_components/modulation_envelope/ModulationEnvelope.cpp \
cpessasynth_components/wavetable_oscillator/WavetableOscillator.cpp \
cpessasynth_components/stereo_panner/StereoPanner.cpp \
cpessasynth_components/CppessaSynth.cpp \
-o ../cpessasynth.js \
-s EXPORTED_FUNCTIONS="['_malloc', '_free']" \
-s EXPORTED_RUNTIME_METHODS="['setValue']" \
-s SAFE_HEAP=0 \
-s SINGLE_FILE=1 \
-msimd128 \
--closure 1 \
-s WASM=1 \
-s WASM_ASYNC_COMPILATION=0 \
-s MODULARIZE=1 \
-s EXPORT_ES6=1 \
-s ENVIRONMENT="shell" \
-s ALLOW_MEMORY_GROWTH=1 \
-O3