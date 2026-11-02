package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	updateIdle        = "idle"
	updateDownloading = "downloading"
	updateRestarting  = "restarting"
	updateError       = "error"
	// No real executable is this big, protects against a broken archive
	maxExecutableSize = 512 << 20
)

type updateStatus struct {
	Current   string `json:"current"`
	Latest    string `json:"latest"`
	Available bool   `json:"available"`
	// False when the executable's folder is not writable, the page then
	// links to the download page instead
	CanInstall   bool   `json:"canInstall"`
	DownloadPage string `json:"downloadPage"`
	State        string `json:"state"`
	Received     int64  `json:"received"`
	Total        int64  `json:"total"`
	Error        string `json:"error,omitempty"`
}

type updaterOptions struct {
	client  *http.Client
	baseURL string
	current string
	// Key in downloads.json, empty when there are no builds for this system
	platform string
	exe      string
	goos     string
	// Starts the new executable, called once it replaced the old one
	restart func()
}

// Checks downloads.json for a newer version and replaces the executable
// with it when asked to
type updater struct {
	updaterOptions
	mu          sync.Mutex
	checked     chan struct{}
	checkedOnce sync.Once
	latest      downloadsManifest
	st          updateStatus
	// The previous executable after a swap, kept for a rollback
	old string
}

func newUpdater(opts updaterOptions) *updater {
	return &updater{
		updaterOptions: opts,
		checked:        make(chan struct{}),
		st:             updateStatus{Current: opts.current, State: updateIdle, DownloadPage: opts.baseURL},
	}
}

// The downloads.json key for this system
func platformKey(goos, goarch string) string {
	switch {
	case goos == "windows" && goarch == "amd64":
		return "win-x64"
	case goos == "linux" && goarch == "amd64":
		return "linux-x64"
	case goos == "linux" && goarch == "arm64":
		return "linux-arm64"
	}
	return ""
}

func (u *updater) executableName() string {
	if u.goos == "windows" {
		return "SpessaSynth.exe"
	}
	return "SpessaSynth"
}

// Fails quietly, being offline is normal
func (u *updater) check() {
	// The download client waits minutes, the check should not
	quick := *u.client
	quick.Timeout = 5 * time.Second
	manifest, err := fetchManifest(&quick, u.baseURL)
	if err != nil {
		fmt.Println("Could not check for updates:", err)
		return
	}
	_, hasBuild := manifest.Platforms[u.platform]
	available := u.platform != "" && hasBuild && isVersionNewer(manifest.Version, u.current)

	u.mu.Lock()
	defer u.mu.Unlock()
	u.latest = manifest
	u.st.Latest = manifest.Version
	u.st.Available = available
	u.st.CanInstall = available && isWritable(filepath.Dir(u.exe))
	if available {
		fmt.Printf("SpessaSynth %s is available (this is %s).\n", manifest.Version, u.current)
	}
}

// Checks and lets waitStatus know the result is in
func (u *updater) runCheck() {
	u.check()
	u.checkedOnce.Do(func() { close(u.checked) })
}

// Runs the check in the background, waitStatus waits for it
func (u *updater) startCheck() {
	go u.runCheck()
}

func (u *updater) status() updateStatus {
	u.mu.Lock()
	defer u.mu.Unlock()
	return u.st
}

// The page asks right after loading, so give the check a moment to finish
func (u *updater) waitStatus(timeout time.Duration) updateStatus {
	select {
	case <-u.checked:
	case <-time.After(timeout):
	}
	return u.status()
}

// Creating a file is the only reliable test, permissions alone lie on
// Windows and on read-only mounts
func isWritable(dir string) bool {
	f, err := os.CreateTemp(dir, ".spessasynth-write-test-*")
	if err != nil {
		return false
	}
	name := f.Name()
	f.Close()
	return os.Remove(name) == nil
}

// Marks the update as started and returns what to download. Checked and
// set under one lock, so a second request cannot start another update.
func (u *updater) begin() (downloadFile, error) {
	u.mu.Lock()
	defer u.mu.Unlock()
	entry, ok := u.latest.Platforms[u.platform]
	if !u.st.Available || !u.st.CanInstall || !ok {
		return entry, errors.New("no update can be installed")
	}
	if u.st.State == updateDownloading || u.st.State == updateRestarting {
		return entry, errors.New("an update is already running")
	}
	u.st.State = updateDownloading
	u.st.Error = ""
	u.st.Total = entry.Size
	u.st.Received = 0
	return entry, nil
}

// Downloads, verifies and swaps in the new executable, then restarts
func (u *updater) finish(entry downloadFile) error {
	err := u.replace(entry)
	u.mu.Lock()
	if err != nil {
		u.st.State = updateError
		u.st.Error = err.Error()
		u.mu.Unlock()
		return err
	}
	u.st.State = updateRestarting
	u.mu.Unlock()

	fmt.Printf("Updated to SpessaSynth %s, restarting...\n", u.latest.Version)
	u.restart()
	return nil
}

func (u *updater) install() error {
	entry, err := u.begin()
	if err != nil {
		return err
	}
	return u.finish(entry)
}

// Puts the previous executable back, for when the new one does not start
func (u *updater) rollback() error {
	u.mu.Lock()
	old := u.old
	u.mu.Unlock()
	if old == "" {
		return errors.New("nothing to roll back to")
	}
	return os.Rename(old, u.exe)
}

func (u *updater) replace(entry downloadFile) error {
	dir := filepath.Dir(u.exe)
	archive := filepath.Join(dir, ".spessasynth-update-"+filepath.Base(entry.File))
	defer os.Remove(archive)
	err := downloadVerified(u.client, u.baseURL, entry, archive, func(received int64) {
		u.mu.Lock()
		u.st.Received = received
		u.mu.Unlock()
	})
	if err != nil {
		return err
	}

	next := u.exe + ".new"
	defer os.Remove(next)
	if strings.HasSuffix(entry.File, ".zip") {
		err = extractFromZip(archive, u.executableName(), next)
	} else {
		err = extractFromTarGz(archive, u.executableName(), next)
	}
	if err != nil {
		return err
	}
	if err := os.Chmod(next, 0o755); err != nil {
		return err
	}

	// A running exe cannot be replaced or deleted on Windows, but it can be
	// renamed. Linux does the same, which keeps the old one for a rollback.
	// The name is unique because an earlier old file may still be running
	// (the process that started this one) and cannot be touched.
	old := fmt.Sprintf("%s.old-%d-%d", u.exe, os.Getpid(), time.Now().UnixNano())
	if err := os.Rename(u.exe, old); err != nil {
		return err
	}
	if err := os.Rename(next, u.exe); err != nil {
		// Put the old one back so SpessaSynth still starts
		_ = os.Rename(old, u.exe)
		return err
	}
	u.mu.Lock()
	u.old = old
	u.mu.Unlock()
	return nil
}

// Removes what updates left behind. Files still in use (Windows) fail and
// are retried on the next start.
func removeOldExecutable(exe string) {
	matches, _ := filepath.Glob(exe + ".old-*")
	for _, old := range matches {
		_ = os.Remove(old)
	}
}

// Starts the new executable. If it does not start (an antivirus may block
// a fresh unsigned file), the old one is put back and started instead.
func startReplacement(exe string, args, env []string, rollback func() error) (*exec.Cmd, error) {
	start := func() (*exec.Cmd, error) {
		cmd := exec.Command(exe, args...)
		cmd.Env = env
		cmd.Stdin = os.Stdin
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		return cmd, cmd.Start()
	}
	cmd, err := start()
	if err == nil {
		return cmd, nil
	}
	fmt.Println("Could not start the new version:", err)
	if rollbackErr := rollback(); rollbackErr != nil {
		return nil, fmt.Errorf("%w, and the old version could not be restored: %v", err, rollbackErr)
	}
	fmt.Println("Starting the previous version again.")
	return start()
}

func writeLimited(target string, r io.Reader) error {
	out, err := os.Create(target)
	if err != nil {
		return err
	}
	n, err := io.Copy(out, io.LimitReader(r, maxExecutableSize+1))
	if closeErr := out.Close(); err == nil {
		err = closeErr
	}
	if err == nil && n > maxExecutableSize {
		err = errors.New("the executable in the update is too large")
	}
	return err
}

func extractFromZip(archive, name, target string) error {
	zr, err := zip.OpenReader(archive)
	if err != nil {
		return err
	}
	defer zr.Close()
	for _, f := range zr.File {
		if f.Name != name {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		defer rc.Close()
		return writeLimited(target, rc)
	}
	return fmt.Errorf("the update does not contain %s", name)
}

func extractFromTarGz(archive, name, target string) error {
	file, err := os.Open(archive)
	if err != nil {
		return err
	}
	defer file.Close()
	gz, err := gzip.NewReader(file)
	if err != nil {
		return err
	}
	tr := tar.NewReader(gz)
	for {
		header, err := tr.Next()
		if errors.Is(err, io.EOF) {
			return fmt.Errorf("the update does not contain %s", name)
		}
		if err != nil {
			return err
		}
		if header.Name == name && header.Typeflag == tar.TypeReg {
			return writeLimited(target, tr)
		}
	}
}
