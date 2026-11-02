package main

import (
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"testing"
)

func TestIsVersionNewer(t *testing.T) {
	cases := []struct {
		a, b string
		want bool
	}{
		{"4.4.3", "4.4.2", true},
		{"4.5.0", "4.4.9", true},
		{"5.0.0", "4.99.99", true},
		{"4.4.2", "4.4.2", false},
		{"4.4.1", "4.4.2", false},
		{"4.10.0", "4.9.0", true},
		{"4.4", "4.4.0", false},
		{"4.4.0.1", "4.4", true},
	}
	for _, c := range cases {
		if got := isVersionNewer(c.a, c.b); got != c.want {
			t.Errorf("isVersionNewer(%q, %q) = %v, want %v", c.a, c.b, got, c.want)
		}
	}
}

func portOf(t *testing.T, rawURL string) int {
	t.Helper()
	u, err := url.Parse(rawURL)
	if err != nil {
		t.Fatal(err)
	}
	port, err := strconv.Atoi(u.Port())
	if err != nil {
		t.Fatal(err)
	}
	return port
}

func fakeInstance(t *testing.T, body string) int {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/version" {
			http.NotFound(w, r)
			return
		}
		fmt.Fprint(w, body)
	}))
	t.Cleanup(srv.Close)
	return portOf(t, srv.URL)
}

func TestProbeReusesSameOrNewerInstance(t *testing.T) {
	for _, running := range []string{"4.4.2", "4.5.0"} {
		port := fakeInstance(t, `{"app":"spessasynth-local-edition","version":"`+running+`","binary":true}`)
		if !shouldReuseInstance(port, "4.4.2") {
			t.Errorf("running %s: should be reused by 4.4.2", running)
		}
	}
}

func TestProbeSkipsOlderInstance(t *testing.T) {
	port := fakeInstance(t, `{"app":"spessasynth-local-edition","version":"4.4.1","binary":true}`)
	if shouldReuseInstance(port, "4.4.2") {
		t.Error("an older instance should not be reused")
	}
}

func TestProbeSkipsOtherServers(t *testing.T) {
	// The Node server says binary false (older ones answer in plain text),
	// other apps with anything
	bodies := []string{
		`{"app":"spessasynth-local-edition","version":"9.9.9","binary":false}`,
		"4.4.2",
		`{"app":"something-else","version":"9.9.9","binary":true}`,
		"<html></html>",
	}
	for _, body := range bodies {
		port := fakeInstance(t, body)
		if shouldReuseInstance(port, "4.4.2") {
			t.Errorf("body %q should not count as an instance", body)
		}
	}
}

func TestProbeNothingListening(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := l.Addr().(*net.TCPAddr).Port
	_ = l.Close()
	if shouldReuseInstance(port, "4.4.2") {
		t.Error("a closed port should not count as an instance")
	}
}

func TestListenOrReuseFindsRunningInstance(t *testing.T) {
	port := fakeInstance(t, `{"app":"spessasynth-local-edition","version":"4.4.2","binary":true}`)
	l, gotPort, reuse, err := listenOrReuse("127.0.0.1", port, "4.4.2")
	if err != nil {
		t.Fatal(err)
	}
	if !reuse || gotPort != port || l != nil {
		t.Errorf("got reuse=%v port=%d listener=%v, want reuse of %d", reuse, gotPort, l, port)
	}
}

func TestListenOrReuseMovesPastOlderInstance(t *testing.T) {
	port := fakeInstance(t, `{"app":"spessasynth-local-edition","version":"4.0.0","binary":true}`)
	l, gotPort, reuse, err := listenOrReuse("127.0.0.1", port, "4.4.2")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	if reuse || gotPort <= port {
		t.Errorf("got reuse=%v port=%d, want a new port after %d", reuse, gotPort, port)
	}
}
