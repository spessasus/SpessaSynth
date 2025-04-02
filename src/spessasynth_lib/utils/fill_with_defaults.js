/**
 * Fills the object with default values
 * @param obj {Object}
 * @param defObj {Object}
 * @returns {Object}
 */
export function fillWithDefaults(obj, defObj)
{
    for (const key in defObj)
    {
        if (defObj.hasOwnProperty(key) && !(key in obj))
        {
            obj[key] = defObj[key];
        }
    }
    return obj;
}