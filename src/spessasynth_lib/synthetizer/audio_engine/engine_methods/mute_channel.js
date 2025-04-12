/**
 * @param isMuted {boolean}
 * @this {MidiAudioChannel}
 */
export function muteChannel(isMuted)
{
    if (isMuted)
    {
        this.stopAllNotes(true);
    }
    this.isMuted = isMuted;
    this.sendChannelProperty();
    this.synth.callEvent("mutechannel", {
        channel: this.channelNumber,
        isMuted: isMuted
    });
}