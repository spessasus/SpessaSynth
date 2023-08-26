
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
     * @param editable {boolean} if the meter should be editable with mouse
     * @param editCallback {MeterCallbackFunction}
     */
    constructor(color = "initial",
                meterText="Voices: ",
                min = 0,
                max = 100,
                editable=false,
                editCallback = undefined)
    {
        this.meterText = meterText;
        this.min = min;
        this.max = max;

        /**
         * @type {HTMLDivElement}
         */
        this.div = document.createElement("div");
        this.div.classList.add("voice_meter");
        this.div.classList.add("controller_element");
        this.div.style.border = "1px solid "+ color;

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

        if(editable)
        {
            if(editCallback === undefined) {
                throw "No editable function given!";
            }
            this.div.onclick = e => {
                const bounds = e.currentTarget.getBoundingClientRect();
                const relativeLeft = bounds.left;
                const width = bounds.width;
                const relative = e.clientX - relativeLeft;
                const percentage =  Math.max(0, Math.min(1, relative / width));
                editCallback(percentage * (max - min) + min);
            };
            this.div.classList.add("editable");
        }
    }


    /**
     * Updates a given meter to a given value
     * @param value {number}
     */
    update(value)
    {
        const percentage = Math.max(0, Math.min((value - this.min) / (this.max - this.min), 1));
        this.bar.style.width = `${percentage * 100}%`;
        this.text.innerText = this.meterText + (Math.round(value * 100) / 100).toString();
    }
}