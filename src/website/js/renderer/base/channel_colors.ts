/**
 * The default note colors, used when the theme does not provide any.
 * They are the named colors in the comments, saturated by 1.23.
 */
export const CHANNEL_COLORS = [
    "rgba(255, 92, 57, 1)", // Tomato
    "rgba(255, 163, 0, 1)", // Orange
    "rgba(255, 217, 0, 1)", // Gold
    "rgba(25, 215, 25, 1)", // Limegreen
    "rgba(40, 186, 105, 1)", // Mediumseagreen
    "rgba(0, 136, 0, 1)", // Green
    "rgba(0, 199, 255, 1)", // Deepskyblue
    "rgba(56, 105, 253, 1)", // Royalblue
    "rgba(152, 35, 255, 1)", // Blueviolet
    "rgba(37, 123, 129, 1)", //'rgba(218, 112, 214, 1)', // percussion color
    "rgba(255, 0, 255, 1)", // Magenta
    "rgba(255, 6, 163, 1)", // Deeppink
    "rgba(235, 105, 231, 1)", // Orchid
    "rgba(255, 123, 123, 1)", // Lightcoral
    "rgba(255, 189, 202, 1)", // Pink
    "rgba(255, 255, 0, 1)" // Yellow
];

/**
 * References to the theme's note colors for the interface elements.
 * The renderer reads the actual values from the same variables.
 */
export const CHANNEL_COLOR_VARIABLES = CHANNEL_COLORS.map(
    (_, i) => `var(--note-color-${i})`
);
