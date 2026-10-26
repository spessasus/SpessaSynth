/**
 * The default note colors, used when the theme does not provide any.
 */
export const CHANNEL_COLORS = [
    "rgba(255, 99, 71, 1)", // Tomato
    "rgba(255, 165, 0, 1)", // Orange
    "rgba(255, 215, 0, 1)", // Gold
    "rgba(50, 205, 50, 1)", // Limegreen
    "rgba(60, 179, 113, 1)", // Mediumseagreen
    "rgba(0, 128, 0, 1)", // Green
    "rgba(0, 191, 255, 1)", // Deepskyblue
    "rgba(65, 105, 225, 1)", // Royalblue
    "rgba(138, 43, 226, 1)", // Blueviolet
    "rgba(50, 120, 125, 1)", //'rgba(218, 112, 214, 1)', // percussion color
    "rgba(255, 0, 255, 1)", // Magenta
    "rgba(255, 20, 147, 1)", // Deeppink
    "rgba(218, 112, 214, 1)", // Orchid
    "rgba(240, 128, 128, 1)", // Lightcoral
    "rgba(255, 192, 203, 1)", // Pink
    "rgba(255, 255, 0, 1)" // Yellow
];

/**
 * References to the theme's note colors for the interface elements.
 * The renderer reads the actual values from the same variables.
 */
export const CHANNEL_COLOR_VARIABLES = CHANNEL_COLORS.map(
    (_, i) => `var(--note-color-${i})`
);
