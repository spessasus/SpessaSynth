package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func readJSONFile(t *testing.T, path string) map[string]any {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatalf("%s is not valid JSON: %v", path, err)
	}
	return out
}

func jsonEqual(t *testing.T, a, b []byte) bool {
	t.Helper()
	var x, y any
	if err := json.Unmarshal(a, &x); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(b, &y); err != nil {
		t.Fatal(err)
	}
	return reflect.DeepEqual(x, y)
}

func TestConfigMissingFileCreatesDefaults(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	c, err := loadConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if c.LastUsedSoundBank() != "" {
		t.Errorf("unexpected last used bank %q", c.LastUsedSoundBank())
	}
	if string(c.Settings()) != "{}" {
		t.Errorf("unexpected settings %s", c.Settings())
	}
	if c.Host() != "127.0.0.1" || !c.AutoShutdown() || !c.CheckForUpdates() {
		t.Errorf("unexpected flags: %q %v %v", c.Host(), c.AutoShutdown(), c.CheckForUpdates())
	}
	// The file is written so the flags can be found and edited
	file := readJSONFile(t, path)
	want := map[string]any{
		"lastUsedSf2":     nil,
		"settings":        map[string]any{},
		"host":            "127.0.0.1",
		"autoShutdown":    true,
		"checkForUpdates": true,
		"autoUpdate":      false,
	}
	if !reflect.DeepEqual(file, want) {
		t.Errorf("got file %v, want %v", file, want)
	}
}

func TestConfigReadsNodeFormat(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	node := `{"lastUsedSf2":"GeneralUserGS.sf3","settings":{"keyboard":{"show":false},"interface":{"language":"pl"}}}`
	if err := os.WriteFile(path, []byte(node), 0o644); err != nil {
		t.Fatal(err)
	}
	c, err := loadConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if c.LastUsedSoundBank() != "GeneralUserGS.sf3" {
		t.Errorf("unexpected last used bank %q", c.LastUsedSoundBank())
	}
	if !jsonEqual(t, c.Settings(), []byte(`{"keyboard":{"show":false},"interface":{"language":"pl"}}`)) {
		t.Errorf("settings changed: %s", c.Settings())
	}
	if c.Host() != "127.0.0.1" || !c.AutoShutdown() || !c.CheckForUpdates() {
		t.Error("missing flags were not filled with defaults")
	}
}

func TestConfigKeepsUnknownFields(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	if err := os.WriteFile(path, []byte(`{"futureField":{"a":[1,2]},"settings":{}}`), 0o644); err != nil {
		t.Fatal(err)
	}
	c, err := loadConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := c.SetLastUsedSoundBank("piano.sf2"); err != nil {
		t.Fatal(err)
	}
	file := readJSONFile(t, path)
	if !reflect.DeepEqual(file["futureField"], map[string]any{"a": []any{1.0, 2.0}}) {
		t.Errorf("unknown field was lost: %v", file)
	}
	if file["lastUsedSf2"] != "piano.sf2" {
		t.Errorf("last used bank not saved: %v", file)
	}
}

func TestConfigInvalidJSONIsMovedAside(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	broken := []byte(`{"settings": {`)
	if err := os.WriteFile(path, broken, 0o644); err != nil {
		t.Fatal(err)
	}
	c, err := loadConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(c.Settings()) != "{}" {
		t.Errorf("unexpected settings %s", c.Settings())
	}
	kept, err := os.ReadFile(filepath.Join(dir, "config.invalid.json"))
	if err != nil {
		t.Fatalf("broken config was not kept: %v", err)
	}
	if string(kept) != string(broken) {
		t.Errorf("kept file differs: %s", kept)
	}
	// And a fresh valid config took its place
	readJSONFile(t, path)
}

func TestConfigWrongTypesFallBackToDefaults(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	content := `{"lastUsedSf2":5,"settings":null,"host":false,"autoShutdown":"yes","checkForUpdates":false}`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	c, err := loadConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if c.LastUsedSoundBank() != "" {
		t.Errorf("unexpected last used bank %q", c.LastUsedSoundBank())
	}
	// The page crashes on null settings, so always hand out an object
	if string(c.Settings()) != "{}" {
		t.Errorf("unexpected settings %s", c.Settings())
	}
	if c.Host() != "127.0.0.1" {
		t.Errorf("unexpected host %q", c.Host())
	}
	if !c.AutoShutdown() {
		t.Error("autoShutdown should fall back to true")
	}
	if c.CheckForUpdates() {
		t.Error("a valid false checkForUpdates must be kept")
	}
}

func TestConfigSetSettings(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	c, err := loadConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := c.SetSettings([]byte(`{"renderer":{"renderNotes":false}}`)); err != nil {
		t.Fatal(err)
	}
	file := readJSONFile(t, path)
	want := map[string]any{"renderer": map[string]any{"renderNotes": false}}
	if !reflect.DeepEqual(file["settings"], want) {
		t.Errorf("settings not saved: %v", file["settings"])
	}
	for _, bad := range []string{`not json`, `null`, `[1,2]`, `"text"`, ``} {
		if err := c.SetSettings([]byte(bad)); err == nil {
			t.Errorf("SetSettings(%q) should fail", bad)
		}
	}
	// A rejected update leaves the saved settings alone
	if !jsonEqual(t, c.Settings(), []byte(`{"renderer":{"renderNotes":false}}`)) {
		t.Errorf("settings changed after rejected updates: %s", c.Settings())
	}
}

func TestConfigSaveLeavesNoTempFile(t *testing.T) {
	dir := t.TempDir()
	c, err := loadConfig(filepath.Join(dir, "config.json"))
	if err != nil {
		t.Fatal(err)
	}
	if err := c.SetLastUsedSoundBank("a.sf2"); err != nil {
		t.Fatal(err)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].Name() != "config.json" {
		names := make([]string, 0, len(entries))
		for _, e := range entries {
			names = append(names, e.Name())
		}
		t.Errorf("unexpected files: %v", names)
	}
}
