package main

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
)

const appFolderName = "SpessaSynth"

// Everything the resolution looks at, so tests can fake it
type environment struct {
	goos    string
	getenv  func(string) string
	exeDir  string
	homeDir string
}

type dataPaths struct {
	root       string
	config     string
	soundBanks string
	logs       string
}

func currentEnvironment() (environment, error) {
	exe, err := os.Executable()
	if err != nil {
		return environment{}, err
	}
	// Follow symlinks so a link in ~/bin still finds the portable folder
	if resolved, err := filepath.EvalSymlinks(exe); err == nil {
		exe = resolved
	}
	// An error here only matters when no other option applies
	home, _ := os.UserHomeDir()
	return environment{
		goos:    runtime.GOOS,
		getenv:  os.Getenv,
		exeDir:  filepath.Dir(exe),
		homeDir: home,
	}, nil
}

// Picks the data directory: SPESSASYNTH_HOME, then a data folder next to
// the executable (portable mode), then the per-OS user directory
func resolveDataDir(env environment) (string, error) {
	if custom := env.getenv("SPESSASYNTH_HOME"); custom != "" {
		return filepath.Abs(custom)
	}

	// Portable mode is opt-in, the folder is never created by us
	portable := filepath.Join(env.exeDir, "data")
	if info, err := os.Stat(portable); err == nil && info.IsDir() {
		return portable, nil
	}

	if env.goos == "windows" {
		// Local, not Roaming: large sound banks should not sync
		if local := env.getenv("LOCALAPPDATA"); local != "" {
			return filepath.Join(local, appFolderName), nil
		}
		if env.homeDir == "" {
			return "", errors.New("could not find the user directory, set SPESSASYNTH_HOME")
		}
		return filepath.Join(env.homeDir, "AppData", "Local", appFolderName), nil
	}

	// The XDG spec says relative paths are invalid and should be ignored
	if xdg := env.getenv("XDG_DATA_HOME"); xdg != "" && filepath.IsAbs(xdg) {
		return filepath.Join(xdg, appFolderName), nil
	}
	if env.homeDir == "" {
		return "", errors.New("could not find the home directory, set SPESSASYNTH_HOME")
	}
	return filepath.Join(env.homeDir, ".local", "share", appFolderName), nil
}

// Creates the data folders if they are missing
func ensureDataDirs(root string) (dataPaths, error) {
	paths := dataPaths{
		root:       root,
		config:     filepath.Join(root, "config.json"),
		soundBanks: filepath.Join(root, "soundfonts"),
		logs:       filepath.Join(root, "logs"),
	}
	for _, dir := range []string{paths.soundBanks, paths.logs} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return paths, err
		}
	}
	return paths, nil
}
