npm uninstall spessasynth_lib spessasynth_core
npm install spessasynth_lib
npm install spessasynth_core
npm pkg set dependencies.spessasynth_core=latest
npm pkg set dependencies.spessasynth_lib=latest
npm run build