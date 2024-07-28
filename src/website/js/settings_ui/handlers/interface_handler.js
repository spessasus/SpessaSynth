

/**
 * @this {SpessaSynthSettings}
 * @private
 */
export function _createInterfaceSettingsHandler()
{
    const button = this.htmlControls.interface.themeSelector;
    button.onclick = () => {
        this._toggleDarkMode();
        this._saveSettings();
    }
    const select = this.htmlControls.interface.languageSelector;
    // load up the languages
    for(const [code, locale] of Object.entries(this.locales))
    {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = locale.localeName
        select.appendChild(option);
    }
    select.onchange = () => {
        this.locale.changeGlobalLocale(select.value);
        this._saveSettings();
    }
    const layoutSelect = this.htmlControls.interface.layoutSelector;
    layoutSelect.onchange = () => {
        this._changeLayout(layoutSelect.value);
        this._saveSettings();
        layoutSelect.blur();
    }
}

/**
 * @this {SpessaSynthSettings}
 * @param layout {"downwards"|"upwards"|"left"|"right"}
 * @private
 */
export function _changeLayout(layout)
{
    const wrapper = document.getElementById("keyboard_canvas_wrapper");
    const canvas = document.getElementById("note_canvas");
    const keyboard = document.getElementById("keyboard");
    switch (layout)
    {
        case 'downwards':
            wrapper.classList.remove("upwards");
            wrapper.classList.remove("left_to_right");
            wrapper.classList.remove("right_to_left");

            canvas.classList.remove("sideways");
            keyboard.classList.remove("sideways");
            this.renderer.direction = "down";
            this.renderer.sideways = false;
            break;

        case 'upwards':
            wrapper.classList.add("upwards");
            wrapper.classList.remove("left_to_right");
            wrapper.classList.remove("right_to_left");

            canvas.classList.remove("sideways");
            keyboard.classList.remove("sideways");
            this.renderer.direction = "up";
            this.renderer.sideways = false;
            break;

        case 'left':
            wrapper.classList.remove("upwards");
            wrapper.classList.add("left_to_right");
            wrapper.classList.remove("right_to_left");

            canvas.classList.add("sideways");
            keyboard.classList.add("sideways");
            this.renderer.direction = "up";
            this.renderer.sideways = true;
            break;

        case 'right':
            wrapper.classList.remove("upwards");
            wrapper.classList.remove("left_to_right");
            wrapper.classList.add("right_to_left");

            canvas.classList.add("sideways");
            keyboard.classList.add("sideways");
            this.renderer.direction = "down";
            this.renderer.sideways = true;
    }
}