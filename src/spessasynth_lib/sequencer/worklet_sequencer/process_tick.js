import { WorkletSequencerReturnMessageType } from "./sequencer_message.js";

const SINGLE_FRAME_SAMPLE_LIMIT = 1;

/**
 * Processes a single tick (called every rendering quantum)
 * @private
 * @param elapsed {number} the time elapsed in this frame
 * @this {WorkletSequencer}
 */
export function _processTick(elapsed)
{
    // chrome preloading queue, if true, we do not process events, but load samples until all are loaded
    if (this.chromePreloadQueueConfig.currentlyEnabled)
    {
        if (this.chromePreloadQueue.size !== 0)
        {
            this.post(
                WorkletSequencerReturnMessageType.preloadingProgress,
                this.chromePreloadQueue.size / this.chromePreloadQueueConfig.initialLength
            );
            let count = 0;
            while (this.chromePreloadQueue.size !== 0)
            {
                const sample = this.chromePreloadQueue.values().next().value;
                // preload and cache the sample
                sample.getAudioData();
                this.chromePreloadQueue.delete(sample);
                count++;
                if (count >= SINGLE_FRAME_SAMPLE_LIMIT)
                {
                    // skip the rendering and adjust absolute time
                    this.absoluteStartTime += elapsed;
                    return;
                }
            }
            // skip the rendering and adjust absolute time
            this.absoluteStartTime += elapsed;
            return;
        }
        else
        {
            console.log("preloading finished");
            this.chromePreloadQueueConfig.currentlyEnabled = false;
            // if play after finish
            if (this.chromePreloadQueueConfig.playAfterFinish)
            {
                if (this.chromePreloadQueueConfig.targetTimeAfterFinish === undefined)
                {
                    this.play();
                }
                else if (this.chromePreloadQueueConfig.targetTimeAfterFinish >= 0)
                {
                    // positive: numbers are in seconds
                    this.currentTime = this.chromePreloadQueueConfig.targetTimeAfterFinish;
                    if (this.preservePlaybackState)
                    {
                        this.play();
                    }
                }
                else if (this.chromePreloadQueueConfig.targetTimeAfterFinish < 0)
                {
                    // negative: numbers are in MIDI ticks
                    this.setTimeTicks(-this.chromePreloadQueueConfig.targetTimeAfterFinish);
                    if (this.preservePlaybackState)
                    {
                        this.play();
                    }
                }
            }
            // skip the rendering and adjust absolute time
            this.absoluteStartTime += elapsed;
            return;
        }
    }
    let current = this.currentTime;
    while (this.playedTime < current)
    {
        // find next event
        let trackIndex = this._findFirstEventIndex();
        let event = this.tracks[trackIndex][this.eventIndex[trackIndex]];
        this._processEvent(event, trackIndex);
        
        this.eventIndex[trackIndex]++;
        
        // find next event
        trackIndex = this._findFirstEventIndex();
        if (this.tracks[trackIndex].length <= this.eventIndex[trackIndex])
        {
            // song has ended
            if (this.loop)
            {
                this.setTimeTicks(this.midiData.loop.start);
                return;
            }
            this.eventIndex[trackIndex]--;
            this.pause(true);
            if (this.songs.length > 1)
            {
                this.nextSong();
            }
            return;
        }
        let eventNext = this.tracks[trackIndex][this.eventIndex[trackIndex]];
        this.playedTime += this.oneTickToSeconds * (eventNext.ticks - event.ticks);
        
        // loop
        if ((this.midiData.loop.end <= event.ticks) && this.loop && this.currentLoopCount > 0)
        {
            this.currentLoopCount--;
            this.setTimeTicks(this.midiData.loop.start);
            return;
        }
        // if song has ended
        else if (current >= this.duration)
        {
            if (this.loop && this.currentLoopCount > 0)
            {
                this.currentLoopCount--;
                this.setTimeTicks(this.midiData.loop.start);
                return;
            }
            this.eventIndex[trackIndex]--;
            this.pause(true);
            if (this.songs.length > 1)
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
    this.tracks.forEach((track, i) =>
    {
        if (this.eventIndex[i] >= track.length)
        {
            return;
        }
        if (track[this.eventIndex[i]].ticks < ticks)
        {
            index = i;
            ticks = track[this.eventIndex[i]].ticks;
        }
    });
    return index;
}