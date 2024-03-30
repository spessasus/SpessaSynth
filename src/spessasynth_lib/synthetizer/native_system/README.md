# This is the old synthesis system.
It's not updated anymore, but it's here for the HTTP websites which can't use AudioWorklets.
To use this system, change the `synthesisMode` to `"legacy"`:

```js
synth.synthesisMode = "legacy";
```
it should automatically create the legacy channels.
If you want to automatically use this mode, then
```js
export const DEFAULT_SYNTHESIS_MODE = "legacy";
```

Note:
the synth will try to detect if the worklets are available. if not, then it should switch to legacy
