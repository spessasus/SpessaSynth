// Strings for features of the standalone executable
export const localEditionLocale = {
    serverStopped: {
        title: "SpessaSynth stopped",
        message:
            "SpessaSynth was closed, so this page can no longer reach it. Start SpessaSynth again and this page reconnects by itself."
    },

    emptyFolder: {
        title: "No sound banks yet",
        message:
            "SpessaSynth needs a sound bank to make sound. Download the free GeneralUser GS bank, or put your own SF2, SF3, SF4 or DLS files into the sound bank folder.",
        download: {
            title: "Download GeneralUser GS",
            description: "Download the default sound bank (about 8 MB)"
        },
        haveOwn: {
            title: "I have my own",
            description: "Open the sound bank folder to add your own files"
        },
        refresh: {
            title: "Refresh",
            description: "Check the sound bank folder again"
        },
        downloading: "Downloading GeneralUser GS... {0}%",
        failed: "The download failed: {0}",
        retry: {
            title: "Retry",
            description: "Try the download again"
        }
    },

    update: {
        title: "Update available",
        message: "SpessaSynth {0} is available. You have {1}.",
        install: {
            title: "Update now",
            description: "Download the new version and restart SpessaSynth"
        },
        later: {
            title: "Later",
            description: "Ask again the next time SpessaSynth starts"
        },
        downloadPage: {
            title: "Open the download page",
            description: "Download the new version from the website"
        },
        notWritable:
            "SpessaSynth cannot replace itself in its current folder. Download the new version from the website instead.",
        downloading: "Downloading SpessaSynth {0}... {1}%",
        restarting: "Restarting SpessaSynth {0}...",
        failed: "The update failed: {0}"
    },

    soundBankFolder: {
        button: "Sound bank folder",
        title: "Sound bank folder",
        message:
            "Put SF2, SF3, SF4 or DLS files into the sound bank folder, then refresh the list.",
        open: {
            title: "Open the folder",
            description: "Show the sound bank folder in the file manager"
        },
        refresh: {
            title: "Refresh the list",
            description: "Reload the list of sound banks"
        },
        launcher: {
            title: "Add to the applications menu",
            description: "Create a SpessaSynth entry in your applications menu"
        },
        launcherAdded: "SpessaSynth was added to the applications menu.",
        failed: "That did not work: {0}"
    }
};
