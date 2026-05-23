package main

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

type app struct {
	holder *dbHolder
}

func (a *app) handleSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		slog.Debug("sync rejected: method not allowed", "method", r.Method, "remote", r.RemoteAddr)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	slog.Info("sync request received", "remote", r.RemoteAddr)

	db := a.holder.get()

	var req SyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		slog.Debug("sync rejected: invalid request body", "error", err)
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Message: "invalid request body"})
		return
	}

	slog.Debug("sync payload", "last_sync_at", req.LastSyncAt, "tasks", len(req.Tasks), "repeated_tasks", len(req.RepeatedTasks), "categories", len(req.Categories))

	for _, c := range req.Categories {
		if err := upsertCategory(db, c); err != nil {
			slog.Error("upsert category failed", "id", c.ID, "error", err)
		}
	}
	for _, rt := range req.RepeatedTasks {
		if err := upsertRepeatedTask(db, rt); err != nil {
			slog.Error("upsert repeated task failed", "id", rt.ID, "error", err)
		}
	}
	for _, t := range req.Tasks {
		if err := upsertTask(db, t); err != nil {
			slog.Error("upsert task failed", "id", t.ID, "error", err)
		}
	}

	tasks, err := getTasksSince(db, req.LastSyncAt)
	if err != nil {
		slog.Error("get tasks since failed", "since", req.LastSyncAt, "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Message: "database error"})
		return
	}
	repeatedTasks, err := getRepeatedTasksSince(db, req.LastSyncAt)
	if err != nil {
		slog.Error("get repeated tasks since failed", "since", req.LastSyncAt, "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Message: "database error"})
		return
	}
	categories, err := getCategoriesSince(db, req.LastSyncAt)
	if err != nil {
		slog.Error("get categories since failed", "since", req.LastSyncAt, "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Message: "database error"})
		return
	}

	syncedAt := nowMs()
	markInitialized(db)
	slog.Info("sync completed", "synced_at", syncedAt, "tasks_returned", len(tasks), "repeated_tasks_returned", len(repeatedTasks), "categories_returned", len(categories))

	writeJSON(w, http.StatusOK, SyncResponse{
		SyncedAt:      syncedAt,
		Tasks:         tasks,
		RepeatedTasks: repeatedTasks,
		Categories:    categories,
	})
}

func (a *app) handleRebuild(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		slog.Debug("rebuild rejected: method not allowed", "method", r.Method, "remote", r.RemoteAddr)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	slog.Info("rebuild request received", "remote", r.RemoteAddr, "content_length", r.ContentLength)

	data, err := io.ReadAll(r.Body)
	if err != nil {
		slog.Error("rebuild failed to read body", "error", err)
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Message: "failed to read body"})
		return
	}

	if len(data) == 0 {
		slog.Debug("rebuild rejected: empty body")
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Message: "empty body"})
		return
	}

	if !isSQLite(data) {
		slog.Debug("rebuild rejected: not a valid SQLite database", "size", len(data))
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Message: "not a valid SQLite database"})
		return
	}

	slog.Debug("rebuild: valid SQLite file received", "size", len(data))

	if err := a.holder.rebuildAndReload(data); err != nil {
		slog.Error("rebuild failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Message: "rebuild failed"})
		return
	}

	syncedAt := nowMs()
	slog.Info("rebuild completed", "synced_at", syncedAt)

	writeJSON(w, http.StatusOK, RebuildResponse{
		Message:  "Database rebuilt",
		SyncedAt: syncedAt,
	})
}

func isSQLite(data []byte) bool {
	if len(data) < 16 {
		return false
	}
	header := string(data[:16])
	return strings.HasPrefix(header, "SQLite format 3")
}

func nowMs() int64 {
	return time.Now().UnixMilli()
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
