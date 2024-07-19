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
    this.noteStartTime = this.seq.absoluteStartTime;
    this.noteTimes.forEach(n => n.renderStartIndex = 0);
}