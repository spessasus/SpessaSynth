/**
 * Formats the given seconds to nice readable time
 * @param totalSeconds Time in seconds
 */
export function formatTime(totalSeconds: number): {
    seconds: number;
    minutes: number;
    time: string;
} {
    totalSeconds = Math.floor(totalSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds - minutes * 60);
    return {
        minutes: minutes,
        seconds: seconds,
        time: `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    };
}

export function formatTitle(fileName: string): string {
    const extensions = [
        ".midi",
        ".smf",
        ".mid",
        ".kar",
        ".rmi",
        ".xmf",
        ".mxmf"
    ];

    // Loop through extensions and remove them, case-insensitive
    extensions.forEach((ext) => {
        if (fileName.toLowerCase().endsWith(ext)) {
            fileName = fileName.substring(0, fileName.length - ext.length);
        }
    });

    // Replace underscores with spaces
    fileName = fileName.replace(/_/g, " ").trim();

    return fileName;
}
