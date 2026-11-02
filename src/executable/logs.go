package main

import (
	"errors"
	"io"
	"log"
	"os"
	"path/filepath"
)

// Copies everything printed to the console into logs/latest.log as well.
// Launched from a file manager there may be no console to read, so the
// log file is the only record. The previous run is kept as previous.log.
type logTee struct {
	file    *os.File
	console *os.File
	writer  *os.File
	done    chan struct{}
}

// Writes to the console when there is one. Errors are ignored, since a
// missing console must not stop the log file.
type bestEffortWriter struct{ w io.Writer }

func (b bestEffortWriter) Write(p []byte) (int, error) {
	_, _ = b.w.Write(p)
	return len(p), nil
}

func startLogs(dir string) (*logTee, error) {
	latest := filepath.Join(dir, "latest.log")
	if err := os.Rename(latest, filepath.Join(dir, "previous.log")); err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	file, err := os.Create(latest)
	if err != nil {
		return nil, err
	}
	reader, writer, err := os.Pipe()
	if err != nil {
		file.Close()
		return nil, err
	}
	t := &logTee{file: file, console: os.Stdout, writer: writer, done: make(chan struct{})}
	go func() {
		_, _ = io.Copy(io.MultiWriter(file, bestEffortWriter{t.console}), reader)
		close(t.done)
	}()
	os.Stdout = writer
	os.Stderr = writer
	log.SetOutput(writer)
	return t, nil
}

// Waits until everything printed so far reached the file
func (t *logTee) close() {
	os.Stdout = t.console
	os.Stderr = t.console
	log.SetOutput(t.console)
	_ = t.writer.Close()
	<-t.done
	_ = t.file.Close()
}
