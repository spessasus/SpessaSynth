
export class DropFileHandler
{
    /**
     * Creates a new handler for handling file dropping into the app
     * @param midiCallback {function({buf: ArrayBuffer, name: string})}
     * @param soundFontCallback {function(ArrayBuffer)}
     */
    constructor(midiCallback, soundFontCallback)
    {
        const dragPrompt = document.getElementsByClassName("drop_prompt")[0];
        document.body.addEventListener("dragover", e => {
            e.preventDefault();
            dragPrompt.classList.remove("hidden");
        });
        document.body.addEventListener("dragleave", () => {
            dragPrompt.classList.add("hidden");
        });

        document.body.addEventListener("drop", async e => {
            e.preventDefault();
            dragPrompt.classList.add("hidden");
            const file = e.dataTransfer.files[0];
            if(!file) return;

            const name = file.name;
            const buf = await file.arrayBuffer();
            // identify the file
            // check for RIFF
            const riff = buf.slice(0, 4);
            const decoder = new TextDecoder();
            if(decoder.decode(riff) === "RIFF")
            {
                // riff, check if RMID, otherwise soundfont
                const rmid = buf.slice(8, 12);
                if(decoder.decode(rmid) === "RMID")
                {
                    // RMID
                    midiCallback({buf: buf, name: name});
                    return;
                }
                // soundfont
                soundFontCallback(buf);
                return;
            }
            // midi
            midiCallback({buf: buf, name: name});

        })
    }
}