import type { SpessaSynthSettings } from "../settings.ts";
import type { localeList } from "../../locale/locale_files/locale_list.ts";
import type { LayoutType } from "../../../server/saved_settings.ts";

/**
 * @this {SpessaSynthSettings}
 * @private
 */
export function _createInterfaceSettingsHandler(this: SpessaSynthSettings) {
    const button = this.htmlControls.interface.themeSelector;
    button.onclick = () => {
        this._toggleDarkMode();
        this._saveSettings();
    };
    const select = this.htmlControls.interface.languageSelector;
    // Load up the languages
    for (const [code, locale] of Object.entries(this.locales)) {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = locale.localeName;
        select.appendChild(option);
    }
    select.value = this.locale.localeCode;
    select.onchange = () => {
        if (select.value === "help-translate") {
            window.open(
                "https://github.com/spessasus/SpessaSynth/blob/master/src/website/js/locale/locale_files/README.md"
            );
            select.value = this.locale.localeCode;
            return;
        }
        this.locale.changeGlobalLocale(select.value as keyof typeof localeList);
        this._saveSettings();
    };
    const layoutSelect = this.htmlControls.interface.layoutSelector;
    layoutSelect.onchange = () => {
        this._changeLayout(layoutSelect.value as LayoutType);
        this._saveSettings();
        layoutSelect.blur();
    };

    // IMPORTANT
    // This DOES NOT get saved in settings!
    const seqControls = this.htmlControls.interface.showControlsToggle;
    seqControls.onchange = () => {
        if (seqControls.checked) {
            document
                .getElementsByClassName("bottom_part")[0]
                .classList.remove("hidden");
        } else {
            document
                .getElementsByClassName("bottom_part")[0]
                .classList.add("hidden");
        }
    };
}

export function _changeLayout(this: SpessaSynthSettings, layout: LayoutType) {
    const wrapper = document.getElementById("keyboard_canvas_wrapper")!;
    const canvas = document.getElementById("note_canvas")!;
    const keyboard = document.getElementById("keyboard")!;
    switch (layout) {
        case "downwards":
            wrapper.classList.remove("upwards");
            wrapper.classList.remove("left_to_right");
            wrapper.classList.remove("right_to_left");

            canvas.classList.remove("sideways");
            keyboard.classList.remove("sideways");
            this.renderer.direction = "down";
            this.renderer.sideways = false;
            break;

        case "upwards":
            wrapper.classList.add("upwards");
            wrapper.classList.remove("left_to_right");
            wrapper.classList.remove("right_to_left");

            canvas.classList.remove("sideways");
            keyboard.classList.remove("sideways");
            this.renderer.direction = "up";
            this.renderer.sideways = false;
            break;

        case "left":
            wrapper.classList.remove("upwards");
            wrapper.classList.add("left_to_right");
            wrapper.classList.remove("right_to_left");

            canvas.classList.add("sideways");
            keyboard.classList.add("sideways");
            this.renderer.direction = "up";
            this.renderer.sideways = true;
            break;

        case "right":
            wrapper.classList.remove("upwards");
            wrapper.classList.remove("left_to_right");
            wrapper.classList.add("right_to_left");

            canvas.classList.add("sideways");
            keyboard.classList.add("sideways");
            this.renderer.direction = "down";
            this.renderer.sideways = true;
    }
    this.renderer.updateSize();
}
