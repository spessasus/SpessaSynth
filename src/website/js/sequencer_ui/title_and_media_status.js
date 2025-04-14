import { formatTitle } from "../utils/other.js";

/**
 * @this {SequencerUI}
 */
export function createNavigatorHandler()
{
    if (!navigator.mediaSession)
    {
        return;
    }
    
    navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentSongTitle,
        artist: "SpessaSynth"
    });
    
    navigator.mediaSession.setActionHandler("play", () =>
    {
        this.seqPlay();
    });
    navigator.mediaSession.setActionHandler("pause", () =>
    {
        this.seqPause();
    });
    navigator.mediaSession.setActionHandler("stop", () =>
    {
        this.seq.currentTime = 0;
        this.seqPause();
    });
    navigator.mediaSession.setActionHandler("seekbackward", e =>
    {
        this.seq.currentTime -= e.seekOffset || 10;
    });
    navigator.mediaSession.setActionHandler("seekforward", e =>
    {
        this.seq.currentTime += e.seekOffset || 10;
    });
    navigator.mediaSession.setActionHandler("seekto", e =>
    {
        this.seq.currentTime = e.seekTime;
    });
    navigator.mediaSession.setActionHandler("previoustrack", () =>
    {
        this.switchToPreviousSong();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () =>
    {
        this.switchToNextSong();
    });
    
    navigator.mediaSession.playbackState = "playing";
}

/**
 * @this {SequencerUI}
 * @param cleanOtherTextEvents {boolean}
 */
export function updateTitleAndMediaStatus(cleanOtherTextEvents = true)
{
    if (this.seq?.hasDummyData === true)
    {
        this.currentSongTitle = this.locale.getLocaleString("locale.synthInit.genericLoading");
    }
    else
    {
        if (this.seq.midiData.midiNameUsesFileName)
        {
            this.currentSongTitle = formatTitle(this.seq.midiData.fileName);
        }
        else
        {
            const text = this.infoDecoder.decode(this.seq.midiData.rawMidiName.buffer).replace(/\0$/, "");
            this.currentSongTitle = formatTitle(text);
        }
    }
    if (this.seq.midiData)
    {
        this.loadLyricData();
        this.setLyricsText(this.lyricsIndex);
        if (cleanOtherTextEvents)
        {
            this.rawOtherTextEvents = [];
        }
    }
    if (this.synthDisplayMode.enabled === false)
    {
        this.mainTitleMessageDisplay.innerText = this.currentSongTitle;
    }
    else
    {
        this.mainTitleMessageDisplay.innerText = this.decodeTextFix(this.synthDisplayMode.currentEncodedText.buffer);
    }
    document.title = this.currentSongTitle + " - SpessaSynth";
    this.musicModeUI.setTitle(this.currentSongTitle);
    
    if (!navigator.mediaSession)
    {
        return;
    }
    try
    {
        navigator.mediaSession.setPositionState({
            duration: this.seq.duration,
            playbackRate: this.seq.playbackRate,
            position: this.seq.currentTime
        });
    }
    catch (e)
    {
    }
}