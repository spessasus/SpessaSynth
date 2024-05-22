cmake_minimum_required(VERSION 3.28)
project(SpessaSynth)

set(CMAKE_TOOLCHAIN_FILE  /usr/lib/emscripten/cmake/Modules/Platform/Emscripten.cmake)

include_directories(/usr/lib/emscripten/system/include)
link_directories(/usr/lib/emscripten/system/include)

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
        cpessasynth_components/channel_manager/ChannelManager.cpp
        cpessasynth_components/channel_manager/ChannelManager.h
)
