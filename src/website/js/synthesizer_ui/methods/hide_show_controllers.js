/**
 * @this {SynthetizerUI}
 */
export function hideControllers()
{
    this.controllers.forEach(c =>
    {
        c.voiceMeter.hide();
        c.pitchWheel.hide();
        for (const meter of Object.values(c.controllerMeters))
        {
            meter.hide();
        }
        c.transpose.hide();
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
        for (const meter of Object.values(c.controllerMeters))
        {
            meter.show();
        }
        c.transpose.show();
    });
}