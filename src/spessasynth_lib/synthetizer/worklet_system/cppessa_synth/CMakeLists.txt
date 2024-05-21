cmake_minimum_required(VERSION 3.28)
project(spessasynth_wasm_test)
include_directories(/home/spessasus/.emscripten_cache/sysroot/include)
link_directories(/home/spessasus/.emscripten_cache/sysroot/include)

set(CMAKE_CXX_STANDARD 17)

add_executable(spessasynth_wasm_test main.cpp)
