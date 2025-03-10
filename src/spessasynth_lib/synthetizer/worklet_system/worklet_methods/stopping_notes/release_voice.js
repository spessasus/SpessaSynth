import { MIN_NOTE_LENGTH } from "../../main_processor.js";

/**
 * Stops the voice
 * @param voice {WorkletVoice} the voice to stop
 * @param minNoteLength {number} minimum note length in seconds
 * @this {SpessaSynthProcessor}
 */
export function releaseVoice(voice, minNoteLength = MIN_NOTE_LENGTH)
{
    voice.releaseStartTime = currentTime;
    // check if the note is shorter than the min note time, if so, extend it
    if (voice.releaseStartTime - voice.startTime < minNoteLength)
    {
        voice.releaseStartTime = voice.startTime + minNoteLength;
    }
}