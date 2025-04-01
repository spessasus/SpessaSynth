import { loadSoundFont } from "../../../../soundfont/load_soundfont.js";
import { returnMessageType } from "../../message_protocol/worklet_message.js";
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
    try
    {
        if (isOverride)
        {
            this.overrideSoundfont = loadSoundFont(buffer);
        }
        else
        {
            this.soundfontManager.reloadManager(buffer);
        }
    }
    catch (e)
    {
        this.post({
            messageType: returnMessageType.soundfontError,
            messageData: e
        });
        return;
    }
    this.getDefaultPresets();
    this.workletProcessorChannels.forEach(c =>
        c.programChange(c.preset.program)
    );
    this.postReady();
    this.sendPresetList();
    SpessaSynthInfo("%cSpessaSynth is ready!", consoleColors.recognized);
}