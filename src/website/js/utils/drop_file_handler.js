export class DropFileHandler
{
    /**
     * Creates a new handler for handling file dropping into the app
     * @param midiCallback {function(MIDIFile[])}
     * @param soundFontCallback {function(ArrayBuffer)}
     */
    constructor(midiCallback, soundFontCallback)
    {
        const dragPrompt = document.getElementsByClassName("drop_prompt")[0];
        document.body.addEventListener("dragover", e =>
        {
            e.preventDefault();
            dragPrompt.classList.remove("hidden");
        });
        document.body.addEventListener("dragend", () =>
        {
            dragPrompt.classList.add("hidden");
        });
        
        document.body.addEventListener("drop", async e =>
        {
            e.preventDefault();
            dragPrompt.classList.add("hidden");
            if (!e.dataTransfer.files[0])
            {
                return;
            }
            
            /**
             * @type {MidFile[]}
             */
            const MIDIFiles = [];
            
            for (const file of e.dataTransfer.files)
            {
                const name = file.name;
                const buf = await file.arrayBuffer();
                // identify the file
                // check for RIFF
                const riff = buf.slice(0, 4);
                const decoder = new TextDecoder();
                if (decoder.decode(riff) === "RIFF")
                {
                    // riff, check if RMID, otherwise soundfont
                    const rmid = buf.slice(8, 12);
                    if (decoder.decode(rmid) === "RMID")
                    {
                        // RMID
                        MIDIFiles.push({ binary: buf, altName: name });
                        continue;
                    }
                    // soundfont
                    soundFontCallback(buf);
                    continue;
                }
                // midi
                MIDIFiles.push({ binary: buf, altName: name });
            }
            midiCallback(MIDIFiles);
        });
    }
}