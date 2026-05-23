package main

import (
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"sync"

	_ "github.com/ncruces/go-sqlite3/driver"
)

const schema = `
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);

CREATE TABLE IF NOT EXISTS repeated_tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    default_notes TEXT NOT NULL DEFAULT '',
    category_id TEXT REFERENCES categories(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
`

type dbHolder struct {
	mu     sync.Mutex
	db     *sql.DB
	dbPath string
}

func newDBHolder(dbPath string) (*dbHolder, error) {
	db, err := openDB(dbPath)
	if err != nil {
		return nil, err
	}
	return &dbHolder{db: db, dbPath: dbPath}, nil
}

func (h *dbHolder) get() *sql.DB {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.db
}

func (h *dbHolder) rebuildAndReload(data []byte) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	slog.Debug("rebuilding database", "path", h.dbPath, "size", len(data))

	if err := h.db.Close(); err != nil {
		slog.Warn("closing old db connection", "error", err)
	}

	if err := rebuildToFile(h.dbPath, data); err != nil {
		newDb, openErr := openDB(h.dbPath)
		if openErr != nil {
			slog.Error("failed to reopen db after rebuild failure", "error", openErr)
		} else {
			h.db = newDb
		}
		return err
	}

	newDb, err := openDB(h.dbPath)
	if err != nil {
		slog.Error("failed to reopen db after rebuild", "error", err)
		return fmt.Errorf("reopen after rebuild: %w", err)
	}
	h.db = newDb
	markInitialized(h.db)

	slog.Info("database rebuilt and reloaded")
	return nil
}

func (h *dbHolder) close() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.db.Close()
}

func openDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", "file:"+path+"?_journal_mode=WAL")
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("init schema: %w", err)
	}
	return db, nil
}

func isEmpty(db *sql.DB) (bool, error) {
	var val string
	err := db.QueryRow("SELECT value FROM sync_meta WHERE key = 'initialized'").Scan(&val)
	if err == nil && val == "true" {
		return false, nil
	}
	return true, nil
}

func markInitialized(db *sql.DB) {
	db.Exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('initialized', 'true')")
	slog.Debug("marked database as initialized")
}

// --- Task ---

func upsertTask(db *sql.DB, t Task) error {
	existing, err := getTask(db, t.ID)
	if err != nil {
		return err
	}
	if existing != nil && existing.UpdatedAt >= t.UpdatedAt {
		slog.Debug("skipping task, server is newer or equal", "id", t.ID, "server_updated", existing.UpdatedAt, "client_updated", t.UpdatedAt)
		return nil
	}
	_, err = db.Exec(`INSERT OR REPLACE INTO tasks
		(id, date, title, notes, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		t.ID, t.Date, t.Title, t.Notes, t.CreatedAt, t.UpdatedAt, t.DeletedAt)
	if err != nil {
		return err
	}
	slog.Debug("upserted task", "id", t.ID, "title", t.Title, "updatedAt", t.UpdatedAt, "deleted", t.DeletedAt != nil)
	return nil
}

func getTask(db *sql.DB, id string) (*Task, error) {
	row := db.QueryRow(`SELECT id, date, title, notes, created_at, updated_at, deleted_at
		FROM tasks WHERE id = ?`, id)
	var t Task
	if err := row.Scan(&t.ID, &t.Date, &t.Title, &t.Notes, &t.CreatedAt, &t.UpdatedAt, &t.DeletedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func getTasksSince(db *sql.DB, since int64) ([]Task, error) {
	result := make([]Task, 0)
	rows, err := db.Query(`SELECT id, date, title, notes, created_at, updated_at, deleted_at
		FROM tasks WHERE updated_at > ? ORDER BY updated_at`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var t Task
		if err := rows.Scan(&t.ID, &t.Date, &t.Title, &t.Notes, &t.CreatedAt, &t.UpdatedAt, &t.DeletedAt); err != nil {
			return nil, err
		}
		result = append(result, t)
	}
	return result, rows.Err()
}

// --- RepeatedTask ---

func upsertRepeatedTask(db *sql.DB, rt RepeatedTask) error {
	existing, err := getRepeatedTask(db, rt.ID)
	if err != nil {
		return err
	}
	if existing != nil && existing.UpdatedAt >= rt.UpdatedAt {
		slog.Debug("skipping repeated task, server is newer or equal", "id", rt.ID, "server_updated", existing.UpdatedAt, "client_updated", rt.UpdatedAt)
		return nil
	}
	_, err = db.Exec(`INSERT OR REPLACE INTO repeated_tasks
		(id, title, default_notes, category_id, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		rt.ID, rt.Title, rt.DefaultNotes, rt.CategoryID, rt.CreatedAt, rt.UpdatedAt, rt.DeletedAt)
	if err != nil {
		return err
	}
	slog.Debug("upserted repeated task", "id", rt.ID, "title", rt.Title, "updatedAt", rt.UpdatedAt, "deleted", rt.DeletedAt != nil)
	return nil
}

func getRepeatedTask(db *sql.DB, id string) (*RepeatedTask, error) {
	row := db.QueryRow(`SELECT id, title, default_notes, category_id, created_at, updated_at, deleted_at
		FROM repeated_tasks WHERE id = ?`, id)
	var rt RepeatedTask
	if err := row.Scan(&rt.ID, &rt.Title, &rt.DefaultNotes, &rt.CategoryID, &rt.CreatedAt, &rt.UpdatedAt, &rt.DeletedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &rt, nil
}

func getRepeatedTasksSince(db *sql.DB, since int64) ([]RepeatedTask, error) {
	result := make([]RepeatedTask, 0)
	rows, err := db.Query(`SELECT id, title, default_notes, category_id, created_at, updated_at, deleted_at
		FROM repeated_tasks WHERE updated_at > ? ORDER BY updated_at`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var rt RepeatedTask
		if err := rows.Scan(&rt.ID, &rt.Title, &rt.DefaultNotes, &rt.CategoryID, &rt.CreatedAt, &rt.UpdatedAt, &rt.DeletedAt); err != nil {
			return nil, err
		}
		result = append(result, rt)
	}
	return result, rows.Err()
}

// --- Category ---

func upsertCategory(db *sql.DB, c Category) error {
	existing, err := getCategory(db, c.ID)
	if err != nil {
		return err
	}
	if existing != nil && existing.UpdatedAt >= c.UpdatedAt {
		slog.Debug("skipping category, server is newer or equal", "id", c.ID, "server_updated", existing.UpdatedAt, "client_updated", c.UpdatedAt)
		return nil
	}
	_, err = db.Exec(`INSERT OR REPLACE INTO categories
		(id, name, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?)`,
		c.ID, c.Name, c.CreatedAt, c.UpdatedAt, c.DeletedAt)
	if err != nil {
		return err
	}
	slog.Debug("upserted category", "id", c.ID, "name", c.Name, "updatedAt", c.UpdatedAt, "deleted", c.DeletedAt != nil)
	return nil
}

func getCategory(db *sql.DB, id string) (*Category, error) {
	row := db.QueryRow(`SELECT id, name, created_at, updated_at, deleted_at
		FROM categories WHERE id = ?`, id)
	var c Category
	if err := row.Scan(&c.ID, &c.Name, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func getCategoriesSince(db *sql.DB, since int64) ([]Category, error) {
	result := make([]Category, 0)
	rows, err := db.Query(`SELECT id, name, created_at, updated_at, deleted_at
		FROM categories WHERE updated_at > ? ORDER BY updated_at`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt); err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, rows.Err()
}

// --- Rebuild ---

func rebuildToFile(dbPath string, data []byte) error {
	tmp := dbPath + ".tmp"
	if err := os.WriteFile(tmp, data, 0644); err != nil {
		return fmt.Errorf("write temp db: %w", err)
	}

	tmpDB, err := sql.Open("sqlite3", "file:"+tmp+"?mode=rw")
	if err != nil {
		os.Remove(tmp)
		return fmt.Errorf("open temp db: %w", err)
	}

	if _, err := tmpDB.Exec(schema); err != nil {
		tmpDB.Close()
		os.Remove(tmp)
		return fmt.Errorf("ensure schema: %w", err)
	}

	migrateColumn(tmpDB, "tasks", "updated_at", "ALTER TABLE tasks ADD COLUMN updated_at INTEGER", "UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL")
	migrateColumn(tmpDB, "tasks", "deleted_at", "ALTER TABLE tasks ADD COLUMN deleted_at INTEGER", "")
	migrateColumn(tmpDB, "repeated_tasks", "updated_at", "ALTER TABLE repeated_tasks ADD COLUMN updated_at INTEGER", "UPDATE repeated_tasks SET updated_at = created_at WHERE updated_at IS NULL")
	migrateColumn(tmpDB, "repeated_tasks", "deleted_at", "ALTER TABLE repeated_tasks ADD COLUMN deleted_at INTEGER", "")
	migrateColumn(tmpDB, "repeated_tasks", "category_id", "ALTER TABLE repeated_tasks ADD COLUMN category_id TEXT REFERENCES categories(id)", "")
	migrateColumn(tmpDB, "categories", "updated_at", "ALTER TABLE categories ADD COLUMN updated_at INTEGER", "UPDATE categories SET updated_at = created_at WHERE updated_at IS NULL")
	migrateColumn(tmpDB, "categories", "deleted_at", "ALTER TABLE categories ADD COLUMN deleted_at INTEGER", "")

	tmpDB.Close()

	if err := os.Rename(tmp, dbPath); err != nil {
		os.Remove(tmp)
		return fmt.Errorf("rename temp db: %w", err)
	}

	slog.Debug("database file replaced atomically", "path", dbPath)
	return nil
}

func migrateColumn(db *sql.DB, table, column, alterSQL, updateSQL string) {
	if !columnExists(db, table, column) {
		db.Exec(alterSQL)
		if updateSQL != "" {
			db.Exec(updateSQL)
		}
		slog.Debug("migrated column", "table", table, "column", column)
	}
}

func columnExists(db *sql.DB, table, column string) bool {
	rows, err := db.Query("PRAGMA table_info(" + table + ")")
	if err != nil {
		return false
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, typ string
		var notNull int
		var dflt sql.NullString
		var pk int
		if err := rows.Scan(&cid, &name, &typ, &notNull, &dflt, &pk); err != nil {
			continue
		}
		if name == column {
			return true
		}
	}
	return false
}
