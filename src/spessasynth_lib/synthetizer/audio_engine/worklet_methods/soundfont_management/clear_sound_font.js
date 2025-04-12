/**
 * @this {SpessaSynthProcessor}
 * @param sendPresets {boolean}
 * @param clearOverride {boolean}
 */
export function clearSoundFont(sendPresets = true, clearOverride = true)
{
    this.stopAllChannels(true);
    if (clearOverride)
    {
        delete this.overrideSoundfont;
        this.overrideSoundfont = undefined;
    }
    this.getDefaultPresets();
    this.cachedVoices = [];
    
    for (let i = 0; i < this.midiAudioChannels.length; i++)
    {
        const channelObject = this.midiAudioChannels[i];
        if (!clearOverride || (clearOverride && channelObject.presetUsesOverride))
        {
            channelObject.setPresetLock(false);
        }
        channelObject.programChange(channelObject.preset.program);
    }
    if (sendPresets)
    {
        this.sendPresetList();
    }
}