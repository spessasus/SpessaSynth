import { formatTitle } from "../utils/other.js";
import type { SequencerUI } from "./sequencer_ui.ts";

export function updateTitleAndMediaStatus(
    this: SequencerUI,
    cleanOtherTextEvents = true
) {
    let requiresMediaUpdate = false;
    if (!this.seq?.midiData) {
        this.currentSongTitle = this.locale.getLocaleString(
            "locale.synthInit.genericLoading"
        );
    } else {
        const newTitle = formatTitle(
            this.seq.midiData.getName(this.encoding) ?? "Unnamed Song.mid"
        );
        if (newTitle !== this.currentSongTitle) {
            this.currentSongTitle = newTitle;
            requiresMediaUpdate = true;
        }
    }
    this.loadLyricData();
    this.setLyricsText(this.lyricsIndex);
    if (cleanOtherTextEvents) {
        this.rawOtherTextEvents = [];
    }
    if (!this.synthDisplayMode.enabled) {
        this.mainTitleMessageDisplay.innerText = this.currentSongTitle;
    } else {
        this.mainTitleMessageDisplay.innerText = this.decodeTextFix(
            this.synthDisplayMode.currentEncodedText.buffer
        );
    }
    document.title = this.currentSongTitle + " - SpessaSynth";
    this.musicModeUI.setTitle(this.currentSongTitle);
    this.syncSilencePlayer();
    if (requiresMediaUpdate) {
        this.updateMediaSession();
    }
}
