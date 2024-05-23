# This is the WebAssembly worklet system.
It contains the C++ code for audio rendering.

## Build
- install emscripten
- make sure that the `em++` command works in this directory

### Debug build
```shell
$ chmod +x build_command.sh
$ ./build_command.sh
```

### Release build
```shell
$ chmod +x build_command_release.sh
$ ./build_command_release.sh
```