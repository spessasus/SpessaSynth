package main

import (
	"os"
	"path/filepath"
	"testing"
)

func testEnv(t *testing.T, goos string, vars map[string]string) environment {
	t.Helper()
	return environment{
		goos:    goos,
		getenv:  func(key string) string { return vars[key] },
		exeDir:  t.TempDir(),
		homeDir: "/home/user",
	}
}

func TestDataDirEnvVariableWins(t *testing.T) {
	home := t.TempDir()
	env := testEnv(t, "linux", map[string]string{"SPESSASYNTH_HOME": home})
	// Even with a portable folder next to the executable
	if err := os.Mkdir(filepath.Join(env.exeDir, "data"), 0o755); err != nil {
		t.Fatal(err)
	}
	got, err := resolveDataDir(env)
	if err != nil {
		t.Fatal(err)
	}
	if got != home {
		t.Errorf("got %q, want %q", got, home)
	}
}

func TestDataDirRelativeEnvVariableIsMadeAbsolute(t *testing.T) {
	env := testEnv(t, "linux", map[string]string{"SPESSASYNTH_HOME": "relative/dir"})
	got, err := resolveDataDir(env)
	if err != nil {
		t.Fatal(err)
	}
	if !filepath.IsAbs(got) {
		t.Errorf("got %q, want an absolute path", got)
	}
}

func TestDataDirPortableFolder(t *testing.T) {
	env := testEnv(t, "linux", nil)
	portable := filepath.Join(env.exeDir, "data")
	if err := os.Mkdir(portable, 0o755); err != nil {
		t.Fatal(err)
	}
	got, err := resolveDataDir(env)
	if err != nil {
		t.Fatal(err)
	}
	if got != portable {
		t.Errorf("got %q, want %q", got, portable)
	}
}

func TestDataDirPortableFileIsIgnored(t *testing.T) {
	env := testEnv(t, "linux", nil)
	if err := os.WriteFile(filepath.Join(env.exeDir, "data"), nil, 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := resolveDataDir(env)
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join("/home/user", ".local", "share", "SpessaSynth")
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestDataDirLinuxDefault(t *testing.T) {
	got, err := resolveDataDir(testEnv(t, "linux", nil))
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join("/home/user", ".local", "share", "SpessaSynth")
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestDataDirLinuxXDG(t *testing.T) {
	got, err := resolveDataDir(testEnv(t, "linux", map[string]string{"XDG_DATA_HOME": "/xdg/data"}))
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join("/xdg/data", "SpessaSynth")
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestDataDirLinuxRelativeXDGIsIgnored(t *testing.T) {
	// The XDG spec says relative paths are invalid and must be ignored
	got, err := resolveDataDir(testEnv(t, "linux", map[string]string{"XDG_DATA_HOME": "xdg/data"}))
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join("/home/user", ".local", "share", "SpessaSynth")
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestDataDirWindowsLocalAppData(t *testing.T) {
	got, err := resolveDataDir(testEnv(t, "windows", map[string]string{"LOCALAPPDATA": "/appdata/local"}))
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join("/appdata/local", "SpessaSynth")
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestDataDirWindowsWithoutLocalAppData(t *testing.T) {
	got, err := resolveDataDir(testEnv(t, "windows", nil))
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join("/home/user", "AppData", "Local", "SpessaSynth")
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestDataDirNoHome(t *testing.T) {
	env := testEnv(t, "linux", nil)
	env.homeDir = ""
	if _, err := resolveDataDir(env); err == nil {
		t.Error("expected an error without a home directory")
	}
}

func TestEnsureDataDirsCreatesFolders(t *testing.T) {
	root := filepath.Join(t.TempDir(), "nested", "SpessaSynth")
	paths, err := ensureDataDirs(root)
	if err != nil {
		t.Fatal(err)
	}
	for _, dir := range []string{paths.root, paths.soundBanks, paths.logs} {
		info, err := os.Stat(dir)
		if err != nil || !info.IsDir() {
			t.Errorf("%q was not created as a directory", dir)
		}
	}
	if paths.config != filepath.Join(root, "config.json") {
		t.Errorf("unexpected config path %q", paths.config)
	}
	if paths.soundBanks != filepath.Join(root, "soundfonts") {
		t.Errorf("unexpected sound bank path %q", paths.soundBanks)
	}
	// Running again on existing folders is fine
	if _, err := ensureDataDirs(root); err != nil {
		t.Errorf("second run failed: %v", err)
	}
}
