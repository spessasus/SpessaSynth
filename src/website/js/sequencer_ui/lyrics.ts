import { midiMessageTypes } from "spessasynth_core";
import type { SequencerUI } from "./sequencer_ui.ts";

export function setLyricsText(this: SequencerUI, index: number) {
    // If there are no lyrics, there's one element:
    // ["No lyrics available"]
    if (
        this.currentLyricsString.length < 1 ||
        index < 0 ||
        index > this.currentLyricsString.length
    ) {
        return;
    }
    this.lyricsIndex = index;
    for (let i = 0; i <= index; i++) {
        this.lyricsElement.text.separateLyrics[i].classList.remove(
            "lyrics_text_gray"
        );
        this.lyricsElement.text.separateLyrics[i].classList.add(
            "lyrics_text_highlight"
        );
    }
    if (index < this.currentLyricsString.length) {
        for (
            let i = index + 1;
            i < this.lyricsElement.text.separateLyrics.length;
            i++
        ) {
            this.lyricsElement.text.separateLyrics[i].classList.remove(
                "lyrics_text_highlight"
            );
            this.lyricsElement.text.separateLyrics[i].classList.add(
                "lyrics_text_gray"
            );
        }
        // Scroll to the last element
        this.lyricsElement.text.separateLyrics[index].scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });
    }
}

export function updateOtherTextEvents(this: SequencerUI) {
    let text = "";
    for (const raw of this.rawOtherTextEvents) {
        text += `<span><pre>${Object.keys(midiMessageTypes)
            .find(
                (k) =>
                    midiMessageTypes[k as keyof typeof midiMessageTypes] ===
                    raw.statusByte
            )
            ?.replace(
                /([a-z])([A-Z])/g,
                "$1 $2"
            )}:</pre> <i>${this.decodeTextFix(raw.data.buffer)}</i></span><br>`;
    }
    this.lyricsElement.text.other.innerHTML = text;
}
