package main

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync/atomic"
	"testing"
	"time"
)

func decodeJSON(t *testing.T, data []byte, out any) {
	t.Helper()
	if err := json.Unmarshal(data, out); err != nil {
		t.Fatalf("invalid JSON %q: %v", data, err)
	}
}

func tarGz(t *testing.T, files map[string]string) []byte {
	t.Helper()
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)
	for name, content := range files {
		if err := tw.WriteHeader(&tar.Header{Name: name, Mode: 0o755, Size: int64(len(content)), Typeflag: tar.TypeReg}); err != nil {
			t.Fatal(err)
		}
		if _, err := tw.Write([]byte(content)); err != nil {
			t.Fatal(err)
		}
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := gz.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func zipArchive(t *testing.T, files map[string]string) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for name, content := range files {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := w.Write([]byte(content)); err != nil {
			t.Fatal(err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

type updateFixture struct {
	site     *fakeSite
	exe      string
	u        *updater
	restarts atomic.Int32
}

// An "installed" executable in a temp folder and a site offering 9.0.0
func newUpdateFixture(t *testing.T, platform string) *updateFixture {
	t.Helper()
	f := &updateFixture{site: newFakeSite(t)}
	dir := t.TempDir()
	f.exe = filepath.Join(dir, "SpessaSynth")
	if err := os.WriteFile(f.exe, []byte("old binary"), 0o755); err != nil {
		t.Fatal(err)
	}
	entry := f.site.add("SpessaSynth-linux-x64.tar.gz", tarGz(t, map[string]string{
		"SpessaSynth": "new binary",
		"LICENSE":     "license",
	}))
	f.site.manifest = downloadsManifest{Version: "9.0.0", Platforms: map[string]downloadFile{"linux-x64": entry}}
	f.u = newUpdater(updaterOptions{
		client:   http.DefaultClient,
		baseURL:  f.site.baseURL(),
		current:  "4.4.2",
		platform: platform,
		exe:      f.exe,
		goos:     "linux",
		restart:  func() { f.restarts.Add(1) },
	})
	return f
}

func TestUpdateCheck(t *testing.T) {
	f := newUpdateFixture(t, "linux-x64")
	f.u.check()
	st := f.u.status()
	if !st.Available || st.Latest != "9.0.0" || st.Current != "4.4.2" || !st.CanInstall {
		t.Errorf("unexpected status %+v", st)
	}

	// Same version: nothing to do
	f.site.manifest.Version = "4.4.2"
	f.u.check()
	if f.u.status().Available {
		t.Error("the same version should not be offered")
	}

	// A platform missing from the manifest is never offered
	other := newUpdateFixture(t, "linux-arm64")
	other.u.check()
	if other.u.status().Available {
		t.Error("a missing platform should not be offered")
	}
}

func TestUpdateCheckOffline(t *testing.T) {
	f := newUpdateFixture(t, "linux-x64")
	f.site.srv.Close()
	f.u.check()
	if st := f.u.status(); st.Available || st.Error != "" {
		// A failed check stays quiet, it is not an update error
		t.Errorf("unexpected status %+v", st)
	}
}

func TestUpdateInstallLinux(t *testing.T) {
	f := newUpdateFixture(t, "linux-x64")
	f.u.check()
	if err := f.u.install(); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(f.exe)
	if err != nil || string(data) != "new binary" {
		t.Fatalf("executable not replaced: %q %v", data, err)
	}
	info, _ := os.Stat(f.exe)
	if runtime.GOOS != "windows" && info.Mode().Perm()&0o100 == 0 {
		t.Errorf("new executable is not executable: %v", info.Mode())
	}
	if f.restarts.Load() != 1 {
		t.Errorf("restart called %d times", f.restarts.Load())
	}
	// The executable and the old one kept aside, nothing else
	entries, _ := os.ReadDir(filepath.Dir(f.exe))
	if len(entries) != 2 || len(oldExecutables(t, f.exe)) != 1 {
		t.Errorf("unexpected files: %v", entries)
	}
}

func TestUpdateInstallWindowsRenames(t *testing.T) {
	f := newUpdateFixture(t, "win-x64")
	exe := filepath.Join(filepath.Dir(f.exe), "SpessaSynth.exe")
	if err := os.Rename(f.exe, exe); err != nil {
		t.Fatal(err)
	}
	entry := f.site.add("SpessaSynth-win-x64.zip", zipArchive(t, map[string]string{"SpessaSynth.exe": "new exe", "LICENSE": "l"}))
	f.site.manifest.Platforms = map[string]downloadFile{"win-x64": entry}
	f.u.exe = exe
	f.u.goos = "windows"
	f.u.check()
	if err := f.u.install(); err != nil {
		t.Fatal(err)
	}
	if data, _ := os.ReadFile(exe); string(data) != "new exe" {
		t.Errorf("exe not replaced: %q", data)
	}
	// The running exe can only be renamed on Windows, it is removed on the next start
	old := oldExecutables(t, exe)
	if len(old) != 1 {
		t.Fatalf("old exe not kept aside: %v", old)
	}
	if data, _ := os.ReadFile(old[0]); string(data) != "old binary" {
		t.Errorf("old exe has %q", data)
	}
	removeOldExecutable(exe)
	if left := oldExecutables(t, exe); len(left) != 0 {
		t.Errorf("old exe not removed: %v", left)
	}
}

func TestUpdateInstallRejectsBadArchive(t *testing.T) {
	f := newUpdateFixture(t, "linux-x64")
	f.u.check()
	entry := f.site.manifest.Platforms["linux-x64"]
	entry.SHA256 = entry.SHA256[:63] + "0"
	if entry.SHA256 == f.site.manifest.Platforms["linux-x64"].SHA256 {
		entry.SHA256 = entry.SHA256[:63] + "1"
	}
	f.u.latest.Platforms["linux-x64"] = entry
	if err := f.u.install(); err == nil {
		t.Fatal("expected a checksum error")
	}
	if data, _ := os.ReadFile(f.exe); string(data) != "old binary" {
		t.Error("a failed update changed the executable")
	}
	if f.restarts.Load() != 0 {
		t.Error("a failed update restarted")
	}
	entries, _ := os.ReadDir(filepath.Dir(f.exe))
	if len(entries) != 1 {
		t.Errorf("leftover files: %v", entries)
	}
}

func TestUpdateArchiveWithoutExecutable(t *testing.T) {
	f := newUpdateFixture(t, "linux-x64")
	entry := f.site.add("SpessaSynth-linux-x64.tar.gz", tarGz(t, map[string]string{"LICENSE": "only this"}))
	f.site.manifest.Platforms["linux-x64"] = entry
	f.u.check()
	if err := f.u.install(); err == nil {
		t.Fatal("expected an error for a missing executable")
	}
	if data, _ := os.ReadFile(f.exe); string(data) != "old binary" {
		t.Error("the executable changed")
	}
}

func TestUpdateNotWritable(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("root can write anywhere")
	}
	f := newUpdateFixture(t, "linux-x64")
	dir := filepath.Dir(f.exe)
	if err := os.Chmod(dir, 0o555); err != nil {
		t.Fatal(err)
	}
	defer os.Chmod(dir, 0o755)
	f.u.check()
	st := f.u.status()
	if !st.Available || st.CanInstall {
		t.Errorf("expected available but not installable: %+v", st)
	}
}

func TestUpdateEndpoints(t *testing.T) {
	f := newUpdateFixture(t, "linux-x64")
	f.u.startCheck()
	ts := newTestServerWith(t, serverOptions{updater: f.u})

	var st updateStatus
	decodeJSON(t, ts.do("GET", "/api/update", "").Body.Bytes(), &st)
	if !st.Available || st.Latest != "9.0.0" {
		t.Fatalf("unexpected status %+v", st)
	}
	if rec := ts.do("POST", "/api/update", "", withRemote("192.168.1.2:4000")); rec.Code != http.StatusForbidden {
		t.Errorf("update from the LAN: got %d, want 403", rec.Code)
	}
	if rec := ts.do("POST", "/api/update", ""); rec.Code != http.StatusAccepted {
		t.Fatalf("got %d, want 202", rec.Code)
	}
	waitFor(t, func() bool { return f.restarts.Load() == 1 })
	decodeJSON(t, ts.do("GET", "/api/update", "").Body.Bytes(), &st)
	if st.State != updateRestarting {
		t.Errorf("state %q, want %q", st.State, updateRestarting)
	}
}

func TestUpdateEndpointsWithoutUpdater(t *testing.T) {
	ts := newTestServer(t, false)
	var st updateStatus
	decodeJSON(t, ts.do("GET", "/api/update", "").Body.Bytes(), &st)
	if st.Available {
		t.Error("no updater, nothing available")
	}
	if rec := ts.do("POST", "/api/update", ""); rec.Code != http.StatusConflict {
		t.Errorf("got %d, want 409", rec.Code)
	}
}

func TestPlatformKey(t *testing.T) {
	cases := map[[2]string]string{
		{"windows", "amd64"}: "win-x64",
		{"linux", "amd64"}:   "linux-x64",
		{"linux", "arm64"}:   "linux-arm64",
		{"darwin", "arm64"}:  "",
		{"windows", "arm64"}: "",
	}
	for in, want := range cases {
		if got := platformKey(in[0], in[1]); got != want {
			t.Errorf("platformKey(%s, %s) = %q, want %q", in[0], in[1], got, want)
		}
	}
}

func TestUpdateCheckWaitsForResult(t *testing.T) {
	f := newUpdateFixture(t, "linux-x64")
	f.u.startCheck()
	done := make(chan updateStatus)
	go func() { done <- f.u.waitStatus(2 * time.Second) }()
	select {
	case st := <-done:
		if !st.Available {
			t.Errorf("unexpected status %+v", st)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("waitStatus did not return")
	}
}

// Only the executable and the kept-aside old ones, which the next start removes
func oldExecutables(t *testing.T, exe string) []string {
	t.Helper()
	matches, err := filepath.Glob(exe + ".old-*")
	if err != nil {
		t.Fatal(err)
	}
	return matches
}

func TestUpdateKeepsOldUntilNextStart(t *testing.T) {
	f := newUpdateFixture(t, "linux-x64")
	f.u.check()
	if err := f.u.install(); err != nil {
		t.Fatal(err)
	}
	old := oldExecutables(t, f.exe)
	if len(old) != 1 {
		t.Fatalf("expected one old executable, got %v", old)
	}
	if data, _ := os.ReadFile(old[0]); string(data) != "old binary" {
		t.Errorf("old executable has %q", data)
	}
	removeOldExecutable(f.exe)
	if left := oldExecutables(t, f.exe); len(left) != 0 {
		t.Errorf("old executables not removed: %v", left)
	}
}

func TestUpdateRollback(t *testing.T) {
	f := newUpdateFixture(t, "linux-x64")
	f.u.check()
	if err := f.u.install(); err != nil {
		t.Fatal(err)
	}
	if err := f.u.rollback(); err != nil {
		t.Fatal(err)
	}
	if data, _ := os.ReadFile(f.exe); string(data) != "old binary" {
		t.Errorf("rollback left %q", data)
	}
}

// The process from the first update still runs the first old file, so the
// second update must not need to touch it (Windows cannot)
func TestUpdateTwiceInOneSession(t *testing.T) {
	f := newUpdateFixture(t, "linux-x64")
	f.u.check()
	if err := f.u.install(); err != nil {
		t.Fatal(err)
	}
	entry := f.site.add("SpessaSynth-linux-x64.tar.gz", tarGz(t, map[string]string{"SpessaSynth": "newer binary"}))
	f.site.manifest = downloadsManifest{Version: "10.0.0", Platforms: map[string]downloadFile{"linux-x64": entry}}
	f.u.current = "9.0.0"
	f.u.mu.Lock()
	f.u.st.State = updateIdle
	f.u.mu.Unlock()
	f.u.check()
	if err := f.u.install(); err != nil {
		t.Fatalf("second update failed: %v", err)
	}
	if data, _ := os.ReadFile(f.exe); string(data) != "newer binary" {
		t.Errorf("exe has %q", data)
	}
	if old := oldExecutables(t, f.exe); len(old) != 2 {
		t.Errorf("expected two distinct old executables, got %v", old)
	}
}

func TestStartUpdateOnlyOnce(t *testing.T) {
	f := newUpdateFixture(t, "linux-x64")
	f.u.startCheck()
	f.u.waitStatus(2 * time.Second)
	ts := newTestServerWith(t, serverOptions{updater: f.u})
	first := ts.do("POST", "/api/update", "")
	second := ts.do("POST", "/api/update", "")
	if first.Code != http.StatusAccepted || second.Code != http.StatusConflict {
		t.Errorf("got %d and %d, want 202 and 409", first.Code, second.Code)
	}
	waitFor(t, func() bool { return f.restarts.Load() == 1 })
	time.Sleep(100 * time.Millisecond)
	if f.restarts.Load() != 1 {
		t.Errorf("restarted %d times", f.restarts.Load())
	}
}

func TestStartReplacementFallsBackToOld(t *testing.T) {
	trueBin, err := exec.LookPath("true")
	if err != nil {
		t.Skip("no true binary")
	}
	working, err := os.ReadFile(trueBin)
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	exe := filepath.Join(dir, "SpessaSynth")
	// A "new" executable that cannot start
	if err := os.WriteFile(exe, []byte("not a program"), 0o644); err != nil {
		t.Fatal(err)
	}
	rolledBack := false
	// Like the real rollback, the old file comes back by rename with its mode
	old := filepath.Join(dir, "old")
	if err := os.WriteFile(old, working, 0o755); err != nil {
		t.Fatal(err)
	}
	rollback := func() error {
		rolledBack = true
		return os.Rename(old, exe)
	}
	cmd, err := startReplacement(exe, nil, os.Environ(), rollback)
	if err != nil {
		t.Fatalf("expected the old version to start: %v", err)
	}
	if !rolledBack {
		t.Error("rollback was not used")
	}
	if err := cmd.Wait(); err != nil {
		t.Errorf("old version failed: %v", err)
	}

	// Both broken: the error is returned
	if err := os.WriteFile(exe, []byte("not a program"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := startReplacement(exe, nil, os.Environ(), func() error { return nil }); err == nil {
		t.Error("expected an error when nothing starts")
	}
}
