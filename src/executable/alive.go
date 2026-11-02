package main

import (
	"fmt"
	"net/http"
	"sync"
	"time"
)

const (
	reasonLastTab = "Closed because the last tab disconnected"
	reasonNoTab   = "Closed because no browser tab connected"
)

// Counts open /api/alive connections and asks for a shutdown once the last
// one is gone. The page keeps one open (one tab at a time, see local_main.ts).
type aliveTracker struct {
	mu    sync.Mutex
	count int
	timer *time.Timer
	// Bumped for every timer, a timer that fired late checks it is still the current one
	generation int
	// Waits this long after the last disconnect, so reloads survive
	grace time.Duration
	// Waits this long for the first tab before giving up
	initial time.Duration
	// Nil disables the shutdown, the connections are still counted
	onIdle func(reason string)
}

func newAliveTracker(grace, initial time.Duration, onIdle func(reason string)) *aliveTracker {
	return &aliveTracker{grace: grace, initial: initial, onIdle: onIdle}
}

// Arms the initial timeout. Called once the server is listening.
func (a *aliveTracker) start() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.onIdle == nil {
		return
	}
	a.arm(a.initial, reasonNoTab)
}

// Starts a new timer, the caller holds the lock
func (a *aliveTracker) arm(after time.Duration, reason string) {
	a.generation++
	generation := a.generation
	a.timer = time.AfterFunc(after, func() { a.fire(reason, generation) })
}

func (a *aliveTracker) timerGeneration() int {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.generation
}

// Stops the shutdown for good, used while restarting after an update
func (a *aliveTracker) disable() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.onIdle = nil
	if a.timer != nil {
		a.timer.Stop()
		a.timer = nil
	}
}

func (a *aliveTracker) connections() int {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.count
}

// The timer may fire just as a tab connects, so check again under the lock.
// Stop does not stop a callback that already started, so a timer that
// was replaced in the meantime does nothing.
func (a *aliveTracker) fire(reason string, generation int) {
	a.mu.Lock()
	onIdle := a.onIdle
	idle := a.count == 0 && generation == a.generation
	a.mu.Unlock()
	if idle && onIdle != nil {
		onIdle(reason)
	}
}

func (a *aliveTracker) connect() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.count++
	a.generation++
	if a.timer != nil {
		a.timer.Stop()
		a.timer = nil
	}
}

func (a *aliveTracker) disconnect() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.count--
	if a.count == 0 && a.onIdle != nil {
		a.arm(a.grace, reasonLastTab)
	}
}

func (a *aliveTracker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	fmt.Fprint(w, ": connected\n\n")
	flusher.Flush()

	a.connect()
	defer a.disconnect()

	// Comments keep proxies and the browser from timing the stream out
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			fmt.Fprint(w, ": ping\n\n")
			flusher.Flush()
		}
	}
}
