import type { SequencerUI } from "./sequencer_ui.ts";

/**
 * Sanitizes KAR lyrics
 */
export function sanitizeKarLyrics(eventData: Uint8Array): Uint8Array {
    // For KAR files:
    // https://www.mixagesoftware.com/en/midikit/help/HTML/karaoke_formats.html
    // "/" is the newline character
    // "\" is also the newline character
    // "\" ASCII code is 92
    // "/" ASCII code is 47
    // Newline ASCII code is 10
    const sanitized: number[] = [];
    for (let byte of eventData) {
        if (byte === 47 || byte === 92) {
            byte = 10;
        }
        sanitized.push(byte);
    }
    return new Uint8Array(sanitized);
}

export function setLyricsText(this: SequencerUI, index: number) {
    // If there are no lyrics, there's one element:
    // ["No lyrics available"]
    if (
        this.currentLyricsString.length === 0 ||
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
