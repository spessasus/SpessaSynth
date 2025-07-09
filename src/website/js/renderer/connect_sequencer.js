import { messageTypes } from "spessasynth_core";

/**
 * @param sequencer {CustomSeq}
 * @this {Renderer}
 */
export function connectSequencer(sequencer)
{
    /**
     * @type {CustomSeq}
     */
    this.seq = sequencer;
    this.seq.addOnTimeChangeEvent(() => this.resetIndexes(), "renderer-time-change");
    
    this.seq.addOnSongChangeEvent(async mid =>
    {
        this.calculateNoteTimes(await this.seq.getMIDI());
        this.resetIndexes();
        if (mid.RMIDInfo?.["IPIC"] !== undefined)
        {
            const blob = new Blob([mid.RMIDInfo?.["IPIC"].buffer]);
            const url = URL.createObjectURL(blob);
            const opacity = this.canvas.classList.contains("light_mode") ? 0 : 0.9;
            this.canvas.style.background = `linear-gradient(rgba(0, 0, 0, ${opacity}), rgba(0, 0, 0, ${opacity})), center center / cover url("${url}")`;
        }
        else
        {
            this.canvas.style.background = "";
        }
    }, "renderer-song-change");
    
    
    this.seq.addOnMetaEvent(ev =>
    {
        const event = ev[0];
        if (event.messageStatusByte === messageTypes.timeSignature)
        {
            this.currentTimeSignature = `${event.messageData[0]}/${Math.pow(2, event.messageData[1])}`;
        }
    }, "renderer-meta-event");
}

/**
 * @this {Renderer}
 */
export function resetIndexes()
{
    if (!this.noteTimes)
    {
        return;
    }
    
    this.noteTimes.forEach(n => n.renderStartIndex = 0);
}