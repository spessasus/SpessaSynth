import { midiPatchNames } from "../../utils/patch_names.js";
import { LOCALE_PATH, type PresetListElement } from "../synthetizer_ui.js";
import type { LocaleManager } from "../../manager/locale_manager.ts";
import type { MIDIPatchFull } from "spessasynth_core";

export function drumBankLabel(patch: MIDIPatchFull) {
    if (!patch.isDrum) {
        return undefined;
    }
    // GM2 drums are bank 120 even if the patch is flagged as GM/GS
    if (patch.bankMSB === 120) {
        return "GM2";
    }
    if (patch.isGMGSDrum) {
        return patch.bankMSB === 0 ? "GS" : undefined;
    }
    return "XG";
}

interface RowData {
    text: string;
    lsb: number;
    msb: number;
    msbLabel?: string;
    program: number;
}

interface ProgramGroup {
    header?: HTMLTableRowElement;
    rows: HTMLTableRowElement[];
}

/**
 * The preset table for one preset list, built once and shared by every selector that shows the list.
 * Opening the selector window only attaches the ready table to it.
 * The lists are replaced (not edited) when the sound bank changes, so the view is cached by list identity.
 */
export class PresetListView {
    private static readonly cache = new WeakMap<
        PresetListElement[],
        PresetListView
    >();

    public readonly elements: PresetListElement[];
    // Selectors set this while their window is open
    public onPick?: (preset: PresetListElement) => unknown;
    public onFilterChange?: () => unknown;
    public onKey?: (e: KeyboardEvent) => unknown;
    private readonly locale;
    private readonly programCounts = new Map<number, number>();
    private readonly presetToRow = new Map<
        PresetListElement,
        HTMLTableRowElement
    >();
    private readonly rowToPreset = new Map<
        HTMLTableRowElement,
        PresetListElement
    >();
    private readonly groups = new Array<ProgramGroup>();
    private readonly rowData = new Map<HTMLTableRowElement, RowData>();
    private filterBody?: HTMLTableSectionElement;
    private body?: HTMLTableSectionElement;
    private readonly filterInputs = new Array<HTMLInputElement>();
    private builtTable?: HTMLTableElement;
    private builtHeader?: HTMLTableElement;

    private constructor(elements: PresetListElement[], locale: LocaleManager) {
        this.elements = elements;
        this.locale = locale;
        for (const preset of elements) {
            const key = PresetListView.programKey(preset);
            this.programCounts.set(key, (this.programCounts.get(key) ?? 0) + 1);
        }
    }

    public get table() {
        this.builtTable ??= this.build();
        return this.builtTable;
    }

    /**
     * The column titles, kept outside the scrolling area so they sit on the window's own gradient.
     */
    public get header() {
        if (!this.builtHeader) {
            const header = document.createElement("table");
            header.classList.add(
                "voice_selector_table",
                "voice_selector_columns"
            );
            header.append(PresetListView.createColumns());
            const row = header.createTHead().insertRow();
            for (const column of [
                "columnBankLSB",
                "columnBankMSB",
                "columnProgram",
                "columnName"
            ]) {
                const th = document.createElement("th");
                this.locale.bindObjectProperty(
                    th,
                    "textContent",
                    LOCALE_PATH + "channelController.presetSelector." + column
                );
                row.append(th);
            }

            // Filters for the numbers, empty means any
            const filterBody = header.createTBody();
            filterBody.hidden = true;
            const filterRow = filterBody.insertRow();
            for (let i = 0; i < 3; i++) {
                const cell = filterRow.insertCell();
                const input = document.createElement("input");
                input.type = "text";
                input.addEventListener("input", (e) => {
                    e.stopPropagation();
                    this.onFilterChange?.();
                });
                input.addEventListener("keydown", (e) => {
                    e.stopPropagation();
                    this.onKey?.(e);
                });
                cell.append(input);
                this.filterInputs.push(input);
            }
            filterRow.insertCell();
            this.filterBody = filterBody;
            this.builtHeader = header;
        }
        return this.builtHeader;
    }

    public static for(elements: PresetListElement[], locale: LocaleManager) {
        let view = PresetListView.cache.get(elements);
        if (!view) {
            view = new PresetListView(elements, locale);
            PresetListView.cache.set(elements, view);
        }
        return view;
    }

    // Both tables share the widths, so the columns line up
    private static createColumns() {
        const group = document.createElement("colgroup");
        for (const width of ["5.5rem", "5.5rem", "5.5rem", ""]) {
            const col = document.createElement("col");
            col.style.width = width;
            group.append(col);
        }
        return group;
    }

    private static programKey(patch: PresetListElement) {
        return patch.program * 2 + (patch.isDrum ? 1 : 0);
    }

    private static matchesFilter(
        filter: string,
        value: number,
        label?: string
    ) {
        if (filter === "") {
            return true;
        }
        if (/^\d+$/.test(filter)) {
            return Number(filter) === value;
        }
        return label?.toLowerCase().includes(filter.toLowerCase()) ?? false;
    }

    /**
     * Builds the table ahead of time, so the first open is instant too.
     */
    public prepare() {
        void this.table;
    }

    /**
     * Drum kits of one program are told apart by the bank too, so they count like melodic programs.
     * @returns true if more than one preset shares the program of the given one.
     */
    public isProgramAmbiguous(patch: PresetListElement) {
        return (
            (this.programCounts.get(PresetListView.programKey(patch)) ?? 0) > 1
        );
    }

    public rowOf(preset: PresetListElement) {
        return this.presetToRow.get(preset);
    }

    public presetOf(row: Element | null) {
        return this.rowToPreset.get(row as HTMLTableRowElement);
    }

    /**
     * Shows or hides the column filters, hiding them also clears them.
     */
    public setFiltersShown(shown: boolean) {
        void this.header;
        this.filterBody!.hidden = !shown;
        if (!shown) {
            for (const input of this.filterInputs) {
                input.value = "";
            }
        }
    }

    /**
     * Clears the search and the filters.
     */
    public resetSearch() {
        void this.header;
        for (const input of this.filterInputs) {
            input.value = "";
        }
        this.search("");
    }

    /**
     * Shows only the presets matching the text and the column filters.
     * @returns the amount of presets shown.
     */
    public search(text: string) {
        void this.header;
        void this.table;
        // Plain text search, the input is not a valid regex in general
        text = text.toLowerCase();
        const [lsb, msb, program] = this.filterInputs.map((i) =>
            i.value.trim()
        );
        // Hidden rows are taken out of the DOM, toggling thousands of them in place is slow
        const visible = document.createDocumentFragment();
        let count = 0;
        for (const group of this.groups) {
            const groupRows = new Array<HTMLTableRowElement>();
            for (const row of group.rows) {
                const d = this.rowData.get(row)!;
                const match =
                    d.text.includes(text) &&
                    PresetListView.matchesFilter(lsb, d.lsb) &&
                    PresetListView.matchesFilter(msb, d.msb, d.msbLabel) &&
                    PresetListView.matchesFilter(program, d.program);
                if (match) {
                    groupRows.push(row);
                }
            }
            if (groupRows.length > 0) {
                if (group.header) {
                    visible.append(group.header);
                }
                visible.append(...groupRows);
                count += groupRows.length;
            }
        }
        this.body!.replaceChildren(visible);
        return count;
    }

    private build() {
        const table = document.createElement("table");
        table.classList.add("voice_selector_table");

        table.append(PresetListView.createColumns());

        const body = table.createTBody();
        this.body = body;
        let lastProgram = -20;
        let group: ProgramGroup | undefined;
        for (const preset of this.elements) {
            const row = document.createElement("tr");
            row.classList.add("voice_selector_option");
            this.presetToRow.set(preset, row);
            this.rowToPreset.set(row, preset);
            this.rowData.set(row, {
                text: preset.stringified.toLowerCase(),
                lsb: preset.bankLSB,
                msb: preset.bankMSB,
                msbLabel: drumBankLabel(preset),
                program: preset.program
            });

            // Create a new group
            if (preset.program !== lastProgram) {
                lastProgram = preset.program;
                group = { rows: [] };
                this.groups.push(group);
                // Create the header (not for drums)
                if (!preset.isDrum) {
                    const headerRow = document.createElement("tr");
                    const header = document.createElement("th");
                    header.colSpan = 4;
                    header.textContent = midiPatchNames[lastProgram];
                    headerRow.append(header);
                    body.append(headerRow);
                    group.header = headerRow;
                }
            }
            group!.rows.push(row);

            const presetName = document.createElement("td");
            presetName.classList.add("voice_selector_preset_name");
            presetName.textContent = preset.name;

            const presetProgram = document.createElement("td");
            presetProgram.classList.add("voice_selector_preset_program");
            presetProgram.textContent = preset.program
                .toString()
                .padStart(3, "0");

            const presetBankMSB = document.createElement("td");
            presetBankMSB.classList.add("voice_selector_preset_program");
            presetBankMSB.textContent =
                drumBankLabel(preset) ??
                preset.bankMSB.toString().padStart(3, "0");

            const presetBankLSB = document.createElement("td");
            presetBankLSB.classList.add("voice_selector_preset_program");
            presetBankLSB.textContent = preset.bankLSB
                .toString()
                .padStart(3, "0");

            row.append(presetBankLSB, presetBankMSB, presetProgram, presetName);
            body.append(row);
        }

        // One listener for the whole table instead of one per row
        table.addEventListener("click", (e) => {
            const row = (e.target as Element).closest("tr");
            const preset = this.presetOf(row);
            if (preset) {
                this.onPick?.(preset);
            }
        });
        return table;
    }
}
