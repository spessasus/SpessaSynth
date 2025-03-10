/**
 * @param channel {number}
 * @param preset {BasicPreset}
 * @this {SpessaSynthProcessor}
 */
export function setPreset(channel, preset)
{
    if (this.workletProcessorChannels[channel].lockPreset)
    {
        return;
    }
    delete this.workletProcessorChannels[channel].preset;
    this.workletProcessorChannels[channel].preset = preset;
    
    // reset cached voices
    this.workletProcessorChannels[channel].cachedVoices = [];
    for (let i = 0; i < 128; i++)
    {
        this.workletProcessorChannels[channel].cachedVoices.push([]);
    }
}

