import { formatTitle } from "../utils/other.js";
import type { SequencerUI } from "./sequencer_ui.ts";

export function updateTitleAndMediaStatus(
    this: SequencerUI,
    cleanOtherTextEvents = true
) {
    if (!this.seq.midiData) {
        return;
    }
    if (this.seq.hasDummyData) {
        this.currentSongTitle = this.locale.getLocaleString(
            "locale.synthInit.genericLoading"
        );
    } else {
        const name = this.seq.midiData.getName(this.encoding) ?? "Song";
        if (name === this.seq.midiData.fileName) {
            this.currentSongTitle = formatTitle(name);
        } else {
            this.currentSongTitle = name;
        }
    }
    if (this.seq.midiData) {
        this.loadLyricData();
        this.setLyricsText(this.lyricsIndex);
        if (cleanOtherTextEvents) {
            this.rawOtherTextEvents = [];
        }
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
}
