// Lint-staged config for the Go module
export default {
    // One function so formatting finishes before the checks read the files
    "*.go": (files) => [
        `gofmt -w ${files.map((f) => JSON.stringify(f)).join(" ")}`,
        "go vet ./...",
        "go tool staticcheck ./...",
        "go test ./..."
    ],
    "go.mod": () => "go mod edit -fmt",
    "*.{mjs,md}": "prettier --write"
};
