/**
 * Processes a single tick
 * @private
 * @this {WorkletSequencer}
 */
export function _processTick()
{
    let current = this.currentTime;
    while(this.playedTime < current)
    {
        // find next event
        let trackIndex = this._findFirstEventIndex();
        let event = this.tracks[trackIndex][this.eventIndex[trackIndex]];
        this._processEvent(event, trackIndex);

        this.eventIndex[trackIndex]++;

        // find next event
        trackIndex = this._findFirstEventIndex();
        if(this.tracks[trackIndex].length <= this.eventIndex[trackIndex])
        {
            // song has ended
            if(this.loop)
            {
                this.setTimeTicks(this.midiData.loop.start);
                return;
            }
            this.eventIndex[trackIndex]--;
            this.pause(true);
            if(this.songs.length > 1)
            {
                this.nextSong();
            }
            return;
        }
        let eventNext = this.tracks[trackIndex][this.eventIndex[trackIndex]];
        this.playedTime += this.oneTickToSeconds * (eventNext.ticks - event.ticks);

        // loop
        if((this.midiData.loop.end <= event.ticks) && this.loop)
        {
            this.setTimeTicks(this.midiData.loop.start);
            return;
        }
        // if song has ended
        else if(current >= this.duration)
        {
            if(this.loop)
            {
                this.setTimeTicks(this.midiData.loop.start);
                return;
            }
            this.eventIndex[trackIndex]--;
            this.pause(true);
            if(this.songs.length > 1)
            {
                this.nextSong();
            }
            return;
        }
    }
}


/**
 * @returns {number} the index of the first to the current played time
 * @this {WorkletSequencer}
 */
export function _findFirstEventIndex()
{
    let index = 0;
    let ticks = Infinity;
    this.tracks.forEach((track, i) => {
        if(this.eventIndex[i] >= track.length)
        {
            return;
        }
        if(track[this.eventIndex[i]].ticks < ticks)
        {
            index = i;
            ticks = track[this.eventIndex[i]].ticks;
        }
    });
    return index;
}