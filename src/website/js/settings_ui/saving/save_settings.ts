// if window.saveSettings function is exposed, call it with _serializeSettings
/**
 * @this {SpessaSynthSettings}
 * @private
 */
export function _saveSettings()
{
    if (window.saveSettings)
    {
        window.saveSettings(this._serializeSettings());
    }
}