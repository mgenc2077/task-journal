package main

import (
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "42061"
	}
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "taskjournal.db"
	}

	verbose := flag.Bool("v", false, "enable debug logging")
	flag.Parse()

	logLevel := slog.LevelInfo
	if *verbose || os.Getenv("LOG_LEVEL") == "debug" {
		logLevel = slog.LevelDebug
	}
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: logLevel})))

	holder, err := newDBHolder(dbPath)
	if err != nil {
		slog.Error("failed to open database", "error", err)
		os.Exit(1)
	}
	defer holder.close()

	a := &app{holder: holder}

	mux := http.NewServeMux()
	mux.HandleFunc("/sync", a.handleSync)
	mux.HandleFunc("/rebuild", a.handleRebuild)

	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit
		slog.Info("shutting down")
		holder.close()
		if err := server.Close(); err != nil {
			slog.Error("server close error", "error", err)
		}
	}()

	slog.Info("sync-engine listening", "port", port, "db", dbPath, "log_level", logLevel)
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
	fmt.Println("exited")
}
