// top color
const TC_DARK = {
    start: "#101010",
    end: "#212121"
};
const TC_LIGHT = {
    start: "#bbb",
    end: "#f0f0f0"
};

// font color
const FC_DARK = "#eee";
const FC_LIGHT = "#333";

// top buttons color
const TBC_DARK = {
    start: "#222",
    end: "#333"
};

const TBC_LIGHT = {
    start: "#ccc",
    end: "#fff"
};

const TRANSITION_TIME = 0.2;

/**
 * @this {SpessaSynthSettings}
 * @private
 */
export function _toggleDarkMode()
{
    if (this.mode === "dark")
    {
        this.mode = "light";
        this.renderer.drawActiveNotes = false;
    }
    else
    {
        this.renderer.drawActiveNotes = true;
        this.mode = "dark";
        
    }
    this.renderer.toggleDarkMode();
    this.synthui.toggleDarkMode();
    this.sequi.toggleDarkMode();
    this.musicMode.toggleDarkMode();
    
    document.getElementsByClassName("spessasynth_main")[0].classList.toggle("light_mode");
    
    // top part
    document.getElementsByClassName("top_part")[0].classList.toggle("top_part_light");
    
    // settings
    this.mainDiv.classList.toggle("settings_menu_light");
    
    
    // rest
    // things get hacky here: change the global (*) --font-color to black:
    // find the star rule
    const rules = document.styleSheets[0].cssRules;
    for (let rule of rules)
    {
        if (rule.selectorText === "*")
        {
            if (this.mode === "dark")
            {
                // dark mode
                transitionColor(FC_LIGHT, FC_DARK, TRANSITION_TIME, rule, "--font-color");
                
                transitionColor(TBC_LIGHT.start, TBC_DARK.start, TRANSITION_TIME, rule, "--top-buttons-color-start");
                transitionColor(TBC_LIGHT.end, TBC_DARK.end, TRANSITION_TIME, rule, "--top-buttons-color-end");
                
                transitionColor(TC_LIGHT.start, TC_DARK.start, TRANSITION_TIME, rule, "--top-color-start");
                transitionColor(TC_LIGHT.end, TC_DARK.end, TRANSITION_TIME, rule, "--top-color-end");
            }
            else
            {
                // light mode
                transitionColor(FC_DARK, FC_LIGHT, TRANSITION_TIME, rule, "--font-color");
                
                transitionColor(TBC_DARK.start, TBC_LIGHT.start, TRANSITION_TIME, rule, "--top-buttons-color-start");
                transitionColor(TBC_DARK.end, TBC_LIGHT.end, TRANSITION_TIME, rule, "--top-buttons-color-end");
                
                transitionColor(TC_DARK.start, TC_LIGHT.start, TRANSITION_TIME, rule, "--top-color-start");
                transitionColor(TC_DARK.end, TC_LIGHT.end, TRANSITION_TIME, rule, "--top-color-end");
            }
            break;
        }
    }
    document.body.style.background = this.mode === "dark" ? "black" : "white";
}

/**
 * @type {Object<string, number>}
 */
let intervals = {};

/**
 * @param initialColor {string} hex
 * @param targetColor {string} hex
 * @param duration {number}
 * @param propertyName {string}
 * @param cssRule {CSSRule}
 */
function transitionColor(initialColor, targetColor, duration, cssRule, propertyName)
{
    if (intervals[propertyName])
    {
        clearInterval(intervals[propertyName]);
        intervals[propertyName] = undefined;
    }
    
    /**
     * @param hex {string}
     * @return {{r: number, b: number, g: number}}
     */
    function hexToRgb(hex)
    {
        // for stuff like #222
        if (hex.length === 4)
        {
            hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
        }
        const num = parseInt(hex.slice(1), 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }
    
    /**
     * @param start {number}
     * @param end {number}
     * @param progress {number}
     * @return {number}
     */
    function interpolate(start, end, progress)
    {
        return start + ((end - start) * progress);
    }
    
    // Parse initial and target colors
    const startColor = hexToRgb(initialColor);
    const endColor = hexToRgb(targetColor);
    
    const startTime = performance.now() / 1000;
    
    function step()
    {
        const currentTime = performance.now() / 1000;
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        const r = Math.round(interpolate(startColor.r, endColor.r, progress));
        const g = Math.round(interpolate(startColor.g, endColor.g, progress));
        const b = Math.round(interpolate(startColor.b, endColor.b, progress));
        
        cssRule.style.setProperty(propertyName, `rgb(${r}, ${g}, ${b})`);
        
        if (progress >= 1)
        {
            clearInterval(intervals[propertyName]);
            intervals[propertyName] = undefined;
        }
    }
    
    intervals[propertyName] = setInterval(step, 1000 / 60); // 60 FPS should be enough
}