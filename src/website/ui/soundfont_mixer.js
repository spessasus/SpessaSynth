import { getSf2LogoSvg } from './icons.js'
import { SoundFont2 } from '../../spessasynth_lib/soundfont/soundfont_parser.js'

export class SoundFontMixer
{
    /**
     * @param parentElement {HTMLElement}
     * @param synth {Synthetizer}
     * @param synthui {SynthetizerUI}
     */
    constructor(parentElement, synth, synthui) {
        this.rootButton = document.createElement("label");
        this.rootButton.innerHTML = getSf2LogoSvg(24);
        this.rootButton.title = "Soundfont mixer: add new soundfonts and mix them together";
        this.rootButton.onclick = this.toggleVisibility.bind(this);

        this.soundfontMixer = document.createElement("div");
        this.soundfontMixer.classList.add("soundfont_mixer");
        this.soundfontMixer.classList.add("hidden");
        this.synth = synth;
        this.synthui = synthui;

        /**
         * @type {{
         *     element: HTMLDivElement,
         *     soundFont: SoundFont2
         * }[]}
         */
        this.soundfontList = [];

        this.createMixer();

        // append it to the title wrapper so it's outside the top bar (a level up from parent)
        parentElement.parentElement.appendChild(this.soundfontMixer);

        parentElement.appendChild(this.rootButton);
    }

    /**
     * @param sf {SoundFont2}
     */
    soundFontChange(sf)
    {
        let comment = sf.soundFontInfo["ICMT"] || "No description provided";
        comment.replaceAll("\r\n", " ");
        let name = `${sf.soundFontInfo["INAM"] || "Unnamed soundfont"} - ${comment}`;
        if(name.length > 60)
        {
            name = name.substring(0, 57) + "...";
        }
        const wrapper = document.createElement("div");
        wrapper.classList.add("soundfont_entry_wrapper");
        this.sfListElement.insertBefore(wrapper, this.sfListElement.childNodes[0]);

        const soundfontListEntry = {
            element: wrapper,
            soundFont: sf
        };

        const el = document.createElement("div");
        el.classList.add("soundfont_entry");
        el.innerText = name;
        wrapper.appendChild(el);

        const moveUp = document.createElement("div");
        moveUp.classList.add("soundfont_entry");
        moveUp.classList.add("soundfont_entry_button");
        moveUp.innerText = "Up";
        moveUp.onclick = () => { this.moveSoundfontUp(soundfontListEntry)};
        wrapper.appendChild(moveUp);

        this.soundfontList.unshift(soundfontListEntry);
    }

    applyChanges()
    {
        // compile the soundfont from first to last
        let soundfont = SoundFont2.mergeSoundfonts(...this.soundfontList.map(s => s.soundFont));
        this.synth.reloadSoundFont(soundfont);
    }

    /**
     *
     * @param entry {{
     *     element: HTMLDivElement,
     *     soundFont: SoundFont2
     * }}
     */
    moveSoundfontUp(entry)
    {
        const index = this.soundfontList.findIndex(e => e === entry);
        if(index === 0)
        {
            return;
        }
        // swap the entries
        const temp = this.soundfontList[index];
        this.soundfontList[index] = this.soundfontList[index - 1];
        this.soundfontList[index - 1] = temp;

        // in html too
        this.sfListElement.insertBefore(this.sfListElement.childNodes[index], this.sfListElement.childNodes[index - 1]);

    }


    createMixer()
    {
        // title
        const title = document.createElement("h3");
        title.innerText = "SoundFont Mixer";
        this.soundfontMixer.appendChild(title);
        this.sfListElement = document.createElement("div");
        this.sfListElement.classList.add("soundfont_mixer_list");
        this.soundfontMixer.appendChild(this.sfListElement);

        // add / apply buttons
        const actionButtonsWrapper = document.createElement("div");
        actionButtonsWrapper.classList.add("action_buttons_wrapper");
        this.soundfontMixer.appendChild(actionButtonsWrapper);

        const addSf = document.createElement("div");
        addSf.innerText = "Add";
        addSf.classList.add("soundfont_entry");
        addSf.classList.add("soundfont_entry_button");
        actionButtonsWrapper.appendChild(addSf);
        addSf.onclick = this.addNewSoundfont.bind(this);

        const applyChanges = document.createElement("div");
        applyChanges.classList.add("soundfont_entry");
        applyChanges.classList.add("soundfont_entry_button");
        applyChanges.innerText = "Apply";
        applyChanges.onclick = this.applyChanges.bind(this);
        actionButtonsWrapper.appendChild(applyChanges);
    }

    addNewSoundfont(event)
    {
        if(window.isLocalEdition)
        {
            event.target.innerText += " with the select element above";
        }
    }

    toggleVisibility()
    {
        this.soundfontMixer.classList.toggle("hidden");
    }
}