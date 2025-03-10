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
            // assign sample offset
            this.overrideSoundfont.setSampleIDOffset(this.soundfontManager.totalSoundfontOffset);
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
    this.defaultPreset = this.getPreset(0, 0);
    this.drumPreset = this.getPreset(128, 0);
    this.workletProcessorChannels.forEach((c, cNum) =>
    {
        this.programChange(cNum, c.preset.program);
    });
    this.post({ messageType: returnMessageType.ready, messageData: undefined });
    this.sendPresetList();
    SpessaSynthInfo("%cSpessaSynth is ready!", consoleColors.recognized);
}