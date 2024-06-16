const ENABLE_INFO = true;
const ENABLE_WARN = true;
const ENABLE_GROUP = true;
const ENABLE_TABLE = true;

/**
 * @param message {string} the message
 * @param colors {...string} colors to use
 */
export function SpessaSynthInfo(message, ...colors)
{
    if(ENABLE_INFO)
    {
        console.info(message, ...colors);
    }
}

/**
 * @param message {string} the message
 * @param colors {...string} colors to use
 */
export function SpessaSynthWarn(message, ...colors)
{
    if(ENABLE_WARN)
    {
        console.warn(message, ...colors);
    }
}

export function SpessaSynthTable(...args)
{
    if(ENABLE_TABLE)
    {
        console.table(...args);
    }
}

/**
 * @param message {string} the message
 * @param colors {...string} colors to use
 */
export function SpessaSynthGroup(message, ...colors)
{
    if(ENABLE_GROUP)
    {
        console.group(message, ...colors);
    }
}

/**
 * @param message {string} the message
 * @param colors {...string} colors to use
 */
export function SpessaSynthGroupCollapsed(message, ...colors)
{
    if(ENABLE_GROUP)
    {
        console.groupCollapsed(message, ...colors);
    }
}

export function SpessaSynthGroupEnd()
{
    if(ENABLE_GROUP)
    {
        console.groupEnd();
    }
}