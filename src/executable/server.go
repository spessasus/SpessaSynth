package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const (
	appID = "spessasynth-local-edition"
	// Browsers must preflight cross-origin requests with a custom header,
	// and the server never approves a preflight. So a request with it can
	// only come from the page itself.
	customHeader    = "X-SpessaSynth"
	maxSettingsSize = 1 << 20
)

var soundBankExtensions = []string{".sf2", ".sf3", ".sf4", ".sfogg", ".dls"}

type versionInfo struct {
	App     string `json:"app"`
	Version string `json:"version"`
	Binary  bool   `json:"binary"`
	// Same values as Node's process.platform, "linux" or "win32"
	Platform string `json:"platform"`
}

// Everything the server needs from the outside, so tests can replace it
type serverOptions struct {
	// Listening beyond loopback, so the Host check is off
	lan bool
	// The site that serves downloads.json, ends with a slash
	baseURL string
	client  *http.Client
	alive   *aliveTracker
	// Shows a folder in the file manager
	openFolder func(dir string) error
	// Adds the Linux applications menu entry, nil where it is not supported
	installLauncher func() error
	// Nil when update checks are off
	updater *updater
}

type server struct {
	serverOptions
	conf        *config
	paths       dataPaths
	web         fs.FS
	defaultBank *defaultBank
}

func newServer(conf *config, paths dataPaths, web fs.FS, opts serverOptions) *server {
	if opts.alive == nil {
		opts.alive = newAliveTracker(0, 0, nil)
	}
	if opts.client == nil {
		opts.client = http.DefaultClient
	}
	return &server{serverOptions: opts, conf: conf, paths: paths, web: web, defaultBank: &defaultBank{}}
}

func platformName() string {
	if runtime.GOOS == "windows" {
		return "win32"
	}
	return runtime.GOOS
}

func (s *server) handler() http.Handler {
	mux := http.NewServeMux()
	files := http.FileServerFS(s.web)

	// Routes match src/server/api.ts
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFileFS(w, r, s.web, "local_edition_index.html")
	})
	mux.Handle("GET /", files)
	mux.Handle("GET /api/alive", s.alive)
	mux.HandleFunc("GET /api/version", s.getVersion)
	mux.HandleFunc("GET /api/settings", s.getSettings)
	mux.HandleFunc("PUT /api/settings", s.saveSettings)
	mux.HandleFunc("GET /api/soundbanks", s.listSoundBanks)
	mux.HandleFunc("GET /api/soundbanks/{name}", s.serveSoundBank)
	mux.HandleFunc("PUT /api/soundbanks/last-used", s.setLastSoundBank)
	mux.HandleFunc("POST /api/soundbanks/open-folder", localOnly(s.openSoundBankFolder))
	mux.HandleFunc("GET /api/soundbanks/default", s.defaultBankStatus)
	mux.HandleFunc("POST /api/soundbanks/default", localOnly(s.startDefaultBank))
	mux.HandleFunc("POST /api/launcher", localOnly(s.addLauncher))
	mux.HandleFunc("GET /api/update", s.updateStatus)
	mux.HandleFunc("POST /api/update", localOnly(s.startUpdate))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.lan && !isLoopbackName(r.Host) {
			// DNS rebinding sends a foreign host name to our address
			http.Error(w, "Forbidden host", http.StatusForbidden)
			return
		}
		// State-changing requests must come from the page
		if r.Method != http.MethodGet && r.Method != http.MethodHead && r.Header.Get(customHeader) == "" {
			http.Error(w, "Missing "+customHeader+" header", http.StatusForbidden)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

// For endpoints that touch the computer itself (opening folders, downloads,
// updates). They keep the Host check even in LAN mode and only accept
// requests from this computer. Otherwise a rebinding page in the user's
// own browser would pass both the peer check and the custom header.
func localOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		host, _, err := net.SplitHostPort(r.RemoteAddr)
		ip := net.ParseIP(host)
		if !isLoopbackName(r.Host) || err != nil || ip == nil || !ip.IsLoopback() {
			http.Error(w, "Only available on this computer", http.StatusForbidden)
			return
		}
		next(w, r)
	}
}

func (s *server) openSoundBankFolder(w http.ResponseWriter, r *http.Request) {
	if err := s.openFolder(s.paths.soundBanks); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) addLauncher(w http.ResponseWriter, r *http.Request) {
	if s.installLauncher == nil {
		http.Error(w, "Not supported on this system", http.StatusNotFound)
		return
	}
	if err := s.installLauncher(); err != nil {
		fmt.Println("Could not add the launcher:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Println("Added SpessaSynth to the applications menu.")
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) updateStatus(w http.ResponseWriter, r *http.Request) {
	if s.updater == nil {
		writeJSON(w, updateStatus{Current: version, State: updateIdle})
		return
	}
	writeJSON(w, s.updater.waitStatus(6*time.Second))
}

func (s *server) startUpdate(w http.ResponseWriter, r *http.Request) {
	if s.updater == nil {
		http.Error(w, "Update checks are off", http.StatusConflict)
		return
	}
	// Synchronous, so a second request gets the conflict and not a second update
	entry, err := s.updater.begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}
	go func() {
		if err := s.updater.finish(entry); err != nil {
			fmt.Println("The update failed:", err)
		}
	}()
	w.WriteHeader(http.StatusAccepted)
}

// True for localhost, 127.0.0.1 and ::1, with or without a port
func isLoopbackName(hostHeader string) bool {
	host := hostHeader
	if h, _, err := net.SplitHostPort(hostHeader); err == nil {
		host = h
	}
	host = strings.ToLower(strings.TrimSuffix(strings.TrimPrefix(host, "["), "]"))
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

func isSoundBank(name string) bool {
	lower := strings.ToLower(name)
	for _, ext := range soundBankExtensions {
		if strings.HasSuffix(lower, ext) {
			return true
		}
	}
	return false
}

// A plain file name inside the sound bank folder, nothing that could
// point elsewhere. Backslashes are checked by hand since they only count
// as separators on Windows.
func isSafeBankName(name string) bool {
	return name != "" &&
		!strings.ContainsAny(name, `/\`) &&
		filepath.IsLocal(name) &&
		isSoundBank(name)
}

func (s *server) getVersion(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, versionInfo{App: appID, Version: version, Binary: true, Platform: platformName()})
}

func (s *server) getSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(s.conf.Settings())
}

func (s *server) saveSettings(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxSettingsSize))
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			http.Error(w, "Settings too large", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "Could not read the settings", http.StatusBadRequest)
		return
	}
	if !isJSONObject(body) {
		http.Error(w, "Invalid settings", http.StatusBadRequest)
		return
	}
	if err := s.conf.SetSettings(body); err != nil {
		fmt.Println("Could not save the settings:", err)
		http.Error(w, "Could not save the settings", http.StatusInternalServerError)
		return
	}
	fmt.Fprint(w, "Settings saved")
}

func (s *server) setLastSoundBank(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	name := body.Name
	if !isSafeBankName(name) {
		http.Error(w, "Invalid sound bank name", http.StatusBadRequest)
		return
	}
	if err := s.conf.SetLastUsedSoundBank(name); err != nil {
		fmt.Println("Could not save the config:", err)
		http.Error(w, "Could not save the config", http.StatusInternalServerError)
		return
	}
	fmt.Fprint(w, "Sound bank updated")
}

type soundBankEntry struct {
	Name string `json:"name"`
}

// Reread on every request, so banks dropped into the folder show up after a refresh
func (s *server) listSoundBanks(w http.ResponseWriter, r *http.Request) {
	entries, err := os.ReadDir(s.paths.soundBanks)
	if err != nil {
		fmt.Println("Could not read the sound bank folder:", err)
		http.Error(w, "Could not read the sound bank folder", http.StatusInternalServerError)
		return
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !isSafeBankName(entry.Name()) {
			continue
		}
		// Stat follows symlinks, so linked banks count but folders do not
		info, err := os.Stat(filepath.Join(s.paths.soundBanks, entry.Name()))
		if err != nil || !info.Mode().IsRegular() {
			continue
		}
		names = append(names, entry.Name())
	}

	lastUsed := s.conf.LastUsedSoundBank()
	if lastUsed == "" && len(names) > 0 {
		if err := s.conf.SetLastUsedSoundBank(names[0]); err != nil {
			fmt.Println("Could not save the config:", err)
		}
	}
	for i, name := range names {
		if name == lastUsed && i > 0 {
			copy(names[1:i+1], names[:i])
			names[0] = lastUsed
			break
		}
	}

	list := make([]soundBankEntry, 0, len(names))
	for _, name := range names {
		list = append(list, soundBankEntry{Name: name})
	}
	writeJSON(w, list)
}

// The name is one decoded path segment, so an encoded slash or backslash
// ends up inside it and is rejected
func (s *server) serveSoundBank(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if !isSafeBankName(name) {
		http.Error(w, "Invalid sound bank name", http.StatusBadRequest)
		return
	}
	file, err := os.Open(filepath.Join(s.paths.soundBanks, name))
	if err != nil {
		http.Error(w, "Soundfont not found", http.StatusNotFound)
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() {
		http.Error(w, "Soundfont not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	// Sets Content-Length and handles range requests
	http.ServeContent(w, r, name, info.ModTime(), file)
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		fmt.Println("Could not write the response:", err)
	}
}
