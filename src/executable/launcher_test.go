package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
)

func TestDesktopExecQuoting(t *testing.T) {
	cases := map[string]string{
		"/opt/SpessaSynth":                 `"/opt/SpessaSynth"`,
		"/home/a b/SpessaSynth":            `"/home/a b/SpessaSynth"`,
		`/home/x"y/S`:                      `"/home/x\\"y/S"`,
		"/home/$HOME/S":                    `"/home/\\$HOME/S"`,
		"/home/100%/S":                     `"/home/100%%/S"`,
		`/home/back\slash/S`:               `"/home/back\\\\slash/S"`,
		"/home/tick`/S":                    "\"/home/tick\\\\`/S\"",
		"/home/user/Downloads/SpessaSynth": `"/home/user/Downloads/SpessaSynth"`,
	}
	for in, want := range cases {
		if got := desktopExec(in); got != want {
			t.Errorf("desktopExec(%q) = %s, want %s", in, got, want)
		}
	}
}

func TestLauncherPaths(t *testing.T) {
	env := testEnv(t, "linux", nil)
	p, err := linuxLauncherPaths(env, "/data", "/opt/S")
	if err != nil {
		t.Fatal(err)
	}
	if p.desktopFile != filepath.Join("/home/user", ".local", "share", "applications", "spessasynth.desktop") {
		t.Errorf("unexpected desktop file %q", p.desktopFile)
	}
	if p.icon != filepath.Join("/data", "spessasynth.png") {
		t.Errorf("unexpected icon %q", p.icon)
	}
	p, err = linuxLauncherPaths(testEnv(t, "linux", map[string]string{"XDG_DATA_HOME": "/xdg"}), "/data", "/opt/S")
	if err != nil {
		t.Fatal(err)
	}
	if p.desktopFile != filepath.Join("/xdg", "applications", "spessasynth.desktop") {
		t.Errorf("XDG_DATA_HOME ignored: %q", p.desktopFile)
	}
}

func TestInstallLauncher(t *testing.T) {
	dir := t.TempDir()
	p := launcherPaths{
		desktopFile: filepath.Join(dir, "share", "applications", "spessasynth.desktop"),
		icon:        filepath.Join(dir, "data", "spessasynth.png"),
		exe:         "/opt/Spessa Synth/SpessaSynth",
	}
	web := fstest.MapFS{"spessasynth_logo.png": {Data: []byte("png")}}
	if err := installLauncher(p, web); err != nil {
		t.Fatal(err)
	}
	entry, err := os.ReadFile(p.desktopFile)
	if err != nil {
		t.Fatal(err)
	}
	text := string(entry)
	for _, want := range []string{"[Desktop Entry]\n", "Type=Application\n", `Exec="/opt/Spessa Synth/SpessaSynth"`, "Icon=" + p.icon + "\n", "Terminal=false\n"} {
		if !strings.Contains(text, want) {
			t.Errorf("entry is missing %q:\n%s", want, text)
		}
	}
	if icon, err := os.ReadFile(p.icon); err != nil || string(icon) != "png" {
		t.Errorf("icon not written: %v", err)
	}

	// Without an embedded icon the entry is still written, just without Icon
	p.desktopFile = filepath.Join(dir, "other.desktop")
	if err := installLauncher(p, fstest.MapFS{}); err != nil {
		t.Fatal(err)
	}
	entry, _ = os.ReadFile(p.desktopFile)
	if strings.Contains(string(entry), "Icon=") {
		t.Errorf("unexpected icon line:\n%s", entry)
	}
}
