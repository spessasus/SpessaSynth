cmake_minimum_required(VERSION 3.28)
project(SpessaSynth)

set(CMAKE_TOOLCHAIN_FILE  /usr/lib/emscripten/cmake/Modules/Platform/Emscripten.cmake)

include_directories(/home/spessasus/.emscripten_cache/sysroot/include)
link_directories(/home/spessasus/.emscripten_cache/sysroot/include)
set(CMAKE_CXX_STANDARD 17)

add_executable(tester main.cpp
        extern_c.h
        main.h
        cpessasynth_components/voice/Voice.cpp
        cpessasynth_components/voice/Voice.h
        cpessasynth_components/voice/VoiceSample.cpp
        cpessasynth_components/voice/VoiceSample.h
        cpessasynth_components/lowpass_filter/LowpassFilter.cpp
        cpessasynth_components/lowpass_filter/LowpassFilter.h
        cpessasynth_components/generatorTypes.h
        cpessasynth_components/unit_converter/UnitConverter.cpp
        cpessasynth_components/unit_converter/UnitConverter.h
        cpessasynth_components/modulator/Modulator.cpp
        cpessasynth_components/modulator/Modulator.h
        cpessasynth_components/volumeEnvelope/VolumeEnvelope.cpp
        cpessasynth_components/volumeEnvelope/VolumeEnvelope.h
        cpessasynth_components/channel/Channel.cpp
        cpessasynth_components/channel/Channel.h
        cpessasynth_components/sample_dump_manager/SampleDumpManager.cpp
        cpessasynth_components/sample_dump_manager/SampleDumpManager.h
        cpessasynth_components/sample_dump_manager/DumpedSample.h
        cpessasynth_components/sample_dump_manager/DumpedSample.cpp
        cpessasynth_components/constants.h
        cpessasynth_components/low_frequency_oscillator/LowFrequencyOscillator.cpp
        cpessasynth_components/low_frequency_oscillator/LowFrequencyOscillator.h
        cpessasynth_components/channel/ChannelVibrato.cpp
        cpessasynth_components/channel/ChannelVibrato.h
        cpessasynth_components/modulation_envelope/ModulationEnvelope.cpp
        cpessasynth_components/modulation_envelope/ModulationEnvelope.h
        cpessasynth_components/wavetable_oscillator/WavetableOscillator.cpp
        cpessasynth_components/wavetable_oscillator/WavetableOscillator.h
        cpessasynth_components/stereo_panner/StereoPanner.cpp
        cpessasynth_components/stereo_panner/StereoPanner.h
        cpessasynth_components/CppessaSynth.cpp
        cpessasynth_components/CppessaSynth.h
        cpessasynth_components/midiControllers.h
)
