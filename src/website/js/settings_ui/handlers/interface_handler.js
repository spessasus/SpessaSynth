

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
}