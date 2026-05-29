/**
 * Synthui_meter.js
 * purpose: manages a single visualization meter, handles user changing the value if set to do so
 */

import { isMobile } from "../../utils/is_mobile.js";
import type { LocaleManager } from "../../manager/locale_manager.ts";

export type MeterCallbackFunction = (
    clickedValue: number,
    meter: Meter
) => unknown;

/**
 * Options for creating a new Meter
 */
export interface MeterOptions {
    /** The color in CSS */
    color: string;

    /** If the smooth glide class should be added */
    smooth?: boolean;

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
    def: number;

    /** Called when the value is edited */
    onEdit?: MeterCallbackFunction;

    /** Called when the meter gets locked or unlocked */
    onLock?: (isLocked: boolean) => unknown;

    /** When the isActive state changes */
    activeChangeCallback?: (isActive: boolean) => unknown;

    /** Transform from the internal value into the displayed value */
    transform?: (value: number) => string;
}

interface CurrentMeter {
    m: Meter;
    rect: DOMRect;
    activeChange?: (isActive: boolean) => unknown;
    onEdit: MeterCallbackFunction;
    max: number;
    min: number;
}

if (!isMobile) {
    document.addEventListener("pointerleave", () => {
        Meter.currentMeter?.activeChange?.(false);
        Meter.currentMeter = undefined;
    });
    document.addEventListener("pointerup", () => {
        Meter.currentMeter?.activeChange?.(false);
        Meter.currentMeter = undefined;
    });

    document.addEventListener("pointermove", (e) => {
        if (!Meter.currentMeter) {
            return;
        }
        const current = Meter.currentMeter;
        const relativeLeft = current.rect.left;
        const width = current.rect.width;
        const relative = e.clientX - relativeLeft;
        const percentage = Math.max(0, Math.min(1, relative / width));
        current.onEdit(
            percentage * (current.max - current.min) + current.min,
            current.m
        );
        if (!current.m.isLocked) {
            current.m.toggleLock();
        }
    });
}

export class Meter {
    // Global tracking
    public static currentMeter?: CurrentMeter;
    public readonly defaultValue;
    public isLocked = true;
    public readonly div: HTMLDivElement;
    public readonly bar: HTMLDivElement;
    public currentValue;
    public max;
    private readonly min;
    private isShown = false;
    private isVisualValueSet = true;
    private readonly onLock;
    private readonly text: HTMLParagraphElement;
    private readonly transform;

    /**
     * Creates a new meter
     * @param color the color in css
     * @param smooth
     * @param localePath locale path, will add .title and .description to it
     * @param locale
     * @param localeArgs args for description
     * @param rawText can be used instead of locale
     * @param max
     * @param min
     * @param initialAndDefault
     * @param onEdit
     * @param onLock
     * @param activeChangeCallback - when the isActive state changes
     * @param transform - transform from the internal value into the displayed value
     */
    public constructor({
        color,
        smooth,
        localePath,
        locale,
        localeArgs = [],
        min = 0,
        max = 100,
        def,
        onEdit,
        onLock,
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
        this.onLock = onLock;
        this.transform = transform;
        this.defaultValue = def;

        this.div = document.createElement("div");
        this.div.classList.add("voice_meter", "controller_element");
        if (color !== "none" && color !== "") {
            this.div.style.borderColor = color;
        } else {
            this.div.classList.add("default_color");
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
        if (smooth) {
            this.bar.classList.add("voice_meter_bar_smooth");
        }
        this.bar.style.background = color;
        this.div.append(this.bar);

        this.text = document.createElement("p");
        this.text.classList.add("voice_meter_text");
        this.div.append(this.text);

        if (onEdit) {
            // Add mobile
            if (isMobile) {
                this.div.addEventListener("click", (e) => {
                    e.preventDefault();
                    const rect = this.div.getBoundingClientRect();
                    const relativeLeft = rect.left;
                    const width = rect.width;
                    const relative = e.clientX - relativeLeft;
                    const percentage = Math.max(
                        0,
                        Math.min(1, relative / width)
                    );
                    onEdit(percentage * (max - min) + min, this);
                    this.toggleLock();
                });
            } else {
                this.div.addEventListener("pointerdown", (e) => {
                    e.preventDefault();
                    if (e.button === 0) {
                        if (Meter.currentMeter) {
                            return;
                        }
                        const rect = this.div.getBoundingClientRect();
                        activeChangeCallback?.(true);
                        Meter.currentMeter = {
                            m: this,
                            rect,
                            onEdit,
                            activeChange: activeChangeCallback,
                            min,
                            max
                        };
                        const relativeLeft = rect.left;
                        const width = rect.width;
                        const relative = e.clientX - relativeLeft;
                        const percentage = Math.max(
                            0,
                            Math.min(1, relative / width)
                        );
                        onEdit(percentage * (max - min) + min, this);
                        if (!Meter.currentMeter.m.isLocked) {
                            Meter.currentMeter.m.toggleLock();
                        }
                    } else {
                        // Other, lock it
                        this.toggleLock();
                    }
                });
            }
            // QoL
            this.text.addEventListener("contextmenu", (e) => {
                e.preventDefault();
            });

            this.div.classList.add("editable");
        }
        this.update(def);
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
        if (this.onLock === undefined) {
            // No callback, it can't be locked
            return;
        }
        this.div.classList.toggle("locked_meter", !this.isLocked);
        this.isLocked = !this.isLocked;
        this.onLock(this.isLocked);
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
            const v = Math.round(this.currentValue * 100) / 100;
            const transformed = this.transform
                ? this.transform(v)
                : v.toString();
            this.text.textContent = this._meterText + transformed;
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
