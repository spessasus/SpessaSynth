/**
 * @this {SynthetizerUI}
 */
export function hideControllers()
{
    this.controllers.forEach(c =>
    {
        c.voiceMeter.hide();
        c.pitchWheel.hide();
        c.pan.hide();
        c.expression.hide();
        c.volume.hide();
        c.mod.hide();
        c.chorus.hide();
        c.reverb.hide();
        c.brightness.hide();
        c.preset.hide();
    });
}

/**
 * @this {SynthetizerUI}
 */
export function showControllers()
{
    this.controllers.forEach(c =>
    {
        c.voiceMeter.show();
        c.pitchWheel.show();
        c.pan.show();
        c.expression.show();
        c.volume.show();
        c.mod.show();
        c.chorus.show();
        c.reverb.show();
        c.brightness.show();
        c.preset.show();
    });
}