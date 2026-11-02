package main

import (
	"errors"
	"fmt"
	"os/exec"
	"runtime"
)

// Opens the URL in the default browser. No shell is involved, the URL is
// passed as a single argument.
func openURL(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		fmt.Println("Could not open the browser. Open the link below:")
		fmt.Println(url)
		return
	}
	if err := cmd.Start(); err != nil {
		fmt.Println("Could not open the browser:", err)
		fmt.Println("Open the link below:")
		fmt.Println(url)
		return
	}
	// Reap the process so it does not linger as a zombie
	go func() { _ = cmd.Wait() }()
}

// Shows the folder in the file manager
func openFolder(dir string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "linux":
		if _, err := exec.LookPath("xdg-open"); err != nil {
			return errors.New("xdg-open is not installed, open the folder by hand: " + dir)
		}
		cmd = exec.Command("xdg-open", dir)
	case "windows":
		cmd = exec.Command("explorer", dir)
	default:
		return errors.New("opening folders is not supported here, open it by hand: " + dir)
	}
	if err := cmd.Start(); err != nil {
		return err
	}
	// The exit code is ignored, explorer.exe returns 1 even when it worked
	go func() { _ = cmd.Wait() }()
	return nil
}
