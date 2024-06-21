/**
 * @param sequencer {Sequencer}
 * @this {Renderer}
 */
export function connectSequencer(sequencer)
{
    this.seq = sequencer;
    this.calculateNoteTimes(sequencer.midiData);

    this.seq.addOnSongChangeEvent(midi => this.calculateNoteTimes(midi), "renderer-song-change");
    this.seq.addOnTimeChangeEvent(() => this.resetIndexes(), "renderer-time-change");
}

/**
 * @this {Renderer}
 */
export function resetIndexes()
{
    this.noteStartTime = this.seq.absoluteStartTime;
    this.noteTimes.forEach(n => n.renderStartIndex = 0);
}