package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sync"
)

const (
	keyLastUsedSoundBank = "lastUsedSf2"
	keySettings          = "settings"
	keyHost              = "host"
	keyAutoShutdown      = "autoShutdown"
	keyCheckForUpdates   = "checkForUpdates"
	keyAutoUpdate        = "autoUpdate"
)

const defaultHost = "127.0.0.1"

// Same file shape as the Node server's config.json, plus the flags that only
// the executable reads. The settings are stored as raw JSON, the page fills
// in the defaults itself.
// Fields this version does not know are kept when the file is rewritten.
type config struct {
	mu     sync.Mutex
	path   string
	fields map[string]json.RawMessage
}

func configDefaults() map[string]json.RawMessage {
	return map[string]json.RawMessage{
		keyLastUsedSoundBank: json.RawMessage(`null`),
		keySettings:          json.RawMessage(`{}`),
		keyHost:              json.RawMessage(`"` + defaultHost + `"`),
		keyAutoShutdown:      json.RawMessage(`true`),
		keyCheckForUpdates:   json.RawMessage(`true`),
		// Updating without asking is opt-in
		keyAutoUpdate: json.RawMessage(`false`),
	}
}

func loadConfig(path string) (*config, error) {
	c := &config{path: path, fields: configDefaults()}

	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		fmt.Println("Unable to read the config file, creating a new one")
		return c, c.save()
	}
	if err != nil {
		return nil, err
	}

	var stored map[string]json.RawMessage
	if err := json.Unmarshal(data, &stored); err != nil || stored == nil {
		// Keep the broken file around instead of silently overwriting it
		invalid := filepath.Join(filepath.Dir(path), "config.invalid.json")
		fmt.Printf("Invalid config file, moved it to %s and created a new one\n", invalid)
		if err := os.Rename(path, invalid); err != nil {
			return nil, err
		}
		return c, c.save()
	}
	for key, value := range stored {
		c.fields[key] = value
	}
	return c, nil
}

// Writes to a temporary file first so a crash never leaves half a config
func (c *config) save() error {
	data, err := json.MarshalIndent(c.fields, "", "    ")
	if err != nil {
		return err
	}
	tmp := c.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, c.path)
}

// Decodes a field into out, falling back to the default when the stored
// value has the wrong type
func (c *config) get(key string, out any) {
	c.mu.Lock()
	raw := c.fields[key]
	c.mu.Unlock()
	if json.Unmarshal(raw, out) != nil {
		_ = json.Unmarshal(configDefaults()[key], out)
	}
}

func (c *config) set(key string, raw json.RawMessage) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.fields[key] = raw
	return c.save()
}

// Empty when there is none
func (c *config) LastUsedSoundBank() string {
	var name *string
	c.get(keyLastUsedSoundBank, &name)
	if name == nil {
		return ""
	}
	return *name
}

func (c *config) SetLastUsedSoundBank(name string) error {
	raw, err := json.Marshal(name)
	if err != nil {
		return err
	}
	return c.set(keyLastUsedSoundBank, raw)
}

// Always a JSON object, the page cannot handle anything else
func (c *config) Settings() json.RawMessage {
	c.mu.Lock()
	raw := c.fields[keySettings]
	c.mu.Unlock()
	if !isJSONObject(raw) {
		return json.RawMessage(`{}`)
	}
	return raw
}

func (c *config) SetSettings(raw []byte) error {
	if !isJSONObject(raw) {
		return errors.New("settings must be a JSON object")
	}
	return c.set(keySettings, json.RawMessage(bytes.Clone(raw)))
}

func (c *config) Host() string {
	var host string
	c.get(keyHost, &host)
	if host == "" {
		return defaultHost
	}
	return host
}

func (c *config) AutoShutdown() bool {
	var enabled bool
	c.get(keyAutoShutdown, &enabled)
	return enabled
}

func (c *config) CheckForUpdates() bool {
	var enabled bool
	c.get(keyCheckForUpdates, &enabled)
	return enabled
}

func isJSONObject(raw []byte) bool {
	var obj map[string]json.RawMessage
	return json.Unmarshal(raw, &obj) == nil && obj != nil
}

func (c *config) AutoUpdate() bool {
	var enabled bool
	c.get(keyAutoUpdate, &enabled)
	return enabled
}
