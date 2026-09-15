import { LOCALE_PATH, type PresetListElement } from "../synthetizer_ui.ts";
import { Ut } from "../../utils/other.ts";
import type { Synthesizer } from "../../utils/synthesizer.ts";
import type { LocaleManager } from "../../manager/locale_manager.ts";
import {
    DrumParameterUtils,
    type MIDIPatch,
    MIDIUtils,
    type UserDrumSetParameter
} from "spessasynth_core";
import { Selector } from "./synthui_selector.ts";

const DRUM_SET_COUNT = 2;
const FIRST_USER_DRUM = 64;
const TABLE_CELLS = [
    "key",
    "preset",
    "sourceNoteNumber",
    "pitchCoarse",
    "level",
    "assignGroup",
    "pan",
    "reverbSend",
    "chorusSend",
    "variationSend",
    "rxNoteOn",
    "rxNoteOff"
];

type BooleanKeys<T> = {
    [K in keyof T]: T[K] extends boolean ? K : never;
}[keyof T];

type NumericKeys<T> = {
    [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

type NumericUserDrumParams = NumericKeys<UserDrumSetParameter>;
type BooleanUserInputParams = BooleanKeys<UserDrumSetParameter>;

interface UserDrumSetKey {
    param: UserDrumSetParameter;
    selector: Selector;
    changed: boolean;
    row: HTMLTableRowElement;
    inputs: Partial<Record<NumericUserDrumParams, HTMLInputElement>>;
    toggles: Partial<Record<BooleanUserInputParams, HTMLButtonElement>>;
}

interface UserDrumSet {
    table: HTMLTableElement;
    keys: UserDrumSetKey[];
}

export class UserDrumSetEditor {
    public readonly wrapper;
    public readonly toggleLock;
    private readonly synth;
    private readonly locale;
    private readonly path;
    private isLocked = false;
    private showOnlyChanged = false;
    /**
     * UserDrumdata[drumSet][midiNote]
     * @private
     */
    private readonly drumSets = new Array<UserDrumSet>();
    private readonly drumSetSelector;
    private readonly patchSelectors = new Array<Selector>();

    public constructor(
        synth: Synthesizer,
        localeManager: LocaleManager,
        path: string
    ) {
        this.synth = synth;
        this.locale = localeManager;
        this.path = path;

        const wrapper = document.createElement("div");
        this.wrapper = wrapper;
        wrapper.classList.add("effect_wrapper", "synthui_tab");
        Ut.hide(wrapper);
        // Title, subtitle
        {
            const title = document.createElement("h2");
            this.locale.bindObjectProperty(
                title,
                "textContent",
                path + "title"
            );
            wrapper.append(title);

            // Subtitle
            const subtitle = document.createElement("h4");
            this.locale.bindObjectProperty(
                subtitle,
                "textContent",
                path + "description"
            );
            wrapper.append(subtitle);
        }

        // Lock + selector + show only changed
        {
            const controlRow = document.createElement("div");
            controlRow.classList.add("flex-wrap");
            wrapper.append(controlRow);

            // Lock
            const lock = document.createElement("button");
            lock.classList.add("synthui_button");
            this.locale.bindObjectProperty(
                lock,
                "textContent",
                LOCALE_PATH + "effectsConfig.toggleLock.title"
            );
            this.locale.bindObjectProperty(
                lock,
                "title",
                LOCALE_PATH + "effectsConfig.toggleLock.description"
            );
            const toggleLock = () => {
                this.isLocked = !this.isLocked;
                this.synth.setSystemParameter("userDrumLock", this.isLocked);
                lock.style.color = this.isLocked ? "red" : "";
            };
            lock.addEventListener("click", toggleLock);
            this.toggleLock = toggleLock;
            controlRow.append(lock);

            // Show only changed
            const showOnlyChanged = document.createElement("button");
            showOnlyChanged.classList.add("synthui_button");
            this.locale.bindObjectProperty(
                showOnlyChanged,
                "textContent",
                path + "showOnlyChanged.title"
            );
            this.locale.bindObjectProperty(
                showOnlyChanged,
                "title",
                path + "showOnlyChanged.description"
            );
            showOnlyChanged.addEventListener("click", () => {
                this.showOnlyChanged = !this.showOnlyChanged;
                showOnlyChanged.classList.toggle(
                    "enabled",
                    this.showOnlyChanged
                );
                this.updateVisibility();
            });
            controlRow.append(showOnlyChanged);

            // Drum Set Selector
            this.drumSetSelector = document.createElement("select");
            this.drumSetSelector.classList.add("synthui_button");
            localeManager.bindObjectProperty(
                this.drumSetSelector,
                "title",
                path + "selector.description"
            );
            controlRow.append(this.drumSetSelector);
            this.drumSetSelector.addEventListener("change", () =>
                this.selectDrum(Number.parseInt(this.drumSetSelector.value))
            );
        }

        const tableWrapper = document.createElement("div");
        tableWrapper.classList.add("synthui_table_wrapper");
        wrapper.append(tableWrapper);

        // Init params and tables themselves
        {
            for (let drumSet = 0; drumSet < DRUM_SET_COUNT; drumSet++) {
                // Main table
                const table = document.createElement("table");

                // Header
                const headerRow = document.createElement("tr");

                for (const cell of TABLE_CELLS) {
                    const cellElement = document.createElement("th");
                    this.locale.bindObjectProperty(
                        cellElement,
                        "textContent",
                        path + `params.${cell}.title`
                    );
                    headerRow.append(cellElement);
                }
                table.append(headerRow);

                const keys = new Array<UserDrumSetKey>();
                for (let midiNote = 0; midiNote < 128; midiNote++) {
                    const key = this.createKey(drumSet, midiNote);
                    keys.push(key);
                    table.append(key.row);
                }

                tableWrapper.append(table);

                this.drumSets.push({
                    keys,
                    table
                });
            }
        }

        this.selectDrum(0);
        // Set up change listener
        this.synth.eventHandler.addEvent(
            "userDrumSetChange",
            "user-drum-set-editor",
            (e) => {
                const key = this.drumSets[e.drumSet].keys[e.midiNote];
                key.param[e.parameter] = e.value as never;
                const isReallyChanged = !DrumParameterUtils.isUserDefault(
                    key.param,
                    e.midiNote
                );
                if (isReallyChanged !== key.changed) {
                    key.changed = isReallyChanged;
                    key.row.classList.toggle("changed", isReallyChanged);
                    this.updateVisibility();
                }

                if (
                    e.parameter === "program" ||
                    e.parameter === "sourceDrumSet"
                ) {
                    key.selector.set(UserDrumSetEditor.paramToPatch(key.param));
                } else if (
                    e.parameter === "rxNoteOn" ||
                    e.parameter === "rxNoteOff"
                ) {
                    const t = key.toggles[e.parameter];
                    if (t) {
                        t.classList.toggle("enabled_bg", e.value);
                    }
                } else {
                    const i = key.inputs[e.parameter];
                    if (i) {
                        i.value = e.value.toString();
                    }
                }
            }
        );
    }

    private static paramToPatch(param: UserDrumSetParameter): MIDIPatch {
        return {
            bankLSB: 0,
            bankMSB: param.sourceDrumSet,
            program: param.program,
            isGMGSDrum: true
        };
    }

    public updateDrumList(drumList: PresetListElement[]) {
        this.drumSetSelector.innerHTML = "";
        const userDrums = drumList.filter(
            (d) =>
                d.program >= FIRST_USER_DRUM &&
                d.program < FIRST_USER_DRUM + DRUM_SET_COUNT
        );
        for (const drum of userDrums) {
            const opt = document.createElement("option");
            opt.textContent = drum.name;
            opt.value = (drum.program - FIRST_USER_DRUM).toString();
            this.drumSetSelector.append(opt);
        }
        const availableDrums = drumList.filter(
            (d) =>
                d.program < FIRST_USER_DRUM ||
                d.program >= FIRST_USER_DRUM + DRUM_SET_COUNT
        );
        if (availableDrums.length === 0) {
            return;
        }
        for (const selector of this.patchSelectors) {
            selector.reload(availableDrums);
            if (!selector.value) {
                selector.set(availableDrums[0]);
            }
        }
    }

    public reset() {
        if (!this.isLocked) {
            for (const drumSet of this.drumSets) {
                for (let i = 0; i < drumSet.keys.length; i++) {
                    const key = drumSet.keys[i];
                    DrumParameterUtils.copyIntoUser(
                        DrumParameterUtils.DEFAULT_USER_DATA[i],
                        key.param
                    );
                    key.selector.set(UserDrumSetEditor.paramToPatch(key.param));
                    key.changed = false;
                    key.row.classList.remove("changed");
                }
            }

            // Ensure that resetting unlocked user drum commits the reset to channels for consistent UI
            for (const channel of this.synth.midiChannels.filter(
                (c) =>
                    c.patch.isGMGSDrum &&
                    c.patch.program >= FIRST_USER_DRUM &&
                    c.patch.program < FIRST_USER_DRUM + DRUM_SET_COUNT
            )) {
                this.updateDrumsOnChannel(channel);
            }
            this.updateVisibility();
        }
    }

    private createKey(drumSet: number, midiNote: number): UserDrumSetKey {
        // Create a single key row in the table
        const param = {
            ...DrumParameterUtils.DEFAULT_USER_DATA[midiNote]
        };
        const row = document.createElement("tr");

        const keyNum = document.createElement("td");
        keyNum.textContent = midiNote.toString();
        row.append(keyNum);

        // Patch selector
        const selector = new Selector(
            [],
            this.locale,
            this.path + "params.preset",
            [midiNote],
            (patch: MIDIPatch) => {
                this.updateUserDrumParam(
                    drumSet,
                    midiNote,
                    "program",
                    patch.program
                );
                this.updateUserDrumParam(
                    drumSet,
                    midiNote,
                    "sourceDrumSet",
                    patch.program
                );
            }
        );
        this.patchSelectors.push(selector);
        const selectorWrapper = document.createElement("td");
        selectorWrapper.append(selector.mainButton);
        row.append(selectorWrapper);
        selector.set(UserDrumSetEditor.paramToPatch(param));

        return {
            param,
            selector,
            changed: false,
            row,
            inputs: {
                // Order is important here!!!
                sourceNoteNumber: this.getNumberInput(
                    row,
                    drumSet,
                    midiNote,
                    "sourceNoteNumber",
                    DrumParameterUtils.DEFAULT_USER_DATA[midiNote]
                        .sourceNoteNumber
                ),
                pitchCoarse: this.getNumberInput(
                    row,
                    drumSet,
                    midiNote,
                    "pitchCoarse",
                    DrumParameterUtils.DEFAULT_USER_DATA[midiNote].pitchCoarse,
                    // Centers at 60
                    -60,
                    67
                ),
                level: this.getNumberInput(
                    row,
                    drumSet,
                    midiNote,
                    "level",
                    DrumParameterUtils.DEFAULT_USER_DATA[midiNote].level
                ),
                assignGroup: this.getNumberInput(
                    row,
                    drumSet,
                    midiNote,
                    "assignGroup",
                    DrumParameterUtils.DEFAULT_USER_DATA[midiNote].assignGroup
                ),
                pan: this.getNumberInput(
                    row,
                    drumSet,
                    midiNote,
                    "pan",
                    DrumParameterUtils.DEFAULT_USER_DATA[midiNote].pan
                ),
                reverbSend: this.getNumberInput(
                    row,
                    drumSet,
                    midiNote,
                    "reverbSend",
                    DrumParameterUtils.DEFAULT_USER_DATA[midiNote].reverbSend
                ),
                chorusSend: this.getNumberInput(
                    row,
                    drumSet,
                    midiNote,
                    "chorusSend",
                    DrumParameterUtils.DEFAULT_USER_DATA[midiNote].chorusSend
                ),
                variationSend: this.getNumberInput(
                    row,
                    drumSet,
                    midiNote,
                    "variationSend",
                    DrumParameterUtils.DEFAULT_USER_DATA[midiNote].variationSend
                )
            },
            toggles: {
                // Order is also important here!!!
                rxNoteOn: this.getToggleInput(
                    row,
                    drumSet,
                    midiNote,
                    "rxNoteOn",
                    DrumParameterUtils.DEFAULT_USER_DATA[midiNote].rxNoteOn
                ),
                rxNoteOff: this.getToggleInput(
                    row,
                    drumSet,
                    midiNote,
                    "rxNoteOff",
                    DrumParameterUtils.DEFAULT_USER_DATA[midiNote].rxNoteOff
                )
            }
        };
    }

    private updateUserDrumParam<P extends keyof UserDrumSetParameter>(
        drumSet: number,
        midiNote: number,
        parameter: P,
        value: UserDrumSetParameter[P]
    ) {
        if (this.isLocked) {
            this.synth.setSystemParameter("userDrumLock", false);
        }

        this.synth.systemExclusive(
            MIDIUtils.setUserDrumParameter(
                0,
                drumSet,
                midiNote,
                parameter,
                value
            ).data
        );

        for (const channel of this.synth.midiChannels.filter(
            (c) =>
                c.patch.isGMGSDrum &&
                c.patch.program === FIRST_USER_DRUM + drumSet
        )) {
            this.updateDrumsOnChannel(channel);
        }

        if (this.isLocked) {
            this.synth.setSystemParameter("userDrumLock", true);
        }
    }

    private getToggleInput(
        row: HTMLTableRowElement,
        drumSet: number,
        midiNote: number,
        param: BooleanUserInputParams,
        initial: boolean
    ) {
        const td = document.createElement("td");
        this.locale.bindObjectProperty(
            td,
            "title",
            this.path + "params." + param + ".description",
            [midiNote]
        );
        const toggle = document.createElement("button");
        toggle.classList.add("synthui_button", "synthui_input");
        let active = initial;

        toggle.classList.toggle("enabled_bg", initial);
        toggle.addEventListener("click", () => {
            active = !active;
            this.updateUserDrumParam(drumSet, midiNote, param, active);
        });
        td.append(toggle);
        row.append(td);
        return toggle;
    }

    private getNumberInput(
        row: HTMLTableRowElement,
        drumSet: number,
        midiNote: number,
        param: NumericUserDrumParams,
        initial: number,
        min = 0,
        max = 127
    ) {
        const td = document.createElement("td");
        this.locale.bindObjectProperty(
            td,
            "title",
            this.path + "params." + param + ".description",
            [midiNote]
        );
        const wrapper = document.createElement("button");
        wrapper.classList.add("synthui_button", "synthui_input");
        td.append(wrapper);
        const input = document.createElement("input");

        input.type = "number";
        input.min = min.toString();
        input.max = max.toString();
        input.value = initial.toString();
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                input.dispatchEvent(new Event("change", { bubbles: true }));
                input.blur();
            }
            e.stopPropagation();
        });
        input.addEventListener("change", () => {
            let v = Number.parseInt(input.value);
            if (Number.isNaN(v)) {
                return;
            }
            v = Math.max(min, Math.min(max, v));
            input.value = v.toString();
            this.updateUserDrumParam(drumSet, midiNote, param, Math.floor(v));
        });
        wrapper.append(input);
        row.append(td);

        return input;
    }

    private updateVisibility() {
        if (this.showOnlyChanged) {
            for (const drumSet of this.drumSets) {
                for (const key of drumSet.keys) {
                    Ut.toggle(key.row, key.changed);
                }
            }
        } else {
            for (const drumSet of this.drumSets) {
                for (const key of drumSet.keys) {
                    Ut.show(key.row);
                }
            }
        }
    }

    private updateDrumsOnChannel(channel: (typeof this.synth.midiChannels)[0]) {
        const lock = channel.systemParameters.presetLock;
        if (lock) {
            channel.setSystemParameter("presetLock", false);
        }
        this.synth.programChange(
            this.synth.midiChannels.indexOf(channel),

            channel.patch.program
        );
        if (lock) {
            channel.setSystemParameter("presetLock", true);
        }
    }

    private selectDrum(drumSet: number) {
        for (const set of this.drumSets) {
            Ut.hide(set.table);
        }
        Ut.show(this.drumSets[drumSet].table);
    }
}
