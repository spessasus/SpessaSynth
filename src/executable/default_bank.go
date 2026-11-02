package main

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"sync"
)

const (
	bankIdle        = "idle"
	bankDownloading = "downloading"
	bankDone        = "done"
	bankError       = "error"
)

type bankDownloadStatus struct {
	State    string `json:"state"`
	Received int64  `json:"received"`
	Total    int64  `json:"total"`
	Error    string `json:"error,omitempty"`
}

// The default sound bank download. Only one runs at a time, the page polls
// the status while it does.
type defaultBank struct {
	mu     sync.Mutex
	status bankDownloadStatus
}

func (d *defaultBank) get() bankDownloadStatus {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.status
}

func (d *defaultBank) update(change func(*bankDownloadStatus)) {
	d.mu.Lock()
	defer d.mu.Unlock()
	change(&d.status)
}

// Starts the download unless one is already running
func (s *server) startDefaultBank(w http.ResponseWriter, r *http.Request) {
	d := s.defaultBank
	d.mu.Lock()
	if d.status.State == bankDownloading {
		d.mu.Unlock()
		w.WriteHeader(http.StatusAccepted)
		return
	}
	d.status = bankDownloadStatus{State: bankDownloading}
	d.mu.Unlock()

	go func() {
		err := s.downloadDefaultBank()
		d.update(func(st *bankDownloadStatus) {
			if err != nil {
				fmt.Println("Could not download the default sound bank:", err)
				st.State = bankError
				st.Error = err.Error()
				return
			}
			st.State = bankDone
		})
	}()
	w.WriteHeader(http.StatusAccepted)
}

func (s *server) defaultBankStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, s.defaultBank.get())
}

func (s *server) downloadDefaultBank() error {
	manifest, err := fetchManifest(s.client, s.baseURL)
	if err != nil {
		return err
	}
	name := path.Base(manifest.SoundBank.File)
	if !isSafeBankName(name) {
		return fmt.Errorf("invalid sound bank name %q in downloads.json", name)
	}
	target := filepath.Join(s.paths.soundBanks, name)
	// Never overwrite a bank the user already has
	if _, err := os.Stat(target); err == nil {
		return nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}

	fmt.Printf("Downloading %s...\n", name)
	s.defaultBank.update(func(st *bankDownloadStatus) { st.Total = manifest.SoundBank.Size })
	err = downloadVerified(s.client, s.baseURL, manifest.SoundBank, target, func(received int64) {
		s.defaultBank.update(func(st *bankDownloadStatus) { st.Received = received })
	})
	if err == nil {
		fmt.Printf("Downloaded %s.\n", name)
	}
	return err
}
