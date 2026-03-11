/**
 * Synthui_meter.js
 * purpose: manages a single visualization meter, handles user changing the value if set to do so
 */

import { isMobile } from "../../utils/is_mobile.js";
import type { LocaleManager } from "../../locale/locale_manager.ts";

export type MeterCallbackFunction = (clickedValue: number) => unknown;

/**
 * Options for creating a new Meter
 */
export interface MeterOptions {
    /** The color in CSS */
    color?: string;

    /** Locale path, will add .title and .description to it */
    localePath?: string;

    /** Locale manager */
    locale?: LocaleManager;

    /** Can be used instead of locale */
    rawText?: string;

    /** Args for description */
    localeArgs?: (string | number)[];

    /** Minimum value */
    min?: number;

    /** Maximum value */
    max?: number;

    /** Initial value and default value */
    initialAndDefault: number;

    /** If the meter should be editable with mouse */
    editable?: boolean;

    /** Called when the value is edited */
    editCallback?: MeterCallbackFunction;

    /** Called when the meter gets locked */
    lockCallback?: () => unknown;

    /** Called when the meter gets unlocked */
    unlockCallback?: () => unknown;

    /** When the isActive state changes */
    activeChangeCallback?: (isActive: boolean) => unknown;

    /** Transform from the internal value into the displayed value */
    transform?: (value: number) => string;
}

export class Meter {
    public readonly defaultValue;
    public isLocked = true;
    public readonly div: HTMLDivElement;
    public readonly bar: HTMLDivElement;
    public currentValue;
    public max;
    private readonly min;
    private isShown = false;
    private isVisualValueSet = true;
    private isActive = false;
    private readonly lockCallback;
    private readonly unlockCallback;
    private readonly text: HTMLParagraphElement;
    private readonly transform;

    /**
     * Creates a new meter
     * @param color the color in css
     * @param localePath locale path, will add .title and .description to it
     * @param locale
     * @param localeArgs args for description
     * @param rawText can be used instead of locale
     * @param max
     * @param min
     * @param initialAndDefault
     * @param editable if the meter should be editable with mouse
     * @param editCallback
     * @param lockCallback
     * @param unlockCallback
     * @param activeChangeCallback - when the isActive state changes
     * @param transform - transform from the internal value into the displayed value
     */
    public constructor({
        color = "",
        localePath,
        locale,
        localeArgs = [],
        min = 0,
        max = 100,
        initialAndDefault,
        editable = false,
        editCallback,
        lockCallback,
        unlockCallback,
        activeChangeCallback,
        transform,
        rawText = ""
    }: MeterOptions) {
        if (locale) {
            locale.bindObjectProperty(this, "meterText", localePath + ".title");
        } else {
            this._meterText = rawText;
        }
        this.min = min;
        this.max = max;
        this.currentValue = -1;
        this.isShown = true;
        this.isVisualValueSet = true;
        this.isLocked = false;
        this.lockCallback = lockCallback;
        this.unlockCallback = unlockCallback;
        this.transform = transform;
        this.defaultValue = initialAndDefault;

        this.div = document.createElement("div");
        this.div.classList.add("voice_meter", "controller_element");
        if (color !== "none" && color !== "") {
            this.div.style.borderColor = color;
        }
        if (locale) {
            locale.bindObjectProperty(
                this.div,
                "title",
                localePath + ".description",
                localeArgs
            );
        }

        this.bar = document.createElement("div");
        this.bar.classList.add("voice_meter_bar");
        this.bar.style.background = color;
        this.div.append(this.bar);

        this.text = document.createElement("p");
        this.text.classList.add("voice_meter_text");
        this.div.append(this.text);

        if (editable) {
            if (editCallback === undefined) {
                throw new Error("No editable function given!");
            }
            this.div.addEventListener("mousedown", (e) => {
                e.preventDefault();
                if (e.button === 0) {
                    // Left mouse button: adjust value
                    this.isActive = true;
                    if (activeChangeCallback) {
                        activeChangeCallback(true);
                    }
                    const el = e.currentTarget as HTMLElement;
                    const bounds = el.getBoundingClientRect();
                    const relativeLeft = bounds.left;
                    const width = bounds.width;
                    const relative = e.clientX - relativeLeft;
                    const percentage = Math.max(
                        0,
                        Math.min(1, relative / width)
                    );
                    if (!this.isLocked || isMobile) {
                        this.toggleLock();
                    }
                    editCallback(percentage * (max - min) + min);
                } else {
                    // Other, lock it
                    this.toggleLock();
                }
            });
            this.div.addEventListener("mousemove", (e) => {
                if (!this.isActive) {
                    return;
                }
                const el = e.currentTarget as HTMLElement;
                const bounds = el.getBoundingClientRect();
                const relativeLeft = bounds.left;
                const width = bounds.width;
                const relative = e.clientX - relativeLeft;
                const percentage = Math.max(0, Math.min(1, relative / width));
                if (!this.isLocked || isMobile) {
                    this.toggleLock();
                }
                editCallback(percentage * (max - min) + min);
            });
            this.div.addEventListener("mouseup", () => {
                this.isActive = false;
                if (activeChangeCallback) {
                    activeChangeCallback(false);
                }
            });
            this.div.addEventListener("mouseleave", (e) => {
                this.div.onmousemove?.(e);
                this.isActive = false;
                if (activeChangeCallback) {
                    activeChangeCallback(false);
                }
            });

            // QoL
            this.text.addEventListener("contextmenu", (e) => {
                e.preventDefault();
            });

            // Add mobile
            this.div.addEventListener("click", (e) => {
                e.preventDefault();
                this.isActive = true;
                this.div.onmousemove?.(e);
                this.isActive = false;
            });
            this.div.classList.add("editable");
        }
        this.update(initialAndDefault);
    }

    private _meterText = "";

    public get meterText(): string {
        return this._meterText;
    }

    public set meterText(value: string) {
        this._meterText = value;
        this.update(this.currentValue, true);
    }

    public toggleLock() {
        if (this.lockCallback === undefined) {
            // No callback, it can't be locked
            return;
        }
        if (this.isLocked) {
            this.div.classList.remove("locked_meter");
            this.unlockCallback?.();
        } else {
            this.div.classList.add("locked_meter");
            this.lockCallback();
        }
        this.isLocked = !this.isLocked;
    }

    public toggleMode(updateColor = false) {
        if (updateColor) {
            this.bar.classList.toggle("voice_meter_light_color");
            this.div.classList.toggle("voice_meter_light_color");
        }
        this.text.classList.toggle("voice_meter_text_light");
    }

    public show() {
        this.isShown = true;
        if (!this.isVisualValueSet) {
            const percentage = Math.max(
                0,
                Math.min(
                    (this.currentValue - this.min) / (this.max - this.min),
                    1
                )
            );
            this.bar.style.width = `${percentage * 100}%`;
            this.text.textContent =
                this._meterText +
                (Math.round(this.currentValue * 100) / 100).toString();
            this.isVisualValueSet = true;
        }
    }

    public hide() {
        this.isShown = false;
    }

    /**
     * Updates a given meter to a given value
     */
    public update(value: number, force = false) {
        if (value === this.currentValue && !force) {
            return;
        }
        this.currentValue = value;
        if (this.isShown) {
            const percentage = Math.max(
                0,
                Math.min((value - this.min) / (this.max - this.min), 1)
            );
            this.bar.style.width = `${percentage * 100}%`;
            const v = Math.round(value * 100) / 100;
            const transformed = this.transform
                ? this.transform(v)
                : v.toString();
            this.text.textContent = this._meterText + transformed;
            this.isVisualValueSet = true;
        } else {
            this.isVisualValueSet = false;
        }
    }

    public reset() {
        this.update(this.defaultValue, true);
    }
}
