type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
 * Fills the object with default values.
 * Now works with nested objects!
 * @param obj object to fill.
 * @param defObj object to fill with.
 */
export function fillWithDefaults<T extends object>(
    obj: Partial<T> | undefined,
    defObj: T
): T {
    if (obj === undefined) {
        return defObj;
    }

    const result: T = { ...defObj };

    for (const key in defObj) {
        const objValue = obj[key];
        const defValue = defObj[key];

        if (objValue === undefined) {
            continue;
        }

        result[key] =
            isPlainObject(objValue) && isPlainObject(defValue)
                ? fillWithDefaults(
                      objValue as Partial<typeof defValue>,
                      defValue
                  )
                : (objValue as T[typeof key]);
    }

    return result;
}
