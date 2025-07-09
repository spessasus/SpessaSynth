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
    const extensions = [
        ".midi", ".smf", ".mid", ".kar",
        ".rmi", ".xmf", ".mxmf"
    ];
    
    // loop through extensions and remove them, case-insensitive
    extensions.forEach(ext =>
    {
        const regex = new RegExp(`${ext}$`, "i");
        fileName = fileName.replace(regex, "");
    });
    
    // replace underscores with spaces
    fileName = fileName.replace(/_/g, " ").trim();
    
    return fileName;
}


