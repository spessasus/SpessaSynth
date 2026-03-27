import child_process from "node:child_process";

export function openURL(url: string) {
    try {
        switch (process.platform) {
            case "linux": {
                child_process.exec(`xdg-open ${url}`);
                break;
            }
            case "win32": {
                child_process.exec(`start "" ${url}`);
                break;
            }
            case "darwin": {
                child_process.exec(`open "${url}"`);
                break;
            }
            default: {
                console.warn(
                    "Could not open the browser. Open the link below:"
                );
                console.info(url);
            }
        }
    } catch (error) {
        console.warn("Could not open the browser:", error);
        console.info("Open the link below:");
        console.info(url);
    }
}
