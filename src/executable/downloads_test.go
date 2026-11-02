package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// A fake Pages site serving downloads.json and the files it lists
type fakeSite struct {
	srv      *httptest.Server
	files    map[string][]byte
	manifest downloadsManifest
}

func newFakeSite(t *testing.T) *fakeSite {
	t.Helper()
	site := &fakeSite{files: map[string][]byte{}}
	site.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/downloads.json" {
			_ = json.NewEncoder(w).Encode(site.manifest)
			return
		}
		data, ok := site.files[r.URL.Path[1:]]
		if !ok {
			http.NotFound(w, r)
			return
		}
		_, _ = w.Write(data)
	}))
	t.Cleanup(site.srv.Close)
	return site
}

func (s *fakeSite) baseURL() string {
	return s.srv.URL + "/"
}

// Adds a file and returns its manifest entry
func (s *fakeSite) add(name string, data []byte) downloadFile {
	s.files[name] = data
	sum := sha256.Sum256(data)
	return downloadFile{File: name, Size: int64(len(data)), SHA256: hex.EncodeToString(sum[:])}
}

func TestFetchManifest(t *testing.T) {
	site := newFakeSite(t)
	site.manifest = downloadsManifest{Version: "4.5.0", SoundBank: site.add("soundfonts/GeneralUserGS.sf3", []byte("bank"))}
	m, err := fetchManifest(http.DefaultClient, site.baseURL())
	if err != nil {
		t.Fatal(err)
	}
	if m.Version != "4.5.0" || m.SoundBank.File != "soundfonts/GeneralUserGS.sf3" {
		t.Errorf("unexpected manifest %+v", m)
	}
}

func TestDownloadVerified(t *testing.T) {
	site := newFakeSite(t)
	entry := site.add("soundfonts/GeneralUserGS.sf3", []byte("the bank contents"))
	target := filepath.Join(t.TempDir(), "GeneralUserGS.sf3")
	var last int64
	if err := downloadVerified(http.DefaultClient, site.baseURL(), entry, target, func(n int64) { last = n }); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(target)
	if err != nil || string(data) != "the bank contents" {
		t.Errorf("unexpected file %q, %v", data, err)
	}
	if last != entry.Size {
		t.Errorf("progress ended at %d, want %d", last, entry.Size)
	}
	if _, err := os.Stat(target + ".part"); !os.IsNotExist(err) {
		t.Error("the .part file was left behind")
	}
}

func TestDownloadVerifiedRejectsBadFiles(t *testing.T) {
	site := newFakeSite(t)
	good := site.add("soundfonts/a.sf3", []byte("contents"))
	cases := map[string]downloadFile{
		"wrong hash":     {File: good.File, Size: good.Size, SHA256: hex.EncodeToString(make([]byte, 32))},
		"too short":      {File: good.File, Size: good.Size + 5, SHA256: good.SHA256},
		"too long":       {File: good.File, Size: good.Size - 2, SHA256: good.SHA256},
		"missing":        {File: "soundfonts/missing.sf3", Size: 3, SHA256: good.SHA256},
		"absolute path":  {File: "/etc/passwd", Size: 3, SHA256: good.SHA256},
		"parent path":    {File: "../x.sf3", Size: 3, SHA256: good.SHA256},
		"other host":     {File: "https://evil.example/x.sf3", Size: 3, SHA256: good.SHA256},
		"no hash":        {File: good.File, Size: good.Size},
		"no size":        {File: good.File, SHA256: good.SHA256},
		"empty path":     {Size: 3, SHA256: good.SHA256},
		"backslash path": {File: `soundfonts\a.sf3`, Size: good.Size, SHA256: good.SHA256},
	}
	for name, entry := range cases {
		dir := t.TempDir()
		target := filepath.Join(dir, "a.sf3")
		if err := downloadVerified(http.DefaultClient, site.baseURL(), entry, target, func(int64) {}); err == nil {
			t.Errorf("%s: expected an error", name)
		}
		if entries, _ := os.ReadDir(dir); len(entries) != 0 {
			t.Errorf("%s: left files behind: %v", name, entries)
		}
	}
}
