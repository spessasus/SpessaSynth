/**
 * @param sequencer {Sequencer}
 * @this {Renderer}
 */
export function connectSequencer(sequencer)
{
    this.seq = sequencer;

    this.seq.addOnSongChangeEvent(async () => {
        this.calculateNoteTimes(await this.seq.getMIDI());
        this.resetIndexes();
    }, "renderer-song-change");
    this.seq.addOnTimeChangeEvent(() => this.resetIndexes(), "renderer-time-change");

    this.seq.addOnSongChangeEvent(mid => {
        if(mid.RMIDInfo?.["IPIC"] !== undefined)
        {
            const blob = new Blob([mid.RMIDInfo?.["IPIC"].buffer]);
            const url = URL.createObjectURL(blob);
            this.canvas.style.background = `linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9)), center center / cover url("${url}")`;
        }
        else
        {
            this.canvas.style.background = "";
        }
    })
}

/**
 * @this {Renderer}
 */
export function resetIndexes()
{
    if(!this.noteTimes)
    {
        return;
    }

    this.noteTimes.forEach(n => n.renderStartIndex = 0);
}