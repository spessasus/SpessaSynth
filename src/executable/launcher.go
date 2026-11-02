package main

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// Where the Linux applications menu entry and its icon go
type launcherPaths struct {
	desktopFile string
	icon        string
	exe         string
}

func linuxLauncherPaths(env environment, dataDir, exe string) (launcherPaths, error) {
	base := env.getenv("XDG_DATA_HOME")
	if base == "" || !filepath.IsAbs(base) {
		if env.homeDir == "" {
			return launcherPaths{}, errors.New("could not find the home directory")
		}
		base = filepath.Join(env.homeDir, ".local", "share")
	}
	return launcherPaths{
		desktopFile: filepath.Join(base, "applications", "spessasynth.desktop"),
		icon:        filepath.Join(dataDir, "spessasynth.png"),
		exe:         exe,
	}, nil
}

// Quotes the executable path for the Exec key. The desktop entry spec
// unescapes the value as a string first, then applies the quoting rules,
// so backslashes are escaped twice.
func desktopExec(path string) string {
	quoted := strings.NewReplacer(`\`, `\\`, `"`, `\"`, "`", "\\`", `$`, `\$`).Replace(path)
	quoted = `"` + quoted + `"`
	return strings.NewReplacer(`\`, `\\`, `%`, `%%`).Replace(quoted)
}

// Plain string values only need backslashes and line breaks escaped
func desktopString(value string) string {
	return strings.NewReplacer(`\`, `\\`, "\n", `\n`, "\r", `\r`, "\t", `\t`).Replace(value)
}

func desktopEntry(p launcherPaths, withIcon bool) string {
	var b strings.Builder
	b.WriteString("[Desktop Entry]\n")
	b.WriteString("Type=Application\n")
	b.WriteString("Name=SpessaSynth\n")
	b.WriteString("Comment=SoundFont2/DLS MIDI player and synthesizer\n")
	b.WriteString("Exec=" + desktopExec(p.exe) + "\n")
	if withIcon {
		b.WriteString("Icon=" + desktopString(p.icon) + "\n")
	}
	// The server logs to the data folder, no terminal needed
	b.WriteString("Terminal=false\n")
	b.WriteString("Categories=AudioVideo;Audio;Midi;Player;\n")
	return b.String()
}

// Writes the menu entry. The icon comes from the embedded web files and is
// skipped when the build did not include it.
func installLauncher(p launcherPaths, web fs.FS) error {
	withIcon := false
	if icon, err := fs.ReadFile(web, "spessasynth_logo.png"); err == nil {
		if err := os.MkdirAll(filepath.Dir(p.icon), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(p.icon, icon, 0o644); err != nil {
			return err
		}
		withIcon = true
	}
	if err := os.MkdirAll(filepath.Dir(p.desktopFile), 0o755); err != nil {
		return err
	}
	return os.WriteFile(p.desktopFile, []byte(desktopEntry(p, withIcon)), 0o644)
}
