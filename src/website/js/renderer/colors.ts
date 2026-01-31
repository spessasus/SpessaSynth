/**
 * @param progress 0-1
 */
function approxColor(progress: number): string {
    /**
     * The colors may or may not come from audacity's spectogram view
     */
    const samples: { t: number; r: number; g: number; b: number }[] = [
        { t: 0, r: 0, g: 0, b: 0 },
        { t: 0.1, r: 0, g: 0, b: 105 },
        { t: 0.2, r: 0, g: 0, b: 158 },
        { t: 0.3, r: 9, g: 0, b: 160 },
        { t: 0.4, r: 33, g: 0, b: 160 },
        { t: 0.5, r: 62, g: 0, b: 160 },
        { t: 0.55, r: 98, g: 1, b: 158 },
        { t: 0.65, r: 159, g: 37, b: 93 },
        { t: 0.7, r: 192, g: 28, b: 77 },
        { t: 0.75, r: 225, g: 46, b: 56 },
        { t: 0.8, r: 240, g: 143, b: 28 },
        { t: 0.85, r: 255, g: 239, b: 0 },
        { t: 0.9, r: 255, g: 241, b: 8 },
        { t: 0.95, r: 255, g: 253, b: 140 },
        { t: 1, r: 255, g: 255, b: 252 }
    ];

    for (let i = 0; i < samples.length - 1; i++) {
        const s1 = samples[i];
        const s2 = samples[i + 1];
        if (progress >= s1.t && progress <= s2.t) {
            const frac = (progress - s1.t) / (s2.t - s1.t);
            // Linear interpolation, because we love linear interpolation
            const r = Math.round(s1.r + frac * (s2.r - s1.r));
            const g = Math.round(s1.g + frac * (s2.g - s1.g));
            const b = Math.round(s1.b + frac * (s2.b - s1.b));
            return `rgb(${r}, ${g}, ${b})`;
        }
    }
    return "";
}

// Uint8 goes up to 255
const intensityColors: string[] = [];
for (let i = 0; i < 255; i++) {
    intensityColors.push(approxColor(i / 255));
}
export { intensityColors };
