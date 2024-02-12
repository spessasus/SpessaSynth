import { midiPatchNames } from '../../../spessasynth_lib/utils/other.js'

export class Selector
{
    /**
     * Creates a new selector
     * @param elements  {{name: string, program: number, bank: number}[]}
     * @param description {string}
     * @param editCallback {function(string)}
     */
    constructor(elements,
                description,
                editCallback = undefined)
    {
        this.isShown = true;
        this.isReloaded = true;
        /**
         * @type {{name: string, program: number, bank: number}[]}
         */
        this.elements = elements;
        if(this.elements.length > 0) {
            this.value = JSON.stringify([this.elements[0].bank, this.elements[0].program]);
        }
        else
        {
            this.value = "";
        }

        this.mainDiv = document.createElement("select");
        this.mainDiv.classList.add("voice_selector");
        this.mainDiv.classList.add("controller_element");
        this.mainDiv.title = description;

        this.reload();


        this.mainDiv.onchange = () => editCallback(this.mainDiv.value);
    }

    toggleMode()
    {
        this.mainDiv.classList.toggle("voice_selector_light")
    }

    /**
     * @param elements {{name: string, program: number, bank: number}[]}
     */
    reload(elements= this.elements)
    {
        this.elements = elements;
        if(!this.isShown)
        {
            this.isReloaded = false;
            return;
        }
        this.mainDiv.innerHTML = "";
        let lastProgram = -20;

        //let currentGroup; // current group (optgroup element) or if single preset for program, the select element
        let isInGroup = false; // controls how we should format the preset name
        let htmlString = "";

        for(const preset of elements)
        {
            const bank = preset.bank;
            const program = preset.program;

            // create a new group
            if(program !== lastProgram)
            {
                lastProgram = program;
                // unless there's only 1 preset for this program
                if(elements.filter(e => e.program === lastProgram).length > 1)
                {
                    isInGroup = true;
                    //currentGroup = document.createElement("optgroup");
                    htmlString += `<optgroup label='${lastProgram}. ${midiPatchNames[lastProgram]}'>`;
                    //currentGroup.label = `${lastProgram}. ${midiPatchNames[lastProgram]}`;
                    //this.mainDiv.appendChild(currentGroup);
                }
                else
                {
                    isInGroup = false;
                    htmlString += "</optgroup>";
                    //currentGroup = this.mainDiv;
                }
            }

            //const element = document.createElement("option");
            //element.classList.add("selector_option");
            if(isInGroup)
            {
                htmlString += `<option class='selector_option' value='${JSON.stringify([bank, program])}'>${preset.program}.${preset.bank}. ${preset.name}</option>`;
            }
            else
            {
                htmlString += `<option class='selector_option' value='${JSON.stringify([bank, program])}'>${preset.program}. ${preset.name}</option>`;
            }
            // if(isInGroup)
            // {
            //     element.innerText = `${preset.program}.${preset.bank}. ${preset.name}`;
            // }
            // else
            // {
            //     element.innerText = `${preset.program}. ${preset.name}`;
            // }
            //element.value = JSON.stringify([bank, program]);
            //currentGroup.appendChild(element);
        }
        this.mainDiv.innerHTML = htmlString;
        this.isReloaded = true;
    }

    /**
     * @param value {string}
     */
    set(value)
    {
        this.value = value;
        if(this.isShown)
        {
            this.mainDiv.value = value;
        }
    }

    show()
    {
        this.isShown = true;
        if(!this.isReloaded) {
            this.reload();
        }
        this.mainDiv.value = this.value;
    }

    hide()
    {
        this.isShown = false;
    }
}