package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// Records why the tracker asked to shut down
type idleRecorder chan string

func (r idleRecorder) onIdle(reason string) {
	r <- reason
}

func (r idleRecorder) expect(t *testing.T, within time.Duration) string {
	t.Helper()
	select {
	case reason := <-r:
		return reason
	case <-time.After(within):
		t.Fatal("expected a shutdown")
		return ""
	}
}

func (r idleRecorder) expectNone(t *testing.T, during time.Duration) {
	t.Helper()
	select {
	case reason := <-r:
		t.Fatalf("unexpected shutdown: %s", reason)
	case <-time.After(during):
	}
}

// Opens an SSE connection and returns a function that closes it
func connectAlive(t *testing.T, url string) func() {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.Header.Get("Content-Type") != "text/event-stream" {
		t.Errorf("unexpected content type %q", resp.Header.Get("Content-Type"))
	}
	return func() {
		cancel()
		_ = resp.Body.Close()
	}
}

func newAliveServer(t *testing.T, grace, initial time.Duration) (*aliveTracker, idleRecorder, string) {
	t.Helper()
	rec := make(idleRecorder, 4)
	a := newAliveTracker(grace, initial, rec.onIdle)
	srv := httptest.NewServer(a)
	t.Cleanup(srv.Close)
	a.start()
	return a, rec, srv.URL
}

func TestAliveShutsDownWhenNobodyConnects(t *testing.T) {
	_, rec, _ := newAliveServer(t, 50*time.Millisecond, 100*time.Millisecond)
	reason := rec.expect(t, time.Second)
	if reason != reasonNoTab {
		t.Errorf("unexpected reason %q", reason)
	}
}

func TestAliveShutsDownAfterLastTabCloses(t *testing.T) {
	_, rec, url := newAliveServer(t, 100*time.Millisecond, 50*time.Millisecond)
	closeTab := connectAlive(t, url)
	// The initial timeout does not apply once a tab connected
	rec.expectNone(t, 200*time.Millisecond)
	closeTab()
	if reason := rec.expect(t, time.Second); reason != reasonLastTab {
		t.Errorf("unexpected reason %q", reason)
	}
}

func TestAliveSurvivesReconnectWithinGrace(t *testing.T) {
	_, rec, url := newAliveServer(t, 300*time.Millisecond, time.Hour)
	closeFirst := connectAlive(t, url)
	closeFirst()
	// A reload reconnects quickly
	time.Sleep(50 * time.Millisecond)
	closeSecond := connectAlive(t, url)
	rec.expectNone(t, 500*time.Millisecond)
	closeSecond()
	rec.expect(t, time.Second)
}

func TestAliveCountsSeveralConnections(t *testing.T) {
	a, rec, url := newAliveServer(t, 100*time.Millisecond, time.Hour)
	closeA := connectAlive(t, url)
	closeB := connectAlive(t, url)
	waitFor(t, func() bool { return a.connections() == 2 })
	closeA()
	rec.expectNone(t, 300*time.Millisecond)
	closeB()
	rec.expect(t, time.Second)
}

func TestAliveDisabled(t *testing.T) {
	a := newAliveTracker(10*time.Millisecond, 10*time.Millisecond, nil)
	srv := httptest.NewServer(a)
	defer srv.Close()
	a.start()
	closeTab := connectAlive(t, srv.URL)
	closeTab()
	// Nothing to observe except that it does not panic and still serves
	time.Sleep(50 * time.Millisecond)
	connectAlive(t, srv.URL)()
}

func TestAliveDisableStopsPendingShutdown(t *testing.T) {
	a, rec, url := newAliveServer(t, 100*time.Millisecond, time.Hour)
	closeTab := connectAlive(t, url)
	closeTab()
	// The grace timer is running now, an update restart turns it off
	waitFor(t, func() bool { return a.connections() == 0 })
	a.disable()
	rec.expectNone(t, 300*time.Millisecond)
}

func waitFor(t *testing.T, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatal("condition not met in time")
		}
		time.Sleep(5 * time.Millisecond)
	}
}

// A timer that already fired but waited for the lock must not act after a
// newer timer was armed
func TestAliveIgnoresStaleTimer(t *testing.T) {
	rec := make(idleRecorder, 4)
	a := newAliveTracker(time.Hour, time.Hour, rec.onIdle)
	a.connect()
	a.disconnect()
	stale := a.timerGeneration()
	a.connect()
	a.disconnect()
	a.fire(reasonLastTab, stale)
	rec.expectNone(t, 50*time.Millisecond)
}
