function splitByCurlyBraces(input: string) {
    const result = [];
    let current = "";

    for (const char of input) {
        if (char === "{") {
            if (current) {
                result.push(current);
                current = "";
            }
            current += char;
        } else if (char === "}") {
            current += char;
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }

    if (current) {
        result.push(current);
    }

    return result;
}

function ASSColorToRgba(colorString: string): string {
    const stringSanitized = colorString.slice(2);
    // Note that colors are BGR (not RGB as normally) and the alpha component is inverted,
    // So 255 in completely transparent and 0 is no transparency.
    // Color: &HAABBGGRR
    const colorAlpha = 255 - parseInt(stringSanitized.slice(0, 2), 16);
    const colorBlue = parseInt(stringSanitized.slice(2, 4), 16);
    const colorGreen = parseInt(stringSanitized.slice(4, 6), 16);
    const colorRed = parseInt(stringSanitized.slice(6), 16);
    return `rgba(${colorRed}, ${colorGreen}, ${colorBlue}, ${colorAlpha / 255})`;
}

export class DialogueEvent {
    public text: string[] = [];

    public textClean = "";

    public layer = 0;

    public startSeconds = 0;

    public endSeconds = 0;

    public styleName = "";

    public styleData: Record<string, string> = {};

    public marginLeft = 0;

    public marginRight = 0;

    public marginVertical = 0;

    public element?: HTMLDivElement = undefined;

    public primaryColor;

    public secondaryColor;

    public textChunks: HTMLSpanElement[] = [];

    public constructor(
        text: string,
        startSeconds: number,
        endSeconds: number,
        styleName: string,
        marginLeft: number,
        marginRight: number,
        marginVertical: number,
        styles: Record<string, string>[]
    ) {
        this.text = splitByCurlyBraces(text);
        const textCleanSplit: string[] = [];
        this.text.forEach((t) => {
            if (!t.startsWith("{")) {
                textCleanSplit.push(t);
            }
        });
        this.textClean = textCleanSplit.join("");
        this.startSeconds = startSeconds;
        this.endSeconds = endSeconds;
        this.styleName = styleName;
        const styleData = styles.find((s) => s.Name === this.styleName);
        if (!styleData) {
            throw new Error("No style data!");
        }
        this.styleData = styleData;
        this.marginLeft = marginLeft || parseInt(this.styleData.MarginL);
        this.marginRight = marginRight || parseInt(this.styleData.MarginR);
        this.marginVertical =
            marginVertical || parseInt(this.styleData.MarginV);
        this.primaryColor = ASSColorToRgba(this.styleData.PrimaryColour);
        this.secondaryColor = ASSColorToRgba(this.styleData.SecondaryColour);
    }

    public hide() {
        if (this.element !== undefined) {
            this.element.remove();
        }
        delete this.element;
    }

    public updateHighlights(currentVideoTime: number) {
        // The text is split up into chunks, separated by "{\k<duration in 1/100th of a second>}"
        // Note that the time is not a delay, it's how long the karaoke gets highlighted for before moving onto the next one
        // IE: ["start", "{\k50}", "test", "{\k100"}, "test2"]
        // "start" is instant, test is also instant and "test2" gets highlighted after 0.5 seconds.
        // Then, if something is after test2, it will get highlighted after 1 second.

        let currentDelay = 0;
        let lastKaraokeDuration = 0;
        let currentIndex = 0;
        const timeSinceShown = currentVideoTime - this.startSeconds;
        let isNextSpanAnimated = false;
        let animationDuration = 0;
        for (const chunk of this.text) {
            if (chunk.startsWith("{")) {
                // Check if karaoke tag
                const karaokeAnimation =
                    chunk.startsWith("{\\K") || chunk.startsWith("{\\kf");
                if (!karaokeAnimation && !chunk.startsWith("{\\k")) {
                    continue;
                }
                const duration = parseInt(chunk.slice(3, -1)) / 100;
                if (karaokeAnimation) {
                    animationDuration = duration;
                    isNextSpanAnimated = true;
                } else {
                    currentDelay += duration;
                }
                lastKaraokeDuration = duration;
            } else {
                const span = this.textChunks[currentIndex];
                if (isNextSpanAnimated) {
                    isNextSpanAnimated = false;
                    if (currentDelay > timeSinceShown) {
                        span.style.cssText = "";
                        span.style.backgroundImage = "";
                        span.style.backgroundClip = "";
                        span.style.color = this.secondaryColor;
                    } else {
                        const elapsed = timeSinceShown - currentDelay;
                        // Calculate how much percent needs to be filled
                        const percent = Math.min(
                            100,
                            (elapsed / animationDuration) * 100
                        );
                        // Fill text with color from left to right smoothly
                        span.style.color = "transparent";
                        span.style.backgroundImage = `linear-gradient(90deg, ${this.primaryColor} 50%, ${this.secondaryColor} 50%)`;
                        span.style.backgroundPosition = `${100 - percent}%`;
                        span.style.backgroundSize = "200% 100%";
                        span.style.backgroundClip = "text";
                    }
                    currentDelay += animationDuration;
                } else {
                    // Minus because highlight starts instantly and the next line is delayed
                    span.style.backgroundImage = "";
                    span.style.backgroundClip = "";
                    if (currentDelay - lastKaraokeDuration > timeSinceShown) {
                        span.style.color = this.secondaryColor;
                    } else {
                        span.style.color = this.primaryColor;
                    }
                }
                currentIndex++;
            }
        }
    }

    public show(
        resX: number,
        resY: number,
        parent: HTMLDivElement,
        currentVideoTime: number,
        embeddedFontName: string
    ) {
        if (this.element !== undefined) {
            this.updateHighlights(currentVideoTime);
            return;
        }
        this.element = document.createElement("div");
        this.element.classList.add("ass_renderer_element");
        // Spec: Alignment:
        // This sets how the text is "justified" within the Left/Right onscreen margins, and also the vertical placing.
        // Values may be 1=Left, 2=Centered, 3=Right.
        // Add 4 to the value for a "Toptitle".
        // Add 8 to the value for a "Midtitle".
        // E.g., 5 = left-justified toptitle.
        // Think of numpad and a 3x3 grid
        let alignment = parseInt(this.styleData.Alignment);

        // Alignment override \an<alignment> as the first text chunk or \a<alignment>
        if (this.text[0].startsWith("{\\an")) {
            alignment = parseInt(this.text[0][4]);
        } else if (this.text[0].startsWith("{\\a")) {
            /*
            Legacy \a uses different alignment:
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
            switch (legacyAlignment) {
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

        switch (alignment) {
            case 1:
                // Bottom left
                this.element.style.left = `${marginLeftPercent}%`;
                this.element.style.bottom = `${marginVerticalPercent}%`;
                break;
            case 2:
                // Bottom center
                this.element.style.left = `calc(50% + ${marginLeftPercent}% - ${marginRightPercent}%)`;
                this.element.style.bottom = `${marginVerticalPercent}%`;
                this.element.style.transform = "translateX(-50%)";
                break;
            case 3:
                // Bottom right
                this.element.style.right = `${marginRightPercent}%`;
                this.element.style.bottom = `${marginVerticalPercent}%`;
                break;
            case 4:
                // Middle left
                this.element.style.left = `${marginLeftPercent}%`;
                this.element.style.top = `calc(50% + ${marginVerticalPercent}% - ${marginVerticalPercent}%)`;
                this.element.style.transform = "translateY(-50%)";
                break;
            case 5:
                // Middle center
                this.element.style.left = `calc(50% + ${marginLeftPercent}% - ${marginRightPercent}%)`;
                this.element.style.top = `calc(50% + ${marginVerticalPercent}% - ${marginVerticalPercent}%)`;
                this.element.style.transform = "translate(-50%, -50%)";
                break;
            case 6:
                // Middle right
                this.element.style.right = `${marginRightPercent}%`;
                this.element.style.top = `calc(50% + ${marginVerticalPercent}% - ${marginVerticalPercent}%)`;
                this.element.style.transform = "translateY(-50%)";
                break;
            case 7:
                // Top left
                this.element.style.left = `${marginLeftPercent}%`;
                this.element.style.top = `${marginVerticalPercent}%`;
                break;
            case 8:
                // Top center
                this.element.style.left = `calc(50% + ${marginLeftPercent}% - ${marginRightPercent}%)`;
                this.element.style.top = `${marginVerticalPercent}%`;
                this.element.style.transform = "translateX(-50%)";
                break;
            case 9:
                // Top right
                this.element.style.right = `${marginRightPercent}%`;
                this.element.style.top = `${marginVerticalPercent}%`;
                break;
            default:
                // Default alignment
                this.element.style.left = `${marginLeftPercent}%`;
                this.element.style.bottom = `${marginVerticalPercent}%`;
                break;
        }

        // Apply the style: formats are as follows:
        // Name, Fontname, Fontsize, PrimaryColour, SecondaryColour,
        // OutlineColour, BackColour, Bold, Italic, Underline,
        // StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle,
        // Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
        // Font color
        this.element.style.color = this.secondaryColor;
        this.element.style.zIndex = (this.layer + 99999).toString();
        // Font family and size
        const fontFamily = `${this.styleData.Fontname}, "${embeddedFontName}", sans-serif`;
        let fontSize = this.styleData.Fontsize;
        // Font size override tag ("\fs<font size>")
        if (this.text[0].startsWith("{\\fs")) {
            fontSize = this.text[0].slice(4, -1);
        }
        this.element.style.fontFamily = fontFamily;
        // FontSize. Scale px with resX and resY
        this.element.style.fontSize = `${(parseFloat(fontSize) / resY) * 0.8 * window.screen.height}px`;
        // Bold, italic, underline, strikeout
        if (this.styleData.Bold === "1") {
            this.element.style.fontWeight = "bold";
        }
        if (this.styleData.Italic === "1") {
            this.element.style.fontStyle = "italic";
        }
        if (this.styleData.Underline === "1") {
            this.element.style.textDecoration = "underline";
        }
        if (this.styleData.StrikeOut === "1") {
            this.element.style.textDecoration = "line-through";
        }

        let hasText = false;
        this.textChunks = [];
        for (const chunk of this.text) {
            if (!chunk.startsWith("{")) {
                const span = document.createElement("span");
                const outText = chunk
                    .replaceAll("\\N", "\n")
                    .replaceAll("\\h", " ")
                    .replaceAll("\\n", "\n");
                span.textContent = outText;
                hasText ||= /[a-zA-Z]/.test(outText);
                span.style.color = this.secondaryColor;
                this.element.appendChild(span);
                this.textChunks.push(span);
            }
        }
        if (!hasText) {
            this.element.classList.add("no_bg");
        }

        parent.appendChild(this.element);

        // Update highlights
        this.updateHighlights(currentVideoTime);

        // Force reflow
        void this.element.offsetHeight;

        // Finally, check for colliding subtitles in parent and move down if needed.
        // If there's no space below, move up
        // https://github.com/spessasus/SpessaSynth/issues/181
        const thisRect = this.element.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        let top = thisRect.top;
        const height = thisRect.height;
        for (const subtitle of parent.children) {
            if (subtitle === this.element) {
                continue;
            }
            const subtitleRect = subtitle.getBoundingClientRect();
            const thisBottom = top + height;
            const subBottom = subtitleRect.top + subtitleRect.height;
            // Check for collision
            if (!(subBottom <= top || thisBottom <= subtitleRect.top)) {
                // Check if this.element can fit between parentRect.top and subtitleRect.top
                if (subtitleRect.top - parentRect.top > height) {
                    top -= subtitleRect.height;
                    // Move up
                    this.element.style.top = `${top}px`;
                } else {
                    top += subtitleRect.height;
                    // Move down
                    this.element.style.top = `${top}px`;
                }
            }
        }
    }
}
