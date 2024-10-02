import { loadSoundFont } from '../../spessasynth_lib/soundfont/load_soundfont.js'

const message = document.getElementById("message");
document.getElementById("dls_upload").oninput = e => {
    if(!e.target.files)
    {
        return;
    }
    const file = e.target.files[0];
    if(file.type.endsWith(".dls"))
    {
        message.innerText = "Not a DLS file.";
        return;
    }
    document.getElementById("dls_upload_btn").innerText = file.name;
    message.innerText = "Loading...";
    setTimeout(async () => {
        let sfont;
        try
        {
            sfont = loadSoundFont(await file.arrayBuffer());
        }
        catch (e)
        {
            message.style.color = "red";
            message.innerText = `Error: ${e.message}`;
            return;
        }
        document.getElementById("sf_info").classList.remove("hidden");
        document.getElementById("dls_name").innerText = sfont.soundFontInfo["INAM"] || "Unnamed"            ;
        document.getElementById("dls_description").innerText = (sfont.soundFontInfo["ICMT"] || "No description").replace("\nConverted from DLS to SF2 with SpessaSynth", "");
        document.getElementById("dls_presets").innerText = sfont.presets.length;
        document.getElementById("dls_samples").innerText = sfont.samples.length;
        message.innerText = "Loaded!";

        const convert = document.getElementById("convert");
        convert.classList.remove("hidden");
        convert.innerText = `Convert ${file.name}`

        convert.onclick = () => {
            const binary = sfont.write();
            const blob = new Blob([binary.buffer], {type: "audio/soundfont"});
            const url = URL.createObjectURL(blob);
            const name = file.name.replace("dls", "sf2");
            const a = document.createElement("a");
            a.href = url;
            a.download = name;
            a.innerText = `Download ${name}`;
            const down = document.getElementById("download");
            down.classList.remove("hidden");
            down.innerHTML = "";
            down.appendChild(a);
            message.style.color = "green";
            message.innerText = `Success!`;
        }
    });
}