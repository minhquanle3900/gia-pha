package main

import (
	"fmt"
	"io"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

const address = "127.0.0.1:4315"
const origin = "http://" + address
const markerPath = "/.well-known/coi-nguon-gift-edition"
const disabledMessage = `{"error":"AI chưa được kích hoạt trong Bản Quà Tặng."}`

// The packager sets this to the exact application commit included in dist.
var release = "development"

func main() {
	if err := launch(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func launch() error {
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	assets := filepath.Join(filepath.Dir(executable), "dist")
	for _, file := range []string{"index.html", "sw.js", "manifest.webmanifest"} {
		if info, err := os.Stat(filepath.Join(assets, file)); err != nil || !info.Mode().IsRegular() {
			return fmt.Errorf("Extract the full ZIP first. Missing or invalid dist/%s.", file)
		}
	}

	serveOnly := len(os.Args) == 2 && os.Args[1] == "--serve-only"
	listener, err := net.Listen("tcp4", address)
	if err != nil {
		if sameReleaseIsRunning() {
			fmt.Println("Gift Edition is already open at " + origin)
			if !serveOnly {
				openBrowser()
			}
			return nil
		}
		return fmt.Errorf("Port 4315 is in use. Close the program using it and try again. Gift Edition keeps the same address to preserve access to your browser data.")
	}
	defer listener.Close()

	for extension, contentType := range map[string]string{
		".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".woff2": "font/woff2",
		".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp",
	} {
		if err := mime.AddExtensionType(extension, contentType); err != nil {
			return err
		}
	}
	server := &http.Server{Handler: giftHandler(assets), ReadHeaderTimeout: 5 * time.Second}
	fmt.Println("Coi Nguon Gift Edition is open at " + origin)
	fmt.Println("Keep this window open. Close it after you finish saving.")
	if !serveOnly {
		openBrowser()
	}
	return server.Serve(listener)
}

func giftHandler(assets string) http.Handler {
	files := http.FileServer(http.Dir(assets))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host != address {
			http.Error(w, "Use the local Gift Edition address.", http.StatusBadRequest)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		switch {
		case r.Method == http.MethodGet && r.URL.Path == markerPath:
			w.Header().Set("Cache-Control", "no-store")
			fmt.Fprint(w, "coi-nguon-gift-edition:"+release)
		case r.URL.Path == "/api/biography/generate":
			w.Header().Set("Cache-Control", "no-store")
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusForbidden)
			fmt.Fprint(w, disabledMessage)
		case r.Method == http.MethodGet || r.Method == http.MethodHead:
			files.ServeHTTP(w, r)
		default:
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "Method not allowed.", http.StatusMethodNotAllowed)
		}
	})
}

func sameReleaseIsRunning() bool {
	client := &http.Client{
		Timeout:       900 * time.Millisecond,
		Transport:     &http.Transport{},
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse },
	}
	defer client.CloseIdleConnections()
	resp, err := client.Get(origin + markerPath)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 128))
	return err == nil && resp.StatusCode == http.StatusOK && string(body) == "coi-nguon-gift-edition:"+release
}

func openBrowser() {
	if runtime.GOOS != "windows" {
		return
	}
	runner := filepath.Join(os.Getenv("SystemRoot"), "System32", "rundll32.exe")
	if err := exec.Command(runner, "url.dll,FileProtocolHandler", origin+"/").Start(); err != nil {
		fmt.Println("Open " + origin + " in your browser.")
	}
}
