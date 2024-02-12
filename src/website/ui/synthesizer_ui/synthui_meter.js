
/**
 * @typedef {Function} MeterCallbackFunction
 * @param clickedValue {number} the value, calculated with min and max values
 */
export class Meter
{
    /**
     * Creates a new meter
     * @param color {string} the color in css
     * @param meterText {string}
     * @param max {number}
     * @param min {number}
     * @param description {string}
     * @param editable {boolean} if the meter should be editable with mouse
     * @param editCallback {MeterCallbackFunction}
     */
    constructor(color = "initial",
                meterText="Voices: ",
                min = 0,
                max = 100,
                description,
                editable=false,
                editCallback = undefined)
    {
        this.meterText = meterText;
        this.min = min;
        this.max = max;
        this.currentValue = -1;
        this.isShown = true;
        this.isVisualValueSet = true;

        /**
         * @type {HTMLDivElement}
         */
        this.div = document.createElement("div");
        this.div.classList.add("voice_meter");
        this.div.classList.add("controller_element");
        this.div.style.border = "1px solid "+ color;
        this.div.title = description;

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

        if(editable)
        {
            if(editCallback === undefined) {
                throw "No editable function given!";
            }
            this.div.onmousedown = () => this.isActive = true;
            this.div.onmousemove = e => {
                if(!this.isActive)
                {
                    return;
                }
                const bounds = e.currentTarget.getBoundingClientRect();
                const relativeLeft = bounds.left;
                const width = bounds.width;
                const relative = e.clientX - relativeLeft;
                const percentage =  Math.max(0, Math.min(1, relative / width));
                editCallback(percentage * (max - min) + min);
            };
            this.div.onmouseup = () => this.isActive = false;
            this.div.onmouseleave = e => {
                this.div.onmousemove(e);
                this.isActive = false;
            }

            // add mobile
            this.div.onclick = e => {
                this.isActive = true;
                this.div.onmousemove(e);
                this.isActive = false;
            }
            this.div.classList.add("editable");
        }
    }

    show()
    {
        this.isShown = true;
        if(!this.isVisualValueSet) {
            const percentage = Math.max(0, Math.min((this.currentValue - this.min) / (this.max - this.min), 1));
            this.bar.style.width = `${percentage * 100}%`;
            this.text.innerText = this.meterText + (Math.round(this.currentValue * 100) / 100).toString();
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
     */
    update(value)
    {
        if(value === this.currentValue)
        {
            return;
        }
        this.currentValue = value;
        if(this.isShown) {
            const percentage = Math.max(0, Math.min((value - this.min) / (this.max - this.min), 1));
            this.bar.style.width = `${percentage * 100}%`;
            this.text.innerText = this.meterText + (Math.round(value * 100) / 100).toString();
            this.isVisualValueSet = true;
        }
        else
        {
            this.isVisualValueSet = false;
        }
    }
}