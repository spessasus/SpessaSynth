package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// The downloads.json published next to the site, written by the build
// (src/build/downloads.ts has the same shape)
type downloadsManifest struct {
	Version   string                  `json:"version"`
	SoundBank downloadFile            `json:"soundBank"`
	Platforms map[string]downloadFile `json:"platforms"`
}

type downloadFile struct {
	// Relative to the site root, for example "soundfonts/GeneralUserGS.sf3"
	File   string `json:"file"`
	Size   int64  `json:"size"`
	SHA256 string `json:"sha256"`
}

func fetchManifest(client *http.Client, baseURL string) (downloadsManifest, error) {
	var manifest downloadsManifest
	resp, err := client.Get(baseURL + "downloads.json")
	if err != nil {
		return manifest, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return manifest, fmt.Errorf("downloads.json: server returned %s", resp.Status)
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&manifest); err != nil {
		return manifest, fmt.Errorf("downloads.json: %w", err)
	}
	return manifest, nil
}

// The file path comes from the network, so only plain relative paths are
// turned into URLs
func (f downloadFile) url(baseURL string) (string, error) {
	if f.File == "" || strings.HasPrefix(f.File, "/") || strings.Contains(f.File, "..") ||
		strings.Contains(f.File, "://") || strings.Contains(f.File, `\`) {
		return "", fmt.Errorf("invalid file path %q in downloads.json", f.File)
	}
	if f.Size <= 0 || len(f.SHA256) != sha256.Size*2 {
		return "", fmt.Errorf("missing size or hash for %q in downloads.json", f.File)
	}
	return baseURL + f.File, nil
}

// Downloads the file into target, through target.part, and only renames it
// into place when the size and hash match. progress gets the bytes so far.
func downloadVerified(client *http.Client, baseURL string, f downloadFile, target string, progress func(received int64)) error {
	url, err := f.url(baseURL)
	if err != nil {
		return err
	}
	resp, err := client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%s: server returned %s", f.File, resp.Status)
	}

	part := target + ".part"
	out, err := os.Create(part)
	if err != nil {
		return err
	}
	// Removed on every failure below, a no-op after the rename
	defer os.Remove(part)

	hash := sha256.New()
	var received int64
	buf := make([]byte, 64<<10)
	// One byte more than expected is enough to notice a wrong size
	body := io.LimitReader(resp.Body, f.Size+1)
	for {
		n, readErr := body.Read(buf)
		if n > 0 {
			if _, err := out.Write(buf[:n]); err != nil {
				out.Close()
				return err
			}
			hash.Write(buf[:n])
			received += int64(n)
			progress(received)
		}
		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil {
			out.Close()
			return readErr
		}
	}
	if err := out.Close(); err != nil {
		return err
	}
	if received != f.Size {
		return fmt.Errorf("%s: expected %d bytes, got %d", f.File, f.Size, received)
	}
	if sum := hex.EncodeToString(hash.Sum(nil)); !strings.EqualFold(sum, f.SHA256) {
		return fmt.Errorf("%s: checksum mismatch", f.File)
	}
	return os.Rename(part, target)
}
