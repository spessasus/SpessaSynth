package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// Same comparison as the Node server's isVersionNewer
func isVersionNewer(newerThan, olderThan string) bool {
	a := strings.Split(newerThan, ".")
	b := strings.Split(olderThan, ".")
	for i := 0; i < max(len(a), len(b)); i++ {
		var na, nb int
		if i < len(a) {
			na, _ = strconv.Atoi(a[i])
		}
		if i < len(b) {
			nb, _ = strconv.Atoi(b[i])
		}
		if na != nb {
			return na > nb
		}
	}
	return false
}

// Asks whatever is on the port if it is a SpessaSynth executable at least
// as new as this one. The Node server does not count, it uses its own
// folders.
func shouldReuseInstance(port int, current string) bool {
	client := http.Client{Timeout: time.Second}
	// Always 127.0.0.1: localhost may resolve to ::1 first, and the server
	// only listens on IPv4
	resp, err := client.Get("http://127.0.0.1:" + strconv.Itoa(port) + "/api/version")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	var info versionInfo
	if resp.StatusCode != http.StatusOK || json.NewDecoder(resp.Body).Decode(&info) != nil {
		return false
	}
	return info.App == appID && info.Binary && !isVersionNewer(current, info.Version)
}

// Binds the first free port from start on. When a port is taken by a
// SpessaSynth that can be reused, it returns that port with reuse set
// instead of a listener.
// Windows reports a taken port as WSAEADDRINUSE, not EADDRINUSE, so any
// error moves on to the next port and only the last one is returned.
func listenOrReuse(host string, start int, current string) (listener net.Listener, port int, reuse bool, err error) {
	for port = start; port < start+100; port++ {
		listener, err = net.Listen("tcp", net.JoinHostPort(host, strconv.Itoa(port)))
		if err == nil {
			return listener, port, false, nil
		}
		if shouldReuseInstance(port, current) {
			return nil, port, true, nil
		}
		fmt.Printf("Port %d seems to be occupied, trying a different one...\n", port)
	}
	return nil, 0, false, err
}
