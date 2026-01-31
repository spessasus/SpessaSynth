import { midiPatchNames } from "../../utils/patch_names.js";
import { getLockSVG, getUnlockSVG } from "../../utils/icons.js";
import { ICON_SIZE, LOCALE_PATH } from "../synthetizer_ui.js";
import { isMobile } from "../../utils/is_mobile.js";
import type { LocaleManager } from "../../locale/locale_manager.ts";
import {
    type MIDIPatch,
    MIDIPatchTools,
    type PresetListEntry
} from "spessasynth_core";

/**
 * Syntui_selector.js
 * purpose: manages a single selector element for selecting the presets
 */

interface PresetListElement extends PresetListEntry {
    stringified: string;
}

export class Selector {
    public readonly mainButton: HTMLButtonElement;
    // Shown on the  selector
    public value?: PresetListElement;
    private elements: PresetListElement[];
    private elementsToTable?: Map<HTMLTableRowElement, PresetListElement>;
    private readonly locale;
    private readonly localePath;
    private readonly localeArgs;

    private readonly editCallback;
    private readonly lockCallback;
    private selectionMenu?: HTMLDivElement;
    private locked = false;
    private isWindowShown = false;
    private presetLock?: HTMLDivElement;

    /**
     * Creates a new selector
     * @param elements
     * @param locale
     * @param descriptionPath locale path
     * @param descriptionArgs
     * @param editCallback
     * @param lockCallback
     */
    public constructor(
        elements: PresetListEntry[],
        locale: LocaleManager,
        descriptionPath: string,
        descriptionArgs: (string | number)[],
        editCallback?: (arg0: MIDIPatch) => unknown,
        lockCallback?: (arg0: boolean) => unknown
    ) {
        this.elements = elements.map((e) => {
            return {
                ...e,
                stringified: MIDIPatchTools.toNamedMIDIString(e)
            };
        });
        // The preset list may not be always available
        if (this.elements.length > 0) {
            this.value = this.elements[0];
        }

        this.mainButton = document.createElement("button");
        this.mainButton.classList.add("voice_selector", "controller_element");
        locale.bindObjectProperty(
            this.mainButton,
            "title",
            descriptionPath + ".description",
            descriptionArgs
        );
        this.locale = locale;
        this.localePath = descriptionPath;
        this.localeArgs = descriptionArgs;

        this.reload();

        this.mainButton.addEventListener("click", () => {
            this.showSelectionMenu();
        });

        this.editCallback = editCallback;
        this.lockCallback = lockCallback;
    }

    public showSelectionMenu() {
        if (!this.value) {
            return;
        }
        /**
         * Create the wrapper
         */
        this.selectionMenu = document.createElement("div");
        this.selectionMenu.classList.add("voice_selector_wrapper");
        document
            .querySelectorAll(".spessasynth_main")[0]
            .append(this.selectionMenu);
        const selectionWindow = document.createElement("div");
        selectionWindow.classList.add("voice_selector_window");

        // Add title
        const selectionTitle = document.createElement("h2");
        this.locale.bindObjectProperty(
            selectionTitle,
            "textContent",
            this.localePath + ".selectionPrompt",
            this.localeArgs
        );
        selectionWindow.append(selectionTitle);

        // Add search wrapper
        const searchWrapper = document.createElement("div");
        searchWrapper.classList.add("voice_selector_search_wrapper");
        selectionWindow.append(searchWrapper);

        // Search input
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        this.locale.bindObjectProperty(
            searchInput,
            "placeholder",
            this.localePath + ".searchPrompt"
        );
        searchWrapper.append(searchInput);
        searchInput.addEventListener("keydown", (e) => e.stopPropagation());

        // Preset lock button
        const presetLock = document.createElement("div");
        presetLock.innerHTML = this.locked
            ? getLockSVG(ICON_SIZE)
            : getUnlockSVG(ICON_SIZE);
        this.locale.bindObjectProperty(
            presetLock,
            "title",
            LOCALE_PATH + "channelController.presetReset.description",
            this.localeArgs
        );
        presetLock.classList.add("voice_reset");
        if (this.mainButton.classList.contains("voice_selector_light")) {
            presetLock.classList.add("voice_reset_light");
        }
        presetLock.addEventListener("click", () => {
            this.locked = !this.locked;
            this.lockCallback?.(this.locked);
            this.mainButton.classList.toggle("locked_selector");
            presetLock.innerHTML = this.locked
                ? getLockSVG(ICON_SIZE)
                : getUnlockSVG(ICON_SIZE);
        });
        searchWrapper.append(presetLock);
        this.presetLock = presetLock;

        // Add the table, wrapper first
        const tableWrapper = document.createElement("div");
        tableWrapper.classList.add("voice_selector_table_wrapper");
        selectionWindow.append(tableWrapper);

        // Add the table
        const table = this.generateTable(
            tableWrapper,
            this.elements,
            this.value
        );

        /**
         * Add search function
         */
        let selectedProgram = table.querySelector(".voice_selector_selected")!;
        searchInput.addEventListener("input", (e) => {
            if (!this.value) {
                return;
            }
            e.stopPropagation();
            const text = searchInput.value;
            const filtered = this.elements.filter(
                (e) => e.stringified.search(new RegExp(text, "i")) >= 0
            );
            if (
                filtered.length === this.elements.length ||
                filtered.length === 0
            ) {
                return;
            }
            tableWrapper.replaceChildren();
            const filteredTable = this.generateTable(
                tableWrapper,
                filtered,
                this.value
            );
            // If the already selected preset is not on the new list, select the first one
            const alreadySelected = filteredTable.querySelector(
                ".voice_selector_selected"
            );
            if (alreadySelected) {
                selectedProgram = alreadySelected;
                return;
            }
            const firstFiltered = filteredTable.querySelector(
                ".voice_selector_option"
            );
            if (!firstFiltered) {
                return;
            }
            firstFiltered.classList.add("voice_selector_selected");
            selectedProgram = firstFiltered;
        });

        // Add basic key navigation
        searchInput.addEventListener("keydown", (e) => {
            switch (e.key) {
                case "Escape": {
                    this.hideSelectionMenu();
                    break;
                }

                // When enter pressed, select the selected preset
                case "Enter": {
                    const newVal = this.elementsToTable?.get(
                        selectedProgram as HTMLTableRowElement
                    );
                    if (!newVal) {
                        return;
                    }
                    if (this.value === newVal) {
                        this.hideSelectionMenu();
                        return;
                    }
                    this.editCallback?.(newVal);
                    this.locked = true;
                    presetLock.innerHTML = getLockSVG(ICON_SIZE);
                    this.hideSelectionMenu();
                    break;
                }

                case "ArrowDown": {
                    let nextEl = selectedProgram.nextElementSibling;
                    while (nextEl) {
                        if (
                            nextEl.classList.contains("voice_selector_option")
                        ) {
                            selectedProgram.classList.remove(
                                "voice_selector_selected"
                            );
                            nextEl.classList.add("voice_selector_selected");
                            selectedProgram = nextEl;
                            return;
                        }
                        nextEl = nextEl.nextElementSibling;
                    }
                    break;
                }

                case "ArrowUp": {
                    let previousEl = selectedProgram.previousElementSibling;
                    while (previousEl) {
                        if (
                            previousEl.classList.contains(
                                "voice_selector_option"
                            )
                        ) {
                            selectedProgram.classList.remove(
                                "voice_selector_selected"
                            );
                            previousEl.classList.add("voice_selector_selected");
                            selectedProgram = previousEl;
                            return;
                        }
                        previousEl = previousEl.previousElementSibling;
                    }
                    break;
                }
            }
        });

        selectionWindow.addEventListener("click", (e) => {
            e.stopPropagation();
        });
        this.selectionMenu.append(selectionWindow);
        this.selectionMenu.addEventListener("click", (e) => {
            e.stopPropagation();
            this.hideSelectionMenu();
        });
        this.isWindowShown = true;
        if (!isMobile) {
            searchInput.focus();
        }
    }

    public hideSelectionMenu() {
        if (!this.selectionMenu) {
            return;
        }
        this.selectionMenu.remove();
        delete this.selectionMenu;
        this.isWindowShown = false;
    }

    public toggleMode() {
        this.mainButton.classList.toggle("voice_selector_light");
    }

    public reload(elements: PresetListEntry[] = this.elements) {
        if (this.elements !== elements) {
            this.elements = elements.map((e) => {
                return {
                    ...e,
                    stringified: MIDIPatchTools.toNamedMIDIString(e)
                };
            });
        }
        if (this.elements.length > 0) {
            const firstEl = this.elements[0];
            this.mainButton.textContent = this.getString(firstEl);
        }
    }

    public set(p: MIDIPatch) {
        if (!p) {
            throw new Error("Can't set a patch that does not exist.");
        }
        const patch = this.elements.find((e) => MIDIPatchTools.matches(e, p));
        if (!patch) {
            return;
        }
        this.value = patch;
        this.reload();
        this.mainButton.textContent = this.getString(patch);

        if (this.isWindowShown && this.selectionMenu) {
            // Remove the old selected class
            const oldSelected = this.selectionMenu.querySelectorAll(
                ".voice_selector_selected"
            )[0];
            if (oldSelected !== undefined) {
                oldSelected.classList.remove("voice_selector_selected");
            }
            const table = this.selectionMenu.querySelectorAll(
                ".voice_selector_table"
            )[0] as HTMLTableElement;
            // Find the newly selected class
            for (const row of table.rows) {
                if (row.cells.length === 1) {
                    continue;
                }
                const patch = this.elementsToTable?.get(row);
                if (!patch) {
                    continue;
                }
                if (patch === this.value) {
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

    public getString(patch: PresetListElement) {
        if (!patch) {
            if (this.elements.length === 0) {
                return "-";
            }
            patch = this.elements[0];
        }
        if (
            patch.isAnyDrums ||
            this.elements.filter(
                (e) => e.program === patch.program && !e.isAnyDrums
            ).length < 2
        ) {
            return `${patch.program}. ${patch.name}`;
        }
        return MIDIPatchTools.toNamedMIDIString(patch);
    }

    /**
     * Generates the instrument table for displaying
     * @param wrapper the wrapper
     * @param elements
     * @param selectedPatch
     */
    private generateTable(
        wrapper: HTMLElement,
        elements: PresetListElement[],
        selectedPatch: PresetListElement
    ) {
        this.elementsToTable = new Map<
            HTMLTableRowElement,
            PresetListElement
        >();
        const table = document.createElement("table");
        table.classList.add("voice_selector_table");

        let lastProgram = -20;
        for (const preset of elements) {
            const row = document.createElement("tr");
            const program = preset.program;
            row.classList.add("voice_selector_option");
            this.elementsToTable.set(row, preset);

            if (MIDIPatchTools.matches(selectedPatch, preset)) {
                row.classList.add("voice_selector_selected");
                setTimeout(() => {
                    row.scrollIntoView({
                        behavior: "instant",
                        block: "center",
                        inline: "center"
                    });
                }, 20);
            }

            row.addEventListener("click", () => {
                const newVal = preset;
                if (this.value === newVal) {
                    this.hideSelectionMenu();
                    return;
                }
                this.editCallback?.(newVal);
                this.locked = true;
                if (this.presetLock) {
                    this.presetLock.innerHTML = getLockSVG(ICON_SIZE);
                }
                this.hideSelectionMenu();
            });

            // Create a new group
            if (program !== lastProgram) {
                lastProgram = program;
                // Create the header (not for drums
                if (!preset.isAnyDrums) {
                    const headerRow = document.createElement("tr");
                    const header = document.createElement("th");
                    header.colSpan = 4;
                    header.textContent = midiPatchNames[lastProgram];
                    headerRow.append(header);
                    table.append(headerRow);
                }
            }
            const programText = preset.program.toString().padStart(3, "0");
            const msbString = preset.bankMSB.toString().padStart(3, "0");
            const lsbString = preset.bankLSB.toString().padStart(3, "0");
            let bankLSBText: string, bankMSBText: string;
            if (preset.isGMGSDrum) {
                bankLSBText = "GS";
                bankMSBText = "DRUM";
            } else if (preset.isAnyDrums) {
                bankLSBText = "XG";
                bankMSBText = "DRUM";
            } else {
                bankMSBText = msbString;
                bankLSBText = lsbString;
            }

            const presetName = document.createElement("td");
            presetName.classList.add("voice_selector_preset_name");
            presetName.textContent = preset.name;

            const presetProgram = document.createElement("td");
            presetName.classList.add("voice_selector_preset_program");
            presetProgram.textContent = programText;

            const presetBankMSB = document.createElement("td");
            presetName.classList.add("voice_selector_preset_program");
            presetBankMSB.textContent = bankMSBText;

            const presetBankLSB = document.createElement("td");
            presetName.classList.add("voice_selector_preset_program");
            presetBankLSB.textContent = bankLSBText;

            row.append(presetBankLSB);
            row.append(presetBankMSB);
            row.append(presetProgram);
            row.append(presetName);
            table.append(row);
        }
        wrapper.append(table);
        return table;
    }
}
