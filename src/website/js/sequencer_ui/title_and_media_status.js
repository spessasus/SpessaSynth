import { formatTitle } from '../../../spessasynth_lib/utils/other.js'

/**
 * @this {SequencerUI}
 */
export function createNavigatorHandler()
{
    if(!navigator.mediaSession)
    {
        return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentSongTitle,
        artist: "SpessaSynth"
    });

    navigator.mediaSession.setActionHandler("play", () => {
        this.seqPlay();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
        this.seqPause();
    });
    navigator.mediaSession.setActionHandler("stop", () => {
        this.seq.currentTime = 0;
        this.seqPause();
    });
    navigator.mediaSession.setActionHandler("seekbackward", e => {
        this.seq.currentTime -= e.seekOffset || 10;
    });
    navigator.mediaSession.setActionHandler("seekforward", e => {
        this.seq.currentTime += e.seekOffset || 10;
    });
    navigator.mediaSession.setActionHandler("seekto", e => {
        this.seq.currentTime = e.seekTime
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
        this.switchToPreviousSong();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
        this.switchToNextSong();
    });

    navigator.mediaSession.playbackState = "playing";
}

/**
 * @this {SequencerUI}
 */
export function updateTitleAndMediaStatus()
{
    const text = this.decodeTextFix(this.seq.midiData.rawMidiName.buffer);
    this.currentSongTitle = formatTitle(text);
    if(this.seq.midiData)
    {
        // combine lyrics into one binary array
        const lyricsArray = this.seq.midiData.lyrics;
        this.currentLyrics = new Uint8Array(lyricsArray.reduce((sum, cur) => sum + cur.length, 0));
        let offset = 0;
        for(const lyr of lyricsArray)
        {
            this.currentLyrics.set(lyr, offset);
            offset += lyr.length;
        }
        this.currentLyricsString = this.decodeTextFix(this.currentLyrics.buffer) || this.locale.getLocaleString("locale.sequencerController.lyrics.noLyrics");
        this.setLyricsText("");
        this.rawOtherTextEvents = [];
    }
    document.getElementById("title").innerText = this.currentSongTitle;
    document.title = this.currentSongTitle + " - SpessaSynth";
    this.musicModeUI.setTitle(this.currentSongTitle);

    if(!navigator.mediaSession)
    {
        return;
    }
    try {
        navigator.mediaSession.setPositionState({
            duration: this.seq.duration,
            playbackRate: this.seq.playbackRate,
            position: this.seq.currentTime
        });
    }
    catch(e)
    {

    }
}