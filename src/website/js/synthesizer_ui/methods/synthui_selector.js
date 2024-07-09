import { midiPatchNames } from '../../utils/patch_names.js'

/**
 * syntui_selector.js
 * purpose: manages a single selector element for selecting the presets
 */

export class Selector
{
    /**
     * Creates a new selector
     * @param elements  {{name: string, program: number, bank: number}[]}
     * @param locale {LocaleManager}
     * @param descriptionPath {string} locale path
     * @param descriptionArgs {string|number[]}
     * @param editCallback {function(string)}
     */
    constructor(elements,
                locale,
                descriptionPath,
                descriptionArgs,
                editCallback = undefined)
    {
        this.isShown = true;
        this.isReloaded = true;
        /**
         * @type {{name: string, program: number, bank: number}[]}
         */
        this.elements = elements;
        if(this.elements.length > 0) {
            this.value = `${this.elements[0].bank}:${this.elements[0].program}`;
        }
        else
        {
            this.value = "";
        }

        this.mainDiv = document.createElement("select");
        this.mainDiv.classList.add("voice_selector");
        this.mainDiv.classList.add("controller_element");
        locale.bindObjectProperty(this.mainDiv, "title", descriptionPath, descriptionArgs);

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

        let isInGroup = false; // controls how we should format the preset name
        let htmlString = "";

        for(const preset of elements)
        {
            const program = preset.program;

            // create a new group
            if(program !== lastProgram)
            {
                lastProgram = program;
                // unless there's only 1 preset for this program
                if(elements.filter(e => e.program === lastProgram).length > 1)
                {
                    isInGroup = true;
                    htmlString += `<optgroup label='${lastProgram}. ${midiPatchNames[lastProgram]}'>`;
                }
                else
                {
                    isInGroup = false;
                    htmlString += "</optgroup>";
                }
            }
            if(isInGroup)
            {
                htmlString += `<option class='selector_option' value='${preset.bank}:${preset.program}'>${preset.bank}:${preset.program}. ${preset.name}</option>`;
            }
            else
            {
                htmlString += `<option class='selector_option' value='${preset.bank}:${preset.program}'>${preset.program}: ${preset.name}</option>`;
            }
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
            if(!this.isReloaded)
            {
                this.reload();
            }
            this.mainDiv.value = value;
        }
    }

    show()
    {
        this.isShown = true;
        if(!this.isReloaded)
        {
            this.reload();
        }
        this.mainDiv.value = this.value;
    }

    hide()
    {
        this.isShown = false;
    }
}