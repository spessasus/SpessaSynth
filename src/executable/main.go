// SpessaSynth Local Edition as a single executable.
// The web app is embedded
package main

import (
	"bufio"
	"embed"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"time"
)

// Set with -ldflags "-X main.version=... -X main.baseURL=..." by the build script
var (
	version = "0.0.0"
	// Where downloads.json and the default sound bank live
	baseURL = "https://spessasus.github.io/SpessaSynth/"
)

//go:embed web
var embedded embed.FS

const (
	defaultPort = 8181
	// Long enough for a page reload or a leader tab change
	shutdownGrace = 10 * time.Second
	// How long to wait for the first tab before giving up
	firstTabTimeout = 60 * time.Second
	// Set for the new process after an update
	restartedEnv = "SPESSASYNTH_RESTARTED"
)

var logs *logTee

// Flushes the log file before leaving
func exit(code int) {
	if logs != nil {
		logs.close()
	}
	os.Exit(code)
}

// A double-clicked exe on Windows closes its console right away, so wait
// for Enter there or the error could never be read
func fail(err error) {
	fmt.Println("Error:", err)
	if runtime.GOOS == "windows" {
		fmt.Println("Press Enter to close this window.")
		_, _ = bufio.NewReader(os.Stdin).ReadString('\n')
	}
	exit(1)
}

func main() {
	lanFlag := flag.Bool("lan", false, "listen on all network interfaces, not just this computer")
	launcherFlag := flag.Bool("install-launcher", false, "add SpessaSynth to the applications menu (Linux) and exit")
	noUpdateFlag := flag.Bool("no-update-check", false, "do not check for a newer version")
	flag.Parse()

	web, err := fs.Sub(embedded, "web")
	if err != nil {
		fail(err)
	}
	env, err := currentEnvironment()
	if err != nil {
		fail(err)
	}
	dataDir, err := resolveDataDir(env)
	if err != nil {
		fail(err)
	}
	paths, err := ensureDataDirs(dataDir)
	if err != nil {
		fail(err)
	}
	if logs, err = startLogs(paths.logs); err != nil {
		fmt.Println("Could not write the log file:", err)
	}

	fmt.Printf("\nSpessaSynth: Local Edition, version %s\n", version)
	fmt.Println("This project is licensed under Apache-2.0 license, see LICENSE file for more details.")
	fmt.Println()
	fmt.Printf("Data folder: %s\n", paths.root)

	exe, err := os.Executable()
	if err != nil {
		fail(err)
	}
	// Updates replace the real file, not a symlink pointing at it
	if resolved, err := filepath.EvalSymlinks(exe); err == nil {
		exe = resolved
	}
	removeOldExecutable(exe)

	var addLauncher func() error
	if runtime.GOOS == "linux" {
		launcher, err := linuxLauncherPaths(env, paths.root, exe)
		if err != nil {
			fail(err)
		}
		addLauncher = func() error { return installLauncher(launcher, web) }
	}
	if *launcherFlag {
		if addLauncher == nil {
			fail(fmt.Errorf("--install-launcher is only supported on Linux"))
		}
		if err := addLauncher(); err != nil {
			fail(err)
		}
		fmt.Println("Added SpessaSynth to the applications menu.")
		exit(0)
	}

	conf, err := loadConfig(paths.config)
	if err != nil {
		fail(err)
	}

	// Filled in once the server exists, a boot-time update restarts before that
	var httpServer *http.Server
	var alive *aliveTracker
	var upd *updater
	if conf.CheckForUpdates() && !*noUpdateFlag {
		upd = newUpdater(updaterOptions{
			client:   &http.Client{Timeout: 10 * time.Minute},
			baseURL:  baseURL,
			current:  version,
			platform: platformKey(runtime.GOOS, runtime.GOARCH),
			exe:      exe,
			goos:     runtime.GOOS,
			restart: func() {
				if alive != nil {
					alive.disable()
				}
				// The new version needs the port, and the page reconnects to it
				if httpServer != nil {
					_ = httpServer.Close()
				}
				restartProcess(exe, httpServer != nil, upd.rollback)
			},
		})
		if conf.AutoUpdate() {
			upd.runCheck()
			if st := upd.status(); st.Available && st.CanInstall {
				if err := upd.install(); err != nil {
					fmt.Println("The update failed, starting this version:", err)
				}
			}
		} else {
			upd.startCheck()
		}
	}

	host := conf.Host()
	if *lanFlag {
		host = "0.0.0.0"
	}
	ip := net.ParseIP(host)
	lan := host != "localhost" && (ip == nil || !ip.IsLoopback())
	if lan {
		fmt.Println()
		fmt.Printf("WARNING: listening on %s. Other devices on the network can reach SpessaSynth\n", host)
		fmt.Println("and change its settings. Auto-shutdown is off, close this window to stop it.")
		fmt.Println()
	}

	listener, port, reuse, err := listenOrReuse(host, defaultPort, version)
	if err != nil {
		fail(err)
	}
	url := "http://localhost:" + strconv.Itoa(port)
	if reuse {
		fmt.Printf("SpessaSynth is already running on %s, opening it.\n", url)
		openURL(url)
		exit(0)
	}

	var onIdle func(string)
	if conf.AutoShutdown() && !lan {
		onIdle = func(reason string) {
			fmt.Println(reason + ".")
			exit(0)
		}
	}
	alive = newAliveTracker(shutdownGrace, firstTabTimeout, onIdle)

	httpServer = &http.Server{Handler: newServer(conf, paths, web, serverOptions{
		lan:             lan,
		baseURL:         baseURL,
		client:          &http.Client{Timeout: 10 * time.Minute},
		alive:           alive,
		openFolder:      openFolder,
		installLauncher: addLauncher,
		updater:         upd,
	}).handler()}

	fmt.Printf("Running on %s. A browser window should open.\n", url)
	if onIdle != nil {
		fmt.Println("SpessaSynth closes by itself once its last tab is closed.")
	}
	alive.start()
	if os.Getenv(restartedEnv) == "" {
		openURL(url)
	}
	err = httpServer.Serve(listener)
	if errors.Is(err, http.ErrServerClosed) {
		// Closed for an update restart, which exits the process when the new version does
		select {}
	}
	fail(err)
}

// Starts the new executable in this console with the same arguments, then
// leaves with its exit code. tabOpen is false for an update at startup,
// the new version opens the browser itself then.
func restartProcess(exe string, tabOpen bool, rollback func() error) {
	// The new process writes the log file itself
	if logs != nil {
		logs.close()
		logs = nil
	}
	env := os.Environ()
	if tabOpen {
		// The open tab reloads by itself, so no new one
		env = append(env, restartedEnv+"=1")
	}
	cmd, err := startReplacement(exe, os.Args[1:], env, rollback)
	if err != nil {
		fail(err)
	}
	err = cmd.Wait()
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		os.Exit(exitErr.ExitCode())
	}
	if err != nil {
		fail(err)
	}
	os.Exit(0)
}
