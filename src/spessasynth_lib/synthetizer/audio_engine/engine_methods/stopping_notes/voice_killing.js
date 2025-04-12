/**
 * @param channel {MidiAudioChannel}
 * @param voice {Voice}
 * @return {number}
 */
function getPriority(channel, voice)
{
    let priority = 0;
    if (channel.drumChannel)
    {
        // important
        priority += 5;
    }
    if (voice.isInRelease)
    {
        // not important
        priority -= 5;
    }
    // less velocity = less important
    priority += voice.velocity / 25; // map to 0-5
    // the newer, more important
    priority -= voice.volumeEnvelope.state;
    if (voice.isInRelease)
    {
        priority -= 5;
    }
    priority -= voice.volumeEnvelope.currentAttenuationDb / 50;
    return priority;
}

/**
 * @this {SpessaSynthProcessor}
 * @param amount {number}
 */
export function voiceKilling(amount)
{
    let allVoices = [];
    for (const channel of this.midiAudioChannels)
    {
        for (const voice of channel.voices)
        {
            if (!voice.finished)
            {
                const priority = getPriority(channel, voice);
                allVoices.push({ channel, voice, priority });
            }
        }
    }
    
    // Step 2: Sort voices by priority (ascending order)
    allVoices.sort((a, b) => a.priority - b.priority);
    const voicesToRemove = allVoices.slice(0, amount);
    
    for (const { channel, voice } of voicesToRemove)
    {
        const index = channel.voices.indexOf(voice);
        if (index > -1)
        {
            channel.voices.splice(index, 1);
        }
    }
}

