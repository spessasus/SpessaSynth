/**
 * @this {Settings}
 * @private
 */
export function _toggleDarkMode()
{
    if(this.mode === "dark")
    {
        this.mode = "light";
        this.renderer.drawActiveNotes = false;
    }
    else
    {
        this.renderer.drawActiveNotes = true;
        this.mode = "dark";

    }
    this.renderer.toggleDarkMode();
    this.synthui.toggleDarkMode();
    this.sequi.toggleDarkMode()

    // top part
    document.getElementsByClassName("top_part")[0].classList.toggle("top_part_light");

    // settings
    this.mainDiv.classList.toggle("settings_menu_light");

    // rest
    // things get hacky here: change the global (*) --font-color to black:
    // find the star rule
    const rules = document.styleSheets[0].cssRules;
    for(let rule of rules)
    {
        if(rule.selectorText === "*")
        {
            rule.style.setProperty("--font-color",  this.mode === "dark" ? "#eee" : "#333");
            rule.style.setProperty("--top-buttons-color",  this.mode === "dark" ? "linear-gradient(201deg, #222, #333)" : "linear-gradient(270deg, #ddd, #fff)");
            break;
        }
    }
    document.body.style.background = this.mode === "dark" ? "black" : "white";
}

/**
 * @this {Settings}
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
        this.locale.changeGlobalLocale(this.locales[select.value]);
        this._saveSettings();
    }
}