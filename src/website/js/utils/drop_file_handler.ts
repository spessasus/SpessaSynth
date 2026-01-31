export interface MIDIFile {
    binary: ArrayBuffer;
    fileName: string;
}

export class DropFileHandler {
    /**
     * Creates a new handler for handling file dropping into the app
     */
    public constructor(
        midiCallback: (arg0: MIDIFile[]) => unknown,
        soundFontCallback: (arg0: ArrayBuffer) => unknown
    ) {
        const dragPrompt = document.querySelectorAll(".drop_prompt")[0];
        document.body.addEventListener("dragover", (e) => {
            e.preventDefault();
            dragPrompt.classList.remove("hidden");
        });
        document.body.addEventListener("dragend", () => {
            dragPrompt.classList.add("hidden");
        });

        document.body.addEventListener(
            "drop",
            (e) =>
                void (async (e) => {
                    e.preventDefault();
                    dragPrompt.classList.add("hidden");
                    if (!e.dataTransfer?.files[0]) {
                        return;
                    }

                    const MIDIFiles: MIDIFile[] = [];

                    for (const file of e.dataTransfer.files) {
                        const name = file.name;
                        const buf = await file.arrayBuffer();
                        // Identify the file
                        // Check for RIFF
                        const riff = buf.slice(0, 4);
                        const decoder = new TextDecoder();
                        if (decoder.decode(riff) === "RIFF") {
                            // Riff, check if RMID, otherwise soundfont
                            const rmid = buf.slice(8, 12);
                            if (decoder.decode(rmid) === "RMID") {
                                // RMID
                                MIDIFiles.push({ binary: buf, fileName: name });
                                continue;
                            }
                            // Soundfont
                            soundFontCallback(buf);
                            continue;
                        }
                        // Midi
                        MIDIFiles.push({ binary: buf, fileName: name });
                    }
                    midiCallback(MIDIFiles);
                })(e)
        );
    }
}
