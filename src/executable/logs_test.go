package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLogsRotateAndCapture(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "latest.log"), []byte("old run\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	// Keep the test output clean, the console copy goes to a temp file
	console, err := os.CreateTemp(t.TempDir(), "console")
	if err != nil {
		t.Fatal(err)
	}
	realStdout, realStderr := os.Stdout, os.Stderr
	os.Stdout = console
	defer func() { os.Stdout, os.Stderr = realStdout, realStderr }()

	tee, err := startLogs(dir)
	if err != nil {
		t.Fatal(err)
	}
	fmt.Println("hello from stdout")
	fmt.Fprintln(os.Stderr, "hello from stderr")
	tee.close()

	latest, err := os.ReadFile(filepath.Join(dir, "latest.log"))
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"hello from stdout", "hello from stderr"} {
		if !strings.Contains(string(latest), want) {
			t.Errorf("latest.log is missing %q: %q", want, latest)
		}
	}
	previous, err := os.ReadFile(filepath.Join(dir, "previous.log"))
	if err != nil || string(previous) != "old run\n" {
		t.Errorf("previous.log: %q %v", previous, err)
	}
	shown, _ := os.ReadFile(console.Name())
	if !strings.Contains(string(shown), "hello from stdout") {
		t.Errorf("console copy is missing the output: %q", shown)
	}
}
