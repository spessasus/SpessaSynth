function splitByCurlyBraces(input)
{
    const result = [];
    let current = "";
    let insideBraces = false;
    
    for (let i = 0; i < input.length; i++)
    {
        const char = input[i];
        
        if (char === "{")
        {
            if (current)
            {
                result.push(current);
                current = "";
            }
            insideBraces = true;
            current += char;
        }
        else if (char === "}")
        {
            current += char;
            result.push(current);
            current = "";
            insideBraces = false;
        }
        else
        {
            current += char;
        }
    }
    
    if (current)
    {
        result.push(current);
    }
    
    return result;
}

/**
 * @param colorString {string}
 * @returns {string}
 */
function ASSColorToRgba(colorString)
{
    const stringSanitized = colorString.slice(2);
    // Note that colors are BGR (not RGB as normally) and the alpha component is inverted,
    // so 255 in completely transparent and 0 is no transparency.
    // color: &HAABBGGRR
    const colorAlpha = 255 - parseInt(stringSanitized.slice(0, 2), 16);
    const colorBlue = parseInt(stringSanitized.slice(2, 4), 16);
    const colorGreen = parseInt(stringSanitized.slice(4, 6), 16);
    const colorRed = parseInt(stringSanitized.slice(6), 16);
    return `rgba(${colorRed}, ${colorGreen}, ${colorBlue}, ${colorAlpha / 255})`;
}

export class DialogueEvent
{
    /**
     * @type {string[]}
     */
    text = [];
    
    /**
     * @type {string}
     */
    textClean = "";
    
    /**
     * @type {number}
     */
    layer = 0;
    
    /**
     * @type {number}
     */
    startSeconds = 0;
    
    /**
     * @type {number}
     */
    endSeconds = 0;
    
    /**
     * @type {string}
     */
    styleName = "";
    
    /**
     * @type {Object<string, string>}
     */
    styleData = {};
    
    /**
     * @type {number}
     */
    marginLeft = 0;
    
    /**
     * @type {number}
     */
    marginRight = 0;
    
    /**
     * @type {number}
     */
    marginVertical = 0;
    
    /**
     * @type {?HTMLDivElement}
     */
    element = undefined;
    
    /**
     * @type {string}
     */
    primaryColor;
    
    /**
     * @type {string}
     */
    secondaryColor;
    
    
    /**
     * @param text {string}
     * @param layer {number}
     * @param startSeconds {number}
     * @param endSeconds {number}
     * @param styleName {string}
     * @param marginLeft {number}
     * @param marginRight {number}
     * @param marginVertical {number}
     * @param styles {Object<string, string>[]}
     */
    constructor(text, layer, startSeconds, endSeconds, styleName, marginLeft, marginRight, marginVertical, styles)
    {
        this.text = splitByCurlyBraces(text);
        const textCleanSplit = [];
        this.text.forEach(t =>
        {
            if (!t.startsWith("{"))
            {
                textCleanSplit.push(t);
            }
        });
        this.textClean = textCleanSplit.join("");
        this.startSeconds = startSeconds;
        this.endSeconds = endSeconds;
        this.styleName = styleName;
        this.styleData = styles.find(s => s["Name"] === this.styleName);
        this.marginLeft = marginLeft || parseInt(this.styleData["MarginL"]);
        this.marginRight = marginRight || parseInt(this.styleData["MarginR"]);
        this.marginVertical = marginVertical || parseInt(this.styleData["MarginV"]);
        this.primaryColor = ASSColorToRgba(this.styleData["PrimaryColour"]);
        this.secondaryColor = ASSColorToRgba(this.styleData["SecondaryColour"]);
    }
    
    hide()
    {
        if (this.element !== undefined)
        {
            this.element.remove();
        }
        this.element = undefined;
    }
    
    /**
     * @param currentVideoTime {number}
     */
    updateHighlights(currentVideoTime)
    {
        let currentDelay = 0;
        let currentIndex = 0;
        const timeSinceShown = currentVideoTime - this.startSeconds;
        let isNextSpanAnimated = false;
        let animationDuration = 0;
        for (const chunk of this.text)
        {
            if (chunk.startsWith("{"))
            {
                // check if karakoe tag
                const karaokeAnimation = chunk.startsWith("{\\K");
                if (!karaokeAnimation && !chunk.startsWith("{\\k"))
                {
                    continue;
                }
                const duration = parseInt(chunk.slice(3, -1)) / 100;
                if (karaokeAnimation)
                {
                    animationDuration = duration;
                    isNextSpanAnimated = true;
                }
                else
                {
                    currentDelay += duration;
                }
            }
            else
            {
                const span = this.textChunks[currentIndex];
                if (isNextSpanAnimated)
                {
                    isNextSpanAnimated = false;
                    if (currentDelay > timeSinceShown)
                    {
                        span.style.backgroundImage = "";
                        span.style.backgroundClip = "";
                        span.style.color = this.secondaryColor;
                        currentDelay += animationDuration;
                        continue;
                    }
                    const elapsed = timeSinceShown - currentDelay;
                    // calculate how much percent needs to be filled
                    const percent = Math.min(100, (elapsed / animationDuration) * 100);
                    // fill text with color from left to right smoothly
                    span.style.color = "transparent";
                    span.style.backgroundImage = `linear-gradient(90deg, ${this.primaryColor} 50%, ${this.secondaryColor} 50%)`;
                    span.style.backgroundPosition = `${100 - percent}%`;
                    span.style.backgroundSize = "200% 100%";
                    span.style.backgroundClip = "text";
                    currentDelay += animationDuration;
                }
                else
                {
                    if (currentDelay > timeSinceShown)
                    {
                        span.style.color = this.secondaryColor;
                    }
                    else
                    {
                        span.style.color = this.primaryColor;
                    }
                }
                currentIndex++;
            }
        }
    }
    
    /**
     * @param resX {number}
     * @param resY {number}
     * @param parent {HTMLDivElement}
     * @param currentVideoTime {number}
     */
    show(resX, resY, parent, currentVideoTime)
    {
        if (this.element !== undefined)
        {
            this.updateHighlights(currentVideoTime);
            return;
        }
        this.element = document.createElement("div");
        this.element.classList.add("ass_renderer_element");
        // spec: Alignment:
        // This sets how text is "justified" within the Left/Right onscreen margins, and also the vertical placing.
        // Values may be 1=Left, 2=Centered, 3=Right.
        // Add 4 to the value for a "Toptitle".
        // Add 8 to the value for a "Midtitle".
        // eg. 5 = left-justified toptitle.
        // Think of numpad and a 3x3 grid
        let alignment = parseInt(this.styleData["Alignment"]);
        
        // alignment override \an<alignment> as the first text chunk or \a<alignment>
        if (this.text[0].startsWith("{\\an"))
        {
            alignment = parseInt(this.text[0][4]);
        }
        else if (this.text[0].startsWith("{\\a"))
        {
            /*
            legacy \a uses different alignment:
            1: Bottom left
            2: Bottom center
            3: Bottom right
            5: Top left
            6: Top center
            7: Top right
            9: Middle left
            10: Middle center
            11: Middle right
            translate to an:
             */
            const legacyAlignment = parseInt(this.text[0][3]);
            switch (legacyAlignment)
            {
                case 1:
                    alignment = 1;
                    break;
                case 2:
                    alignment = 2;
                    break;
                case 3:
                    alignment = 3;
                    break;
                case 5:
                    alignment = 7;
                    break;
                case 6:
                    alignment = 8;
                    break;
                case 7:
                    alignment = 9;
                    break;
                case 9:
                    alignment = 4;
                    break;
                case 10:
                    alignment = 5;
                    break;
                case 11:
                    alignment = 6;
                    break;
                default:
                    alignment = 5;
                    break;
            }
        }
        
        const marginLeftPercent = (this.marginLeft / resX) * 100;
        const marginRightPercent = (this.marginRight / resX) * 100;
        const marginVerticalPercent = (this.marginVertical / resY) * 100;
        
        switch (alignment)
        {
            case 1:
                // bottom left
                this.element.style.left = `${marginLeftPercent}%`;
                this.element.style.bottom = `${marginVerticalPercent}%`;
                break;
            case 2:
                // bottom center
                this.element.style.left = `calc(50% + ${marginLeftPercent}% - ${marginRightPercent}%)`;
                this.element.style.bottom = `${marginVerticalPercent}%`;
                this.element.style.transform = "translateX(-50%)";
                break;
            case 3:
                // bottom right
                this.element.style.right = `${marginRightPercent}%`;
                this.element.style.bottom = `${marginVerticalPercent}%`;
                break;
            case 4:
                // middle left
                this.element.style.left = `${marginLeftPercent}%`;
                this.element.style.top = `calc(50% + ${marginVerticalPercent}% - ${marginVerticalPercent}%)`;
                this.element.style.transform = "translateY(-50%)";
                break;
            case 5:
                // middle center
                this.element.style.left = `calc(50% + ${marginLeftPercent}% - ${marginRightPercent}%)`;
                this.element.style.top = `calc(50% + ${marginVerticalPercent}% - ${marginVerticalPercent}%)`;
                this.element.style.transform = "translate(-50%, -50%)";
                break;
            case 6:
                // middle right
                this.element.style.right = `${marginRightPercent}%`;
                this.element.style.top = `calc(50% + ${marginVerticalPercent}% - ${marginVerticalPercent}%)`;
                this.element.style.transform = "translateY(-50%)";
                break;
            case 7:
                // top left
                this.element.style.left = `${marginLeftPercent}%`;
                this.element.style.top = `${marginVerticalPercent}%`;
                break;
            case 8:
                // top center
                this.element.style.left = `calc(50% + ${marginLeftPercent}% - ${marginRightPercent}%)`;
                this.element.style.top = `${marginVerticalPercent}%`;
                this.element.style.transform = "translateX(-50%)";
                break;
            case 9:
                // top right
                this.element.style.right = `${marginRightPercent}%`;
                this.element.style.top = `${marginVerticalPercent}%`;
                break;
            default:
                // default alignment
                this.element.style.left = `${marginLeftPercent}%`;
                this.element.style.bottom = `${marginVerticalPercent}%`;
                break;
        }
        
        // apply the style: formats are as follows:
        // Name, Fontname, Fontsize, PrimaryColour, SecondaryColour,
        // OutlineColour, BackColour, Bold, Italic, Underline,
        // StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle,
        // Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
        // font color
        this.element.style.color = this.styleData["PrimaryColour"];
        this.element.style.zIndex = (this.layer + 99999).toString();
        // font family and size
        const fontFamily = this.styleData["Fontname"];
        let fontSize = this.styleData["Fontsize"];
        // font size override tag ("\fs<font size>")
        if (this.text[0].startsWith("{\\fs"))
        {
            fontSize = this.text[0].slice(4, -1);
        }
        this.element.style.fontFamily = fontFamily;
        // fontSize. Scale px with resX and resY
        this.element.style.fontSize = `${(parseFloat(fontSize) / resY) * 0.8 * window.screen.height}px`;
        // bold, italic, underline, strikeout
        if (this.styleData["Bold"] === "1")
        {
            this.element.style.fontWeight = "bold";
        }
        if (this.styleData["Italic"] === "1")
        {
            this.element.style.fontStyle = "italic";
        }
        if (this.styleData["Underline"] === "1")
        {
            this.element.style.textDecoration = "underline";
        }
        if (this.styleData["StrikeOut"] === "1")
        {
            this.element.style.textDecoration = "line-through";
        }
        
        // the text is split up into chunks, separated by "{\k<duration in 1/100th of a second>}"
        // IE: ["test", "{/k100"}, "test2"]
        // "test" gets highlighted instantly while "test2" gets highlighted after 1 second after the element is shown.
        // the highlighted text uses primary while the regular one uses secondary.
        
        // add the chunks
        let currentDelay = 0;
        /**
         * @type {HTMLSpanElement[]}
         */
        this.textChunks = [];
        const timeSinceShown = currentVideoTime - this.startSeconds;
        for (const chunk of this.text)
        {
            if (chunk.startsWith("{"))
            {
                const duration = parseInt(chunk.slice(3, -1)) / 100;
                currentDelay += duration;
            }
            else
            {
                const span = document.createElement("span");
                span.textContent = chunk.replace("\\N", "\n");
                if (currentDelay > timeSinceShown)
                {
                    span.style.color = this.secondaryColor;
                }
                else
                {
                    span.style.color = this.primaryColor;
                }
                this.element.appendChild(span);
                this.textChunks.push(span);
            }
        }
        
        parent.appendChild(this.element);
    }
}