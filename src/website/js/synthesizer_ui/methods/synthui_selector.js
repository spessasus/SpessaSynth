import { midiPatchNames } from "../../utils/patch_names.js";
import { getLockSVG, getUnlockSVG } from "../../utils/icons.js";
import { LOCALE_PATH } from "../synthetizer_ui.js";
import { ICON_SIZE } from "./create_channel_controller.js";
import { isMobile } from "../../utils/is_mobile.js";

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
     * @param lockCallback {function(boolean)}
     */
    constructor(elements,
                locale,
                descriptionPath,
                descriptionArgs,
                editCallback = undefined,
                lockCallback = undefined)
    {
        /**
         * @type {{name: string, program: number, bank: number, stringified: string}[]}
         */
        this.elements = elements.map(e =>
        {
            return {
                name: e.name,
                program: e.program,
                bank: e.bank,
                stringified: `${e.bank.toString().padStart(3, "0")}:${e.program.toString()
                    .padStart(
                        3,
                        "0"
                    )} ${e.name}`
            };
        });
        if (this.elements.length > 0)
        {
            this.value = `${this.elements[0].bank}:${this.elements[0].program}`;
        }
        else
        {
            this.value = "";
        }
        
        /**
         * @type {HTMLButtonElement}
         */
        this.mainButton = document.createElement("button");
        this.mainButton.classList.add("voice_selector");
        this.mainButton.classList.add("controller_element");
        locale.bindObjectProperty(this.mainButton, "title", descriptionPath + ".description", descriptionArgs);
        this.locale = locale;
        this.localePath = descriptionPath;
        this.localeArgs = descriptionArgs;
        
        this.reload();
        
        this.mainButton.onclick = () =>
        {
            this.showSelectionMenu();
        };
        
        this.editCallback = editCallback;
        
        this.selectionMenu = undefined;
        this.lockCallback = lockCallback;
        this.locked = false;
        this.isWindowShown = false;
    }
    
    showSelectionMenu()
    {
        /**
         * create the wrapper
         * @type {HTMLDivElement}
         */
        this.selectionMenu = document.createElement("div");
        this.selectionMenu.classList.add("voice_selector_wrapper");
        document.getElementsByClassName("spessasynth_main")[0].appendChild(this.selectionMenu);
        const selectionWindow = document.createElement("div");
        selectionWindow.classList.add("voice_selector_window");
        
        // add title
        const selectionTitle = document.createElement("h2");
        this.locale.bindObjectProperty(
            selectionTitle,
            "textContent",
            this.localePath + ".selectionPrompt",
            this.localeArgs
        );
        selectionWindow.appendChild(selectionTitle);
        
        // add search wrapper
        const searchWrapper = document.createElement("div");
        searchWrapper.classList.add("voice_selector_search_wrapper");
        selectionWindow.appendChild(searchWrapper);
        
        // search input
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        this.locale.bindObjectProperty(searchInput, "placeholder", this.localePath + ".searchPrompt");
        searchWrapper.appendChild(searchInput);
        searchInput.onkeydown = e => e.stopPropagation();
        
        // preset lock button
        const presetLock = document.createElement("div");
        presetLock.innerHTML = this.locked ? getLockSVG(ICON_SIZE) : getUnlockSVG(ICON_SIZE);
        this.locale.bindObjectProperty(
            presetLock,
            "title",
            LOCALE_PATH + "channelController.presetReset.description",
            this.localeArgs
        );
        presetLock.classList.add("voice_reset");
        if (this.mainButton.classList.contains("voice_selector_light"))
        {
            presetLock.classList.add("voice_reset_light");
        }
        presetLock.onclick = () =>
        {
            this.locked = !this.locked;
            this.lockCallback(this.locked);
            this.mainButton.classList.toggle("locked_selector");
            if (this.locked)
            {
                presetLock.innerHTML = getLockSVG(ICON_SIZE);
            }
            else
            {
                presetLock.innerHTML = getUnlockSVG(ICON_SIZE);
            }
        };
        searchWrapper.appendChild(presetLock);
        this.presetLock = presetLock;
        
        // add the table, wrapper first
        const tableWrapper = document.createElement("div");
        tableWrapper.classList.add("voice_selector_table_wrapper");
        selectionWindow.appendChild(tableWrapper);
        
        // add the table
        const table = this.generateTable(tableWrapper, this.elements);
        
        /**
         * add search function
         * @type {HTMLElement}
         */
        let selectedProgram = table.querySelector(".voice_selector_selected");
        searchInput.oninput = e =>
        {
            e.stopPropagation();
            const text = searchInput.value;
            const filtered = this.elements.filter(e => e.stringified.search(new RegExp(text, "i")) >= 0);
            if (filtered.length === this.elements.length || filtered.length === 0)
            {
                return;
            }
            tableWrapper.replaceChildren();
            const filteredTable = this.generateTable(tableWrapper, filtered);
            // if the already selected preset is not on the new list, select the first one
            const alreadySelected = filteredTable.querySelector(".voice_selector_selected");
            if (alreadySelected)
            {
                selectedProgram = alreadySelected;
                return;
            }
            const firstFiltered = filteredTable.querySelector(".voice_selector_option");
            firstFiltered.classList.add("voice_selector_selected");
            selectedProgram = firstFiltered;
        };
        
        // add basic key navigation
        searchInput.addEventListener("keydown", e =>
        {
            switch (e.key)
            {
                // when enter pressed, select the selected preset
                case "Enter":
                    const bank = selectedProgram.getAttribute("bank");
                    const program = selectedProgram.getAttribute("program");
                    const newVal = `${bank}:${program}`;
                    if (this.value === newVal)
                    {
                        this.hideSelectionMenu();
                        return;
                    }
                    this.editCallback(newVal);
                    this.locked = true;
                    this.presetLock.innerHTML = getLockSVG(ICON_SIZE);
                    this.hideSelectionMenu();
                    break;
                
                case "ArrowDown":
                    let nextEl = selectedProgram.nextElementSibling;
                    while (nextEl)
                    {
                        if (nextEl.classList.contains("voice_selector_option"))
                        {
                            selectedProgram.classList.remove("voice_selector_selected");
                            nextEl.classList.add("voice_selector_selected");
                            selectedProgram = nextEl;
                            return;
                        }
                        nextEl = nextEl.nextElementSibling;
                    }
                    break;
                
                case "ArrowUp":
                    let previousEl = selectedProgram.previousElementSibling;
                    while (previousEl)
                    {
                        if (previousEl.classList.contains("voice_selector_option"))
                        {
                            selectedProgram.classList.remove("voice_selector_selected");
                            previousEl.classList.add("voice_selector_selected");
                            selectedProgram = previousEl;
                            return;
                        }
                        previousEl = previousEl.previousElementSibling;
                    }
                    break;
            }
        });
        
        
        selectionWindow.onclick = e =>
        {
            e.stopPropagation();
        };
        this.selectionMenu.appendChild(selectionWindow);
        this.selectionMenu.onclick = e =>
        {
            e.stopPropagation();
            this.hideSelectionMenu();
        };
        this.isWindowShown = true;
        if (!isMobile)
        {
            searchInput.focus();
        }
    }
    
    /**
     * Generates the instrument table for displaying
     * @param wrapper {Element} the wrapper
     * @param elements {{name: string, program: number, bank: number}[]}
     */
    generateTable(wrapper, elements)
    {
        const table = document.createElement("table");
        table.classList.add("voice_selector_table");
        
        const selectedBank = parseInt(this.value.split(":")[0]);
        const selectedProgram = parseInt(this.value.split(":")[1]);
        
        let lastProgram = -20;
        for (const preset of elements)
        {
            const row = document.createElement("tr");
            const program = preset.program;
            row.classList.add("voice_selector_option");
            row.setAttribute("program", program.toString());
            row.setAttribute("bank", preset.bank.toString());
            
            if (program === selectedProgram && preset.bank === selectedBank)
            {
                row.classList.add("voice_selector_selected");
                setTimeout(() =>
                {
                    row.scrollIntoView({
                        behavior: "instant",
                        block: "center",
                        inline: "center"
                    });
                }, 20);
            }
            
            row.onclick = () =>
            {
                const newVal = `${preset.bank}:${program}`;
                if (this.value === newVal)
                {
                    this.hideSelectionMenu();
                    return;
                }
                this.editCallback(newVal);
                this.locked = true;
                this.presetLock.innerHTML = getLockSVG(ICON_SIZE);
                this.hideSelectionMenu();
            };
            
            // create a new group
            if (program !== lastProgram)
            {
                lastProgram = program;
                // create the header (not for drums
                if (preset.bank !== 128)
                {
                    const headerRow = document.createElement("tr");
                    const header = document.createElement("th");
                    header.colSpan = 3;
                    header.textContent = midiPatchNames[lastProgram];
                    headerRow.appendChild(header);
                    table.appendChild(headerRow);
                }
            }
            const programText = `${preset.program.toString().padStart(3, "0")}`;
            const bankText = `${preset.bank.toString().padStart(3, "0")}`;
            
            const presetName = document.createElement("td");
            presetName.classList.add("voice_selector_preset_name");
            presetName.textContent = preset.name;
            
            const presetProgram = document.createElement("td");
            presetName.classList.add("voice_selector_preset_program");
            presetProgram.textContent = programText;
            
            const presetBank = document.createElement("td");
            presetName.classList.add("voice_selector_preset_program");
            presetBank.textContent = bankText;
            
            row.appendChild(presetBank);
            row.appendChild(presetProgram);
            row.appendChild(presetName);
            table.appendChild(row);
        }
        wrapper.appendChild(table);
        return table;
    }
    
    hideSelectionMenu()
    {
        document.getElementsByClassName("spessasynth_main")[0].removeChild(this.selectionMenu);
        this.selectionMenu = undefined;
        this.isWindowShown = false;
    }
    
    toggleMode()
    {
        this.mainButton.classList.toggle("voice_selector_light");
    }
    
    /**
     * @param elements {{name: string, program: number, bank: number}[]}
     */
    reload(elements = this.elements)
    {
        this.elements = elements.map(e =>
        {
            return {
                name: e.name,
                program: e.program,
                bank: e.bank,
                stringified: `${e.bank.toString().padStart(3, "0")}:${e.program.toString()
                    .padStart(
                        3,
                        "0"
                    )} ${e.name}`
            };
        });
        if (this.elements.length > 0)
        {
            const firstEl = this.elements[0];
            const bank = firstEl.bank;
            const currentProgram = parseInt(this.value.split(":")[1]);
            let program = currentProgram;
            if (this.elements.find(e => e.program === currentProgram) === undefined)
            {
                program = firstEl.program;
            }
            this.mainButton.textContent = this.getString(`${bank}:${program}`);
        }
    }
    
    /**
     * @param value {string}
     */
    set(value)
    {
        this.value = value;
        this.reload();
        this.mainButton.textContent = this.getString(this.value);
        
        if (this.isWindowShown)
        {
            // remove the old selected class
            const oldSelected = this.selectionMenu.getElementsByClassName("voice_selector_selected")[0];
            if (oldSelected !== undefined)
            {
                oldSelected.classList.remove("voice_selector_selected");
            }
            /**
             * @type {HTMLTableElement}
             */
            const table = this.selectionMenu.getElementsByClassName("voice_selector_table")[0];
            // find the newly selected class
            const selectedBank = parseInt(this.value.split(":")[0]);
            const selectedProgram = parseInt(this.value.split(":")[1]);
            for (const row of table.rows)
            {
                if (row.cells.length === 1)
                {
                    continue;
                }
                const bank = parseInt(row.cells[0].textContent);
                const program = parseInt(row.cells[1].textContent);
                if (bank === selectedBank && program === selectedProgram)
                {
                    row.classList.add("voice_selector_selected");
                    row.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "center"
                    });
                }
            }
        }
        
    }
    
    /**
     * @param inputString {string}
     * @returns {string}
     */
    getString(inputString)
    {
        const split = inputString.split(":");
        const bank = parseInt(split[0]);
        const program = parseInt(split[1]);
        const name = this.elements.find(e => e.bank === bank && e.program === program);
        if (!name)
        {
            return "";
        }
        if (bank === 128 || this.elements.filter(e => e.program === program && e.bank !== 128).length < 2)
        {
            return `${program}. ${name.name}`;
        }
        return `${bank}:${program} ${name.name}`;
    }
}