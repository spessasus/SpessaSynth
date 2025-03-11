/**
 * @param isMuted {boolean}
 * @this {WorkletProcessorChannel}
 */
export function muteChannel(isMuted)
{
    if (isMuted)
    {
        this.stopAllNotes(true);
    }
    this.isMuted = true;
    this.synth.sendChannelProperties();
    this.synth.callEvent("mutechannel", {
        channel: this.channelNumber,
        isMuted: isMuted
    });
}