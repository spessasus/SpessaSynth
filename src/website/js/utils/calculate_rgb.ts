/**
 * Performs the given function on a rgb string and returns a new one
 * @param rgbString the rgb string, ex. "rgb(255, 0, 00)"
 * @param operation the function for calculation
 * @returns
 */
export function calculateRGB(
    rgbString: string,
    operation: (arg0: number) => number
): string {
    const rgbValues = rgbString.replaceAll(/[^\d,]/g, "").split(",");
    return `rgb(${operation(Number.parseInt(rgbValues[0]))}, ${operation(Number.parseInt(rgbValues[1]))}, ${operation(
        Number.parseInt(rgbValues[2])
    )})`;
}

export function RGBAOpacity(rgbString: string, opacity: number) {
    const v = rgbString.replaceAll(/[^\d,]/g, "").split(",");
    return `rgba(${v[0]}, ${v[1]}, ${v[2]}, ${opacity})`;
}
