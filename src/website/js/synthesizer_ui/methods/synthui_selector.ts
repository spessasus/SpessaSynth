import { getFilterSvg, getLockSVG, getUnlockSVG } from "../../utils/icons.js";
import {
    ICON_SIZE,
    LOCALE_PATH,
    type PresetListElement
} from "../synthetizer_ui.js";
import { isMobile } from "../../utils/is_mobile.js";
import { drumBankLabel, PresetListView } from "./preset_list_view.ts";
import type { LocaleManager } from "../../manager/locale_manager.ts";
import {
    type MIDIPatch,
    type MIDIPatchFull,
    MIDIPatchTools
} from "spessasynth_core";

/**
 * Syntui_selector.js
 * purpose: manages a single selector element for selecting the presets
 */

// Remembered between windows
let filtersShown = false;

export class Selector {
    public readonly mainButton: HTMLButtonElement;
    // Shown on the  selector
    public value?: PresetListElement;
    private elements: PresetListElement[];
    private view?: PresetListView;
    // The view shown in the open window
    private menuView?: PresetListView;
    private selectedRow?: HTMLTableRowElement;
    private readonly locale;
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
        elements: MIDIPatchFull[],
        locale: LocaleManager,
        descriptionPath: string,
        descriptionArgs: (string | number)[],
        editCallback?: (arg0: MIDIPatch) => unknown,
        lockCallback?: (arg0: boolean) => unknown
    ) {
        this.elements = elements.map((e) => {
            return {
                ...e,
                stringified: MIDIPatchTools.toFullMIDIString(e)
            };
        });
        // The preset list may not be always available
        if (this.elements.length > 0) {
            this.value = this.elements[0];
        }

        this.mainButton = document.createElement("button");
        this.mainButton.classList.add("voice_selector", "controller_element");
        locale.bindTooltip(
            this.mainButton,
            descriptionPath + ".description",
            descriptionArgs
        );
        this.locale = locale;
        this.localeArgs = descriptionArgs;

        if (this.value) {
            this.mainButton.textContent = this.getString(this.value);
        }

        this.mainButton.addEventListener("click", () => {
            this.showSelectionMenu();
        });

        this.editCallback = editCallback;
        this.lockCallback = lockCallback;
    }

    public lockSelector(locked: boolean) {
        // Double lock calls must be processed, see https://github.com/spessasus/SpessaSynth/issues/244
        this.locked = locked;
        this.lockCallback?.(this.locked);
        this.mainButton.classList.toggle("locked_selector", locked);
        if (this.presetLock) {
            this.presetLock.innerHTML = this.locked
                ? getLockSVG(ICON_SIZE)
                : getUnlockSVG(ICON_SIZE);
        }
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
            LOCALE_PATH + "channelController.presetSelector.selectionPrompt",
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
            LOCALE_PATH + "channelController.presetSelector.searchPrompt"
        );
        searchWrapper.append(searchInput);
        searchInput.addEventListener("keydown", (e) => e.stopPropagation());

        // Preset lock button
        if (this.lockCallback) {
            const presetLock = document.createElement("div");
            presetLock.innerHTML = this.locked
                ? getLockSVG(ICON_SIZE)
                : getUnlockSVG(ICON_SIZE);
            this.locale.bindTooltip(
                presetLock,
                LOCALE_PATH + "channelController.presetReset.description",
                this.localeArgs
            );
            presetLock.classList.add("voice_reset");
            presetLock.addEventListener("click", () =>
                this.lockSelector(!this.locked)
            );
            searchWrapper.append(presetLock);
            this.presetLock = presetLock;
        }

        // Add the table, it is built once per preset list
        const view = this.getView();
        selectionWindow.append(view.header);
        const tableWrapper = document.createElement("div");
        tableWrapper.classList.add("voice_selector_table_wrapper");
        selectionWindow.append(tableWrapper);

        this.menuView = view;
        view.onPick = (preset) => this.pickPreset(preset);
        tableWrapper.append(view.table);
        this.selectRow(this.findRow(view, this.value), false);

        /**
         * Add search function
         */
        const applySearch = () => {
            if (!this.value) {
                return;
            }
            if (view.search(searchInput.value) === 0) {
                this.selectRow(undefined, false);
                return;
            }
            // If the already selected preset is not on the new list, select the first one
            if (this.selectedRow?.isConnected) {
                return;
            }
            this.selectRow(
                view.table.querySelector<HTMLTableRowElement>(
                    ".voice_selector_option"
                ) ?? undefined,
                false
            );
        };
        searchInput.addEventListener("input", (e) => {
            e.stopPropagation();
            applySearch();
        });
        view.onFilterChange = applySearch;
        view.setFiltersShown(filtersShown);

        // Filter toggle
        const filterToggle = document.createElement("div");
        filterToggle.innerHTML = getFilterSvg(ICON_SIZE);
        this.locale.bindTooltip(
            filterToggle,
            LOCALE_PATH + "channelController.presetSelector.filterToggle",
            this.localeArgs
        );
        filterToggle.classList.add("voice_reset");
        filterToggle.classList.toggle("voice_selector_toggled", filtersShown);
        filterToggle.addEventListener("click", () => {
            filtersShown = !filtersShown;
            filterToggle.classList.toggle(
                "voice_selector_toggled",
                filtersShown
            );
            view.setFiltersShown(filtersShown);
            applySearch();
        });
        searchWrapper.append(filterToggle);

        // Add basic key navigation
        const onKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Escape": {
                    this.hideSelectionMenu();
                    break;
                }

                // When enter pressed, select the selected preset
                case "Enter": {
                    const newVal = view.presetOf(this.selectedRow ?? null);
                    if (newVal) {
                        this.pickPreset(newVal);
                    }
                    break;
                }

                case "ArrowDown":
                case "ArrowUp": {
                    const down = e.key === "ArrowDown";
                    let next = this.selectedRow
                        ? down
                            ? this.selectedRow.nextElementSibling
                            : this.selectedRow.previousElementSibling
                        : null;
                    while (next) {
                        if (next.classList.contains("voice_selector_option")) {
                            this.selectRow(next as HTMLTableRowElement, true);
                            return;
                        }
                        next = down
                            ? next.nextElementSibling
                            : next.previousElementSibling;
                    }
                    break;
                }
            }
        };
        searchInput.addEventListener("keydown", onKey);
        view.onKey = onKey;

        selectionWindow.addEventListener("click", (e) => {
            e.stopPropagation();
        });
        this.selectionMenu.append(selectionWindow);
        this.selectionMenu.addEventListener("click", (e) => {
            e.stopPropagation();
            this.hideSelectionMenu();
        });
        this.isWindowShown = true;
        this.selectRow(this.selectedRow, false);
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
        // Leave it clean for the next window
        if (this.menuView) {
            this.menuView.onPick = undefined;
            this.menuView.onFilterChange = undefined;
            this.menuView.onKey = undefined;
            this.menuView.resetSearch();
            this.selectedRow?.classList.remove("voice_selector_selected");
        }
        this.selectedRow = undefined;
        this.menuView = undefined;
    }

    public reload(elements: PresetListElement[]) {
        // Called on every program change,
        // The same list needs no update
        if (this.elements === elements) {
            return;
        }
        this.elements = elements;
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
        const text = this.getString(patch);
        if (this.mainButton.textContent !== text) {
            this.mainButton.textContent = text;
        }

        if (this.isWindowShown && this.menuView === this.getView()) {
            this.selectRow(this.menuView.rowOf(patch), true);
        }
    }

    public getString(patch: PresetListElement) {
        if (!patch) {
            if (this.elements.length === 0) {
                return "-";
            }
            patch = this.elements[0];
        }
        if (!this.getView().isProgramAmbiguous(patch)) {
            return `${patch.program}. ${patch.name}`;
        }
        const msb = drumBankLabel(patch) ?? patch.bankMSB;
        return `${patch.bankLSB}:${msb}:${patch.program} ${patch.name}`;
    }

    private getView() {
        if (this.view?.elements !== this.elements) {
            this.view = PresetListView.for(this.elements, this.locale);
        }
        return this.view;
    }

    private findRow(view: PresetListView, patch: PresetListElement) {
        return (
            view.rowOf(patch) ??
            view.rowOf(
                view.elements.find((e) => MIDIPatchTools.matches(patch, e))!
            )
        );
    }

    private selectRow(row: HTMLTableRowElement | undefined, smooth: boolean) {
        if (row !== this.selectedRow) {
            this.selectedRow?.classList.remove("voice_selector_selected");
            this.selectedRow = row;
        }
        if (!row) {
            return;
        }
        row.classList.add("voice_selector_selected");
        if (this.isWindowShown || smooth) {
            row.scrollIntoView({
                behavior: smooth ? "smooth" : "instant",
                block: "center",
                inline: "center"
            });
        }
    }

    private pickPreset(preset: PresetListElement) {
        if (this.value !== preset) {
            this.editCallback?.(preset);
            this.locked = true;
            if (this.presetLock) {
                this.presetLock.innerHTML = getLockSVG(ICON_SIZE);
            }
        }
        this.hideSelectionMenu();
    }
}
