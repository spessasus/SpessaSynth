import { formatTitle } from "../utils/other.js";
import type { SequencerUI } from "./sequencer_ui.ts";

export function updateSongDisplayData(
    this: SequencerUI,
    cleanOtherTextEvents = true
) {
    let requiresMediaUpdate = false;
    if (this.seq?.midiData) {
        const newTitle = formatTitle(
            this.seq.midiData.getName(this.encoding) ?? "Unnamed Song.mid"
        );
        if (newTitle !== this.currentSongTitle) {
            this.currentSongTitle = newTitle;
            requiresMediaUpdate = true;
        }
    } else {
        this.currentSongTitle = this.locale.getLocaleString(
            "locale.synthInit.genericLoading"
        );
    }
    this.loadLyricData();
    this.setLyricsText(this.lyricsIndex);
    if (cleanOtherTextEvents) {
        this.rawOtherTextEvents = [];
    }
    this.mainTitleMessageDisplay.textContent = this.synthDisplayMode.enabled
        ? this.decodeTextFix(this.synthDisplayMode.currentEncodedText.buffer)
        : this.currentSongTitle;
    document.title = this.currentSongTitle + " - SpessaSynth";
    this.musicModeUI.setTitle(this.currentSongTitle);
    if (requiresMediaUpdate) {
        this.updateMediaSession();
    }
    this.syncSilencePlayer();
}
