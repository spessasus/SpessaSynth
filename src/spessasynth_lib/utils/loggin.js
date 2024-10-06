let ENABLE_INFO = true;
let ENABLE_WARN = true;
let ENABLE_GROUP = true;
let ENABLE_TABLE = true;

/**
 * Enables or disables looging
 * @param enableInfo {boolean} - enables info
 * @param enableWarn {boolean} - enables warning
 * @param enableGroup {boolean} - enables groups
 * @param enableTable {boolean} - enables tables
 */
export function SpessaSynthLogging(enableInfo, enableWarn, enableGroup, enableTable)
{
    ENABLE_INFO = enableInfo;
    ENABLE_WARN = enableWarn;
    ENABLE_GROUP = enableGroup;
    ENABLE_TABLE = enableTable;
}

/**
 * @param message {...any}
 */
export function SpessaSynthInfo(...message)
{
    if(ENABLE_INFO)
    {
        console.info(...message);
    }
}

/**
 * @param message {...any}
 */
export function SpessaSynthWarn(...message)
{
    if(ENABLE_WARN)
    {
        console.warn(...message);
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
 * @param message {...any} the message
 */
export function SpessaSynthGroup(...message)
{
    if(ENABLE_GROUP)
    {
        console.group(...message);
    }
}

/**
 * @param message {...any} the message
 */
export function SpessaSynthGroupCollapsed(...message)
{
    if(ENABLE_GROUP)
    {
        console.groupCollapsed(...message);
    }
}

export function SpessaSynthGroupEnd()
{
    if(ENABLE_GROUP)
    {
        console.groupEnd();
    }
}