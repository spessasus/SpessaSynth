/**
 * Formats the given seconds to nice readable time
 * @param totalSeconds {number} time in seconds
 * @return {{seconds: number, minutes: number, time: string}}
 */
export function formatTime(totalSeconds)
{
    totalSeconds = Math.floor(totalSeconds);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = Math.round(totalSeconds - (minutes * 60));
    return {
        "minutes": minutes,
        "seconds": seconds,
        "time": `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    };
}

/**
 * @param fileName {string}
 * @returns {string}
 */
export function formatTitle(fileName)
{
    return fileName
        .trim()
        .replaceAll(".mid", "")
        .replaceAll(".kar", "")
        .replaceAll(".rmi", "")
        .replaceAll(".xmf", "")
        .replaceAll(".mxmf", "")
        .replaceAll("_", " ")
        .trim();
}

