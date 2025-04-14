import { loadSoundFont } from "../../../../soundfont/load_soundfont.js";
import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { consoleColors } from "../../../../utils/other.js";

/**
 * @param buffer {ArrayBuffer}
 * @param isOverride {Boolean}
 * @this {SpessaSynthProcessor}
 */
export function reloadSoundFont(buffer, isOverride = false)
{
    this.clearSoundFont(false, isOverride);
    if (isOverride)
    {
        this.overrideSoundfont = loadSoundFont(buffer);
    }
    else
    {
        this.soundfontManager.reloadManager(buffer);
    }
    this.getDefaultPresets();
    this.midiAudioChannels.forEach(c =>
        c.programChange(c.preset.program)
    );
    this.postReady();
    this.sendPresetList();
    SpessaSynthInfo("%cSpessaSynth is ready!", consoleColors.recognized);
}