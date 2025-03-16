/**
 * synthui_meter.js
 * purpose: manages a single visualization meter, handles user changing the value if set to do so
 */

import { isMobile } from "../../utils/is_mobile.js";

/**
 * @typedef {Function} MeterCallbackFunction
 * @param clickedValue {number} the value, calculated with min and max values
 */
export class Meter
{
    /**
     * Creates a new meter
     * @param color {string} the color in css
     * @param localePath {string} locale path, will add .title and .description to it
     * @param locale {LocaleManager}
     * @param localeArgs {string|number[]} args for description
     * @param max {number}
     * @param min {number}
     * @param initialAndDefault {number}
     * @param editable {boolean} if the meter should be editable with mouse
     * @param editCallback {MeterCallbackFunction}
     * @param lockCallback {function}
     * @param unlockCallback {function}
     */
    constructor(color = "none",
                localePath,
                locale,
                localeArgs,
                min = 0,
                max = 100,
                initialAndDefault,
                editable = false,
                editCallback = undefined,
                lockCallback = undefined,
                unlockCallback = undefined)
    {
        this.meterText = "";
        locale.bindObjectProperty(this, "meterText", localePath + ".title");
        this.min = min;
        this.max = max;
        this.currentValue = -1;
        this.isShown = true;
        this.isVisualValueSet = true;
        this.isLocked = false;
        this.lockCallback = lockCallback;
        this.unlockCallback = unlockCallback;
        this.defaultValue = initialAndDefault;
        
        /**
         * @type {HTMLDivElement}
         */
        this.div = document.createElement("div");
        this.div.classList.add("voice_meter");
        this.div.classList.add("controller_element");
        if (color !== "none" && color !== "")
        {
            this.div.style.borderColor = color;
        }
        locale.bindObjectProperty(this.div, "title", localePath + ".description", localeArgs);
        
        /**
         * @type {HTMLDivElement}
         */
        this.bar = document.createElement("div");
        this.bar.classList.add("voice_meter_bar");
        this.bar.style.background = color;
        this.div.appendChild(this.bar);
        
        /**
         * @type {HTMLParagraphElement}
         */
        this.text = document.createElement("p");
        this.text.classList.add("voice_meter_text");
        this.div.appendChild(this.text);
        
        this.isActive = false;
        
        if (editable)
        {
            if (editCallback === undefined)
            {
                throw new Error("No editable function given!");
            }
            this.div.onmousedown = e =>
            {
                e.preventDefault();
                if (e.button === 0)
                {
                    // left mouse button: adjust value
                    this.isActive = true;
                }
                else
                {
                    // other, lock it
                    this.lockMeter();
                }
            };
            this.div.onmousemove = e =>
            {
                if (!this.isActive)
                {
                    return;
                }
                const bounds = e.currentTarget.getBoundingClientRect();
                const relativeLeft = bounds.left;
                const width = bounds.width;
                const relative = e.clientX - relativeLeft;
                const percentage = Math.max(0, Math.min(1, relative / width));
                editCallback(percentage * (max - min) + min);
            };
            this.div.onmouseup = () => this.isActive = false;
            this.div.onmouseleave = e =>
            {
                this.div.onmousemove(e);
                this.isActive = false;
            };
            
            // QoL
            this.text.oncontextmenu = e =>
            {
                e.preventDefault();
            };
            
            // add mobile
            this.div.onclick = e =>
            {
                e.preventDefault();
                this.isActive = true;
                this.div.onmousemove(e);
                this.isActive = false;
                if (isMobile)
                {
                    this.lockMeter();
                }
            };
            this.div.classList.add("editable");
        }
        this.update(initialAndDefault);
    }
    
    lockMeter()
    {
        if (this.lockCallback === undefined)
        {
            // no callback, it can't be locked
            return;
        }
        if (this.isLocked)
        {
            this.text.classList.remove("locked_meter");
            this.unlockCallback();
        }
        else
        {
            this.text.classList.add("locked_meter");
            this.lockCallback();
        }
        this.isLocked = !this.isLocked;
    }
    
    toggleMode(updateColor = false)
    {
        if (updateColor)
        {
            this.bar.classList.toggle("voice_meter_light_color");
            this.div.classList.toggle("voice_meter_light_color");
        }
        this.text.classList.toggle("voice_meter_text_light");
    }
    
    show()
    {
        this.isShown = true;
        if (!this.isVisualValueSet)
        {
            const percentage = Math.max(0, Math.min((this.currentValue - this.min) / (this.max - this.min), 1));
            this.bar.style.width = `${percentage * 100}%`;
            this.text.textContent = this.meterText + (Math.round(this.currentValue * 100) / 100).toString();
            this.isVisualValueSet = true;
        }
    }
    
    hide()
    {
        this.isShown = false;
    }
    
    
    /**
     * Updates a given meter to a given value
     * @param value {number}
     * @param force {boolean}
     */
    update(value, force = false)
    {
        if (value === this.currentValue && force === false)
        {
            return;
        }
        this.currentValue = value;
        if (this.isShown)
        {
            const percentage = Math.max(0, Math.min((value - this.min) / (this.max - this.min), 1));
            this.bar.style.width = `${percentage * 100}%`;
            this.text.textContent = this.meterText + (Math.round(value * 100) / 100).toString();
            this.isVisualValueSet = true;
        }
        else
        {
            this.isVisualValueSet = false;
        }
    }
}