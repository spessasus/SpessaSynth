package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"testing/fstest"
)

type testServer struct {
	s     *server
	h     http.Handler
	paths dataPaths
}

func newTestServer(t *testing.T, lan bool) testServer {
	t.Helper()
	return newTestServerWith(t, serverOptions{lan: lan})
}

func newTestServerWith(t *testing.T, opts serverOptions) testServer {
	t.Helper()
	paths, err := ensureDataDirs(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	conf, err := loadConfig(paths.config)
	if err != nil {
		t.Fatal(err)
	}
	web := fstest.MapFS{
		"local_edition_index.html": {Data: []byte("<html>index</html>")},
		"local_main.js":            {Data: []byte("console.log(1)")},
	}
	if opts.openFolder == nil {
		opts.openFolder = func(string) error { return nil }
	}
	s := newServer(conf, paths, web, opts)
	return testServer{s: s, h: s.handler(), paths: paths}
}

func (ts testServer) addBank(t *testing.T, name, content string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(ts.paths.soundBanks, name), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

// Sends a request the way the page does, unless the options say otherwise
func (ts testServer) do(method, target, body string, opts ...func(*http.Request)) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	req.Host = "localhost:8181"
	// The browser runs on the same computer
	req.RemoteAddr = "127.0.0.1:50000"
	if method != http.MethodGet {
		req.Header.Set(customHeader, "1")
	}
	for _, opt := range opts {
		opt(req)
	}
	rec := httptest.NewRecorder()
	ts.h.ServeHTTP(rec, req)
	return rec
}

func withHost(host string) func(*http.Request) {
	return func(r *http.Request) { r.Host = host }
}

func withoutCustomHeader(r *http.Request) {
	r.Header.Del(customHeader)
}

func withRemote(addr string) func(*http.Request) {
	return func(r *http.Request) { r.RemoteAddr = addr }
}

func TestOpenSoundBankFolder(t *testing.T) {
	var opened []string
	ts := newTestServerWith(t, serverOptions{openFolder: func(dir string) error {
		opened = append(opened, dir)
		return nil
	}})
	if rec := ts.do("POST", "/api/soundbanks/open-folder", ""); rec.Code != http.StatusNoContent {
		t.Fatalf("got %d, want 204", rec.Code)
	}
	if len(opened) != 1 || opened[0] != ts.paths.soundBanks {
		t.Errorf("opened %v, want the sound bank folder", opened)
	}

	failing := newTestServerWith(t, serverOptions{openFolder: func(string) error {
		return os.ErrNotExist
	}})
	if rec := failing.do("POST", "/api/soundbanks/open-folder", ""); rec.Code != http.StatusInternalServerError {
		t.Errorf("failure: got %d, want 500", rec.Code)
	}
}

func TestLocalOnlyEndpoints(t *testing.T) {
	launcherCalls := 0
	ts := newTestServerWith(t, serverOptions{lan: true, installLauncher: func() error {
		launcherCalls++
		return nil
	}})
	local := []string{"/api/soundbanks/open-folder", "/api/soundbanks/default", "/api/launcher"}
	for _, target := range local {
		// Another device on the network
		if rec := ts.do("POST", target, "", withRemote("192.168.1.20:40000"), withHost("192.168.1.5:8181")); rec.Code != http.StatusForbidden {
			t.Errorf("%s from the LAN: got %d, want 403", target, rec.Code)
		}
		// A rebinding page in the local browser: loopback peer, foreign host
		if rec := ts.do("POST", target, "", withHost("evil.example:8181")); rec.Code != http.StatusForbidden {
			t.Errorf("%s with a foreign host: got %d, want 403", target, rec.Code)
		}
	}
	if launcherCalls != 0 {
		t.Error("a rejected request reached the launcher")
	}
	// The normal API still works from the LAN
	if rec := ts.do("GET", "/api/settings", "", withRemote("192.168.1.20:40000"), withHost("192.168.1.5:8181")); rec.Code != http.StatusOK {
		t.Errorf("settings from the LAN: got %d, want 200", rec.Code)
	}
	if rec := ts.do("POST", "/api/launcher", ""); rec.Code != http.StatusNoContent || launcherCalls != 1 {
		t.Errorf("local launcher request: got %d, calls %d", rec.Code, launcherCalls)
	}
}

func TestLauncherUnsupported(t *testing.T) {
	ts := newTestServer(t, false)
	if rec := ts.do("POST", "/api/launcher", ""); rec.Code != http.StatusNotFound {
		t.Errorf("got %d, want 404", rec.Code)
	}
}

func TestDefaultBankDownload(t *testing.T) {
	site := newFakeSite(t)
	site.manifest = downloadsManifest{Version: "4.4.2", SoundBank: site.add("soundfonts/GeneralUserGS.sf3", []byte("general user"))}
	ts := newTestServerWith(t, serverOptions{baseURL: site.baseURL()})

	status := func() bankDownloadStatus {
		var st bankDownloadStatus
		if err := json.Unmarshal(ts.do("GET", "/api/soundbanks/default", "").Body.Bytes(), &st); err != nil {
			t.Fatal(err)
		}
		return st
	}
	if st := status(); st.State != bankIdle && st.State != "" {
		t.Errorf("initial state %q", st.State)
	}
	if rec := ts.do("POST", "/api/soundbanks/default", ""); rec.Code != http.StatusAccepted {
		t.Fatalf("got %d, want 202", rec.Code)
	}
	waitFor(t, func() bool { return status().State == bankDone })
	if st := status(); st.Received != st.Total || st.Total != int64(len("general user")) {
		t.Errorf("unexpected progress %+v", st)
	}
	data, err := os.ReadFile(filepath.Join(ts.paths.soundBanks, "GeneralUserGS.sf3"))
	if err != nil || string(data) != "general user" {
		t.Errorf("bank not saved: %q %v", data, err)
	}
	// And it shows up in the list
	if body := ts.do("GET", "/api/soundbanks", "").Body.String(); !strings.Contains(body, "GeneralUserGS.sf3") {
		t.Errorf("bank not listed: %s", body)
	}
}

func TestDefaultBankDownloadFailureCanBeRetried(t *testing.T) {
	site := newFakeSite(t)
	entry := site.add("soundfonts/GeneralUserGS.sf3", []byte("general user"))
	broken := entry
	broken.SHA256 = strings.Repeat("0", 64)
	site.manifest = downloadsManifest{SoundBank: broken}
	ts := newTestServerWith(t, serverOptions{baseURL: site.baseURL()})

	state := func() bankDownloadStatus {
		var st bankDownloadStatus
		_ = json.Unmarshal(ts.do("GET", "/api/soundbanks/default", "").Body.Bytes(), &st)
		return st
	}
	ts.do("POST", "/api/soundbanks/default", "")
	waitFor(t, func() bool { return state().State == bankError })
	if st := state(); st.Error == "" {
		t.Error("the error message is missing")
	}
	if entries, _ := os.ReadDir(ts.paths.soundBanks); len(entries) != 0 {
		t.Errorf("a failed download left files: %v", entries)
	}

	site.manifest.SoundBank = entry
	ts.do("POST", "/api/soundbanks/default", "")
	waitFor(t, func() bool { return state().State == bankDone })
}

func TestDefaultBankKeepsExistingFile(t *testing.T) {
	site := newFakeSite(t)
	site.manifest = downloadsManifest{SoundBank: site.add("soundfonts/GeneralUserGS.sf3", []byte("new"))}
	ts := newTestServerWith(t, serverOptions{baseURL: site.baseURL()})
	ts.addBank(t, "GeneralUserGS.sf3", "the user's own copy")
	ts.do("POST", "/api/soundbanks/default", "")
	waitFor(t, func() bool {
		return strings.Contains(ts.do("GET", "/api/soundbanks/default", "").Body.String(), bankDone)
	})
	data, _ := os.ReadFile(filepath.Join(ts.paths.soundBanks, "GeneralUserGS.sf3"))
	if string(data) != "the user's own copy" {
		t.Errorf("existing bank was overwritten: %q", data)
	}
}

func TestHostCheck(t *testing.T) {
	ts := newTestServer(t, false)
	allowed := []string{"localhost:8181", "127.0.0.1:8181", "[::1]:8181", "localhost", "LOCALHOST:8182"}
	for _, host := range allowed {
		if rec := ts.do("GET", "/api/settings", "", withHost(host)); rec.Code != http.StatusOK {
			t.Errorf("host %q: got %d, want 200", host, rec.Code)
		}
	}
	rejected := []string{"evil.com", "evil.com:8181", "localhost.evil.com:8181", "127.0.0.1.evil.com", "192.168.1.5:8181", ""}
	for _, host := range rejected {
		for _, target := range []string{"/", "/api/settings", "/local_main.js", "/api/soundbanks"} {
			if rec := ts.do("GET", target, "", withHost(host)); rec.Code != http.StatusForbidden {
				t.Errorf("host %q on %s: got %d, want 403", host, target, rec.Code)
			}
		}
	}
}

func TestHostCheckIsRelaxedOnLAN(t *testing.T) {
	ts := newTestServer(t, true)
	if rec := ts.do("GET", "/api/settings", "", withHost("192.168.1.5:8181")); rec.Code != http.StatusOK {
		t.Errorf("got %d, want 200", rec.Code)
	}
}

func TestStateChangesNeedPutAndCustomHeader(t *testing.T) {
	ts := newTestServer(t, false)
	bodies := map[string]string{
		"/api/settings":             `{"changed":true}`,
		"/api/soundbanks/last-used": `{"name":"a.sf2"}`,
	}
	for target, body := range bodies {
		for _, method := range []string{"POST", "DELETE"} {
			if rec := ts.do(method, target, body); rec.Code != http.StatusMethodNotAllowed {
				t.Errorf("%s %s: got %d, want 405", method, target, rec.Code)
			}
		}
		if rec := ts.do("PUT", target, body, withoutCustomHeader); rec.Code != http.StatusForbidden {
			t.Errorf("PUT %s without header: got %d, want 403", target, rec.Code)
		}
	}
	if string(ts.s.conf.Settings()) != "{}" || ts.s.conf.LastUsedSoundBank() != "" {
		t.Error("a rejected request changed the config")
	}
}

func TestSaveSettings(t *testing.T) {
	ts := newTestServer(t, false)
	rec := ts.do("PUT", "/api/settings", `{"keyboard":{"show":false}}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want 200", rec.Code)
	}
	got := ts.do("GET", "/api/settings", "")
	if got.Header().Get("Content-Type") != "application/json" {
		t.Errorf("unexpected content type %q", got.Header().Get("Content-Type"))
	}
	var settings map[string]any
	if err := json.Unmarshal(got.Body.Bytes(), &settings); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(settings, map[string]any{"keyboard": map[string]any{"show": false}}) {
		t.Errorf("unexpected settings %v", settings)
	}

	for _, bad := range []string{"not json", "null", "[]"} {
		if rec := ts.do("PUT", "/api/settings", bad); rec.Code != http.StatusBadRequest {
			t.Errorf("body %q: got %d, want 400", bad, rec.Code)
		}
	}
	huge := `{"a":"` + strings.Repeat("x", maxSettingsSize) + `"}`
	if rec := ts.do("PUT", "/api/settings", huge); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("huge body: got %d, want 413", rec.Code)
	}
}

func TestSetLastSoundBank(t *testing.T) {
	ts := newTestServer(t, false)
	put := func(body string) int {
		return ts.do("PUT", "/api/soundbanks/last-used", body).Code
	}
	if code := put(`{"name":"piano.sf2"}`); code != http.StatusOK {
		t.Fatalf("got %d, want 200", code)
	}
	if ts.s.conf.LastUsedSoundBank() != "piano.sf2" {
		t.Errorf("not saved, got %q", ts.s.conf.LastUsedSoundBank())
	}
	for _, bad := range []string{"", "../x.sf2", `a\b.sf2`, "sub/x.sf2", "notes.txt", ".."} {
		body, err := json.Marshal(map[string]string{"name": bad})
		if err != nil {
			t.Fatal(err)
		}
		if code := put(string(body)); code != http.StatusBadRequest {
			t.Errorf("name %q: got %d, want 400", bad, code)
		}
	}
	for _, bad := range []string{"", "not json", `{"name":5}`, `"piano.sf2"`} {
		if code := put(bad); code != http.StatusBadRequest {
			t.Errorf("body %q: got %d, want 400", bad, code)
		}
	}
	if ts.s.conf.LastUsedSoundBank() != "piano.sf2" {
		t.Errorf("rejected names changed the config to %q", ts.s.conf.LastUsedSoundBank())
	}
}

func TestSoundBankList(t *testing.T) {
	ts := newTestServer(t, false)

	// An empty folder is an empty array, not null
	if body := strings.TrimSpace(ts.do("GET", "/api/soundbanks", "").Body.String()); body != "[]" {
		t.Errorf("empty folder: got %s", body)
	}

	ts.addBank(t, "a.sf2", "a")
	ts.addBank(t, "b.SF3", "b")
	ts.addBank(t, "c.dls", "c")
	ts.addBank(t, "readme.txt", "x")
	if err := os.Mkdir(filepath.Join(ts.paths.soundBanks, "folder.sf2"), 0o755); err != nil {
		t.Fatal(err)
	}

	list := func() []string {
		rec := ts.do("GET", "/api/soundbanks", "")
		var entries []struct{ Name string }
		if err := json.Unmarshal(rec.Body.Bytes(), &entries); err != nil {
			t.Fatal(err)
		}
		names := make([]string, 0, len(entries))
		for _, e := range entries {
			names = append(names, e.Name)
		}
		return names
	}

	// Without a last used bank the first one becomes it
	if got := list(); !reflect.DeepEqual(got, []string{"a.sf2", "b.SF3", "c.dls"}) {
		t.Errorf("got %v", got)
	}
	if ts.s.conf.LastUsedSoundBank() != "a.sf2" {
		t.Errorf("last used not set, got %q", ts.s.conf.LastUsedSoundBank())
	}

	if err := ts.s.conf.SetLastUsedSoundBank("c.dls"); err != nil {
		t.Fatal(err)
	}
	if got := list(); !reflect.DeepEqual(got, []string{"c.dls", "a.sf2", "b.SF3"}) {
		t.Errorf("last used bank not first: %v", got)
	}

	// A last used bank that was deleted is ignored
	if err := ts.s.conf.SetLastUsedSoundBank("gone.sf2"); err != nil {
		t.Fatal(err)
	}
	if got := list(); !reflect.DeepEqual(got, []string{"a.sf2", "b.SF3", "c.dls"}) {
		t.Errorf("got %v", got)
	}
}

func TestServeSoundBank(t *testing.T) {
	ts := newTestServer(t, false)
	ts.addBank(t, "piano.sf2", "piano data")
	ts.addBank(t, "UPPER.SF3", "upper data")

	for _, target := range []string{"/api/soundbanks/piano.sf2", "/api/soundbanks/UPPER.SF3"} {
		rec := ts.do("GET", target, "")
		if rec.Code != http.StatusOK {
			t.Errorf("%s: got %d, want 200", target, rec.Code)
			continue
		}
		if rec.Header().Get("Content-Type") != "application/octet-stream" {
			t.Errorf("%s: content type %q", target, rec.Header().Get("Content-Type"))
		}
		if rec.Header().Get("Content-Length") == "" {
			t.Errorf("%s: missing content length, the page needs it", target)
		}
	}
	if body := ts.do("GET", "/api/soundbanks/piano.sf2", "").Body.String(); body != "piano data" {
		t.Errorf("unexpected body %q", body)
	}
	// Names with spaces and other characters arrive encoded
	ts.addBank(t, "My Bank #1.sf2", "spaced")
	if body := ts.do("GET", "/api/soundbanks/My%20Bank%20%231.sf2", "").Body.String(); body != "spaced" {
		t.Errorf("encoded name: unexpected body %q", body)
	}
	if rec := ts.do("GET", "/api/soundbanks/missing.sf2", ""); rec.Code != http.StatusNotFound {
		t.Errorf("missing bank: got %d, want 404", rec.Code)
	}
	if rec := ts.do("GET", "/api/soundbanks/notes.txt", ""); rec.Code != http.StatusBadRequest {
		t.Errorf("not a bank: got %d, want 400", rec.Code)
	}
	// The old bare file name requests are gone
	if rec := ts.do("GET", "/piano.sf2", ""); rec.Code != http.StatusNotFound {
		t.Errorf("bare name: got %d, want 404", rec.Code)
	}
}

func TestServeSoundBankStaysInFolder(t *testing.T) {
	ts := newTestServer(t, false)
	// A bank-looking file outside the sound bank folder
	secret := filepath.Join(ts.paths.root, "secret.sf2")
	// Redirect bodies mention the file name, so look for the contents
	const marker = "SECRET-CONTENTS"
	if err := os.WriteFile(secret, []byte(marker), 0o644); err != nil {
		t.Fatal(err)
	}
	targets := []string{
		"/api/soundbanks/../secret.sf2",
		"/api/soundbanks/%2e%2e/secret.sf2",
		"/api/soundbanks/..%2Fsecret.sf2",
		"/api/soundbanks/..%5Csecret.sf2",
		"/api/soundbanks/%2e%2e%5Csecret.sf2",
		"/../secret.sf2",
		"/secret.sf2",
	}
	for _, target := range targets {
		rec := ts.do("GET", target, "")
		if strings.Contains(rec.Body.String(), marker) {
			t.Errorf("%s leaked a file outside the folder", target)
		}
	}
}

func TestStaticFiles(t *testing.T) {
	ts := newTestServer(t, false)
	rec := ts.do("GET", "/", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "index") {
		t.Errorf("index: got %d %q", rec.Code, rec.Body.String())
	}
	if !strings.HasPrefix(rec.Header().Get("Content-Type"), "text/html") {
		t.Errorf("index content type %q", rec.Header().Get("Content-Type"))
	}
	rec = ts.do("GET", "/local_main.js?hash=123", "")
	if rec.Code != http.StatusOK || !strings.HasPrefix(rec.Header().Get("Content-Type"), "text/javascript") {
		t.Errorf("script: got %d %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	if rec := ts.do("GET", "/nope.js", ""); rec.Code != http.StatusNotFound {
		t.Errorf("missing file: got %d, want 404", rec.Code)
	}
}

func TestGetVersion(t *testing.T) {
	ts := newTestServer(t, false)
	rec := ts.do("GET", "/api/version", "")
	var info versionInfo
	if err := json.Unmarshal(rec.Body.Bytes(), &info); err != nil {
		t.Fatal(err)
	}
	if info.App != appID || info.Version != version || !info.Binary {
		t.Errorf("unexpected version info %+v", info)
	}
}
