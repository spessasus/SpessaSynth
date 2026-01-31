import type { CompleteLocaleTypedef } from "./locale_files/locale_typedef.ts";
import {
    DEFAULT_LOCALE,
    type LocaleCode,
    localeList
} from "./locale_files/locale_list.js";

export interface PropertyType {
    object: Record<string, string>;
    propertyName: string;
    localePath: string;
    formattingArguments: (string | number)[];
    isEdited: boolean;
}

export class LocaleManager {
    public localeCode: LocaleCode;
    /**
     * Calls it when the locale has changed (no arguments)
     */
    public onLocaleChanged: (() => unknown)[] = [];
    private locale: Partial<CompleteLocaleTypedef>;
    private readonly fallbackLocale: CompleteLocaleTypedef;
    /**
     * All bound object properties and their respective objects.
     */
    private _boundObjectProperties: PropertyType[] = [];

    /**
     * Creates a new locale manager, responsible for managing and binding text values, then changing them when the locale changes.
     */
    public constructor(initialLocale: LocaleCode) {
        this.locale = (localeList[initialLocale] ??
            localeList[DEFAULT_LOCALE]) as Partial<CompleteLocaleTypedef>;
        this.fallbackLocale = localeList[DEFAULT_LOCALE];
        this.localeCode = initialLocale;
    }

    /**
     * Resolves and gets the localized string for the current path
     * @param localePath The locale path to the text, written as JS object path, starts with "locale."
     * @param formattingArguments optional arguments if the locale uses formatting ("{0} {1}") etc.
     * @returns The localized string
     */
    public getLocaleString(
        localePath: string,
        formattingArguments: (string | number)[] = []
    ): string {
        const locale = this._resolveLocalePath(localePath);
        if (formattingArguments.length > 0) {
            return this._formatLocale(locale, formattingArguments);
        }
        return locale;
    }

    /**
     * Binds a given object's property to a locale path and applies it.
     * @param object The object that holds the bound property.
     * @param propertyName The object's property to bind.
     * @param localePath The locale path to the text, written as JS object path, starts with "locale."
     * @param formattingArguments Ooptional arguments if the locale uses formatting ("{0} {1}") etc.
     */
    public bindObjectProperty<K>(
        object: K,
        propertyName: keyof K,
        localePath: string,
        formattingArguments: (string | number)[] = []
    ) {
        /**
         * Compile the property.
         */
        const property: PropertyType = {
            object: object as Record<string, string>,
            propertyName: propertyName as string,
            localePath: localePath,
            formattingArguments: formattingArguments,
            isEdited: false
        };
        // Apply value to the property
        this._applyPropertyInternal(property);
        // Add to the bound properties list
        this._boundObjectProperties.push(property);
    }

    /**
     * Changes the global locale and all bound text.
     * @param newLocale
     * @param force If the locale should be applied even to changed values.
     */
    public changeGlobalLocale(newLocale: LocaleCode, force = false) {
        document.documentElement.lang = newLocale;
        const newLocaleObject = localeList[
            newLocale
        ] as Partial<CompleteLocaleTypedef>;
        if (!newLocaleObject) {
            console.warn(`Locale ${newLocale} not found. Not switching.`);
            return;
        }
        this.localeCode = newLocale;
        console.info("Changing locale to", newLocaleObject.localeName);
        if (!force) {
            // Check if the property has been changed to something else. If so, don't change it back.
            for (const property of this._boundObjectProperties) {
                this._validatePropertyIntegrity(property);
            }
        }
        this.locale = newLocaleObject;
        // Apply the new locale to bound elements
        for (const property of this._boundObjectProperties) {
            this._applyPropertyInternal(property);
        }
        for (const loc of this.onLocaleChanged) {
            loc();
        }
    }

    private _applyPropertyInternal(property: PropertyType) {
        // If edited, skip
        if (property.isEdited) {
            return;
        }
        let textValue = this._resolveLocalePath(property.localePath);
        if (property.formattingArguments.length > 0) {
            textValue = this._formatLocale(
                textValue,
                property.formattingArguments
            );
        }
        property.object[property.propertyName] = textValue;
    }

    /**
     * Checks if the property has changed and flags it as edited.
     */
    private _validatePropertyIntegrity(property: PropertyType) {
        // Get the text value
        let textValue = this._resolveLocalePath(property.localePath);
        if (property.formattingArguments.length > 0) {
            textValue = this._formatLocale(
                textValue,
                property.formattingArguments
            );
        }
        if (property.object[property.propertyName] !== textValue) {
            property.isEdited = true;
        }
    }

    /**
     * Replaces strings like "{0}" with the given arguments.
     * @param template The preformatted string.
     * @param values The values to fill the string with.
     * @return The formatted string.
     */
    private _formatLocale(
        template: string,
        values: (string | number)[]
    ): string {
        return template.replaceAll(/{(\d+)}/g, (match, number: number) => {
            return values[number] === undefined
                ? match
                : values[number].toString();
        });
    }

    /**
     * Resolves the locale path to get the string value from the locale object.
     * @param path The locale path to the text, written as JS object path, starts with "locale."
     * @param fallback If the locale being searched is the fallback locale.
     * @returns The string value from the path.
     */
    private _resolveLocalePath(path: string, fallback = false): string {
        if (!path.startsWith("locale.")) {
            throw new Error(
                `Invalid locale path: ${path} (it should start with "locale.")`
            );
        }

        const parts = path.split(".");

        /**
         * Traverse the locale object to get the value.
         */
        let current: object | string = fallback
            ? this.fallbackLocale
            : this.locale;
        for (
            let i = 1;
            i < parts.length;
            i++ // Start from 1 to skip "locale"
        ) {
            const part = parts[i];
            // @ts-expect-error I have no idea how to type this :-)
            if (current[part] === undefined) {
                if (fallback) {
                    throw new Error(
                        `Invalid locale path: ${path}: part "${parts[i]}" does not exist. Available paths: ${Object.keys(
                            current
                        ).join(", ")}`
                    );
                } else {
                    console.warn(
                        `Locale path "${path}" not translated in ${this.locale.localeName} (${this.localeCode}). Using ${this.fallbackLocale.localeName} instead.`
                    );
                    return this._resolveLocalePath(path, true);
                }
            } else {
                // @ts-expect-error I have no idea how to type this :-)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                current = current[part];
            }
        }

        // Check if the final resolved value is a string
        if (typeof current !== "string") {
            throw new TypeError(
                `Invalid locale path: ${path}: value is not a string. Perhaps the path is incomplete.`
            );
        }

        return current;
    }
}
