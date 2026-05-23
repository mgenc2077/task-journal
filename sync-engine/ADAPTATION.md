# Adapting the Sync Engine for Another Application

This guide explains how to adapt this sync server for any application. It assumes you're starting from the Task Journal implementation and want to change the data model to match your own app.

## How the sync engine works

The server implements a **timestamp-based incremental sync** protocol over HTTP JSON:

1. Client sends changed records since its last sync (`last_sync_at`)
2. Server upserts each record (last-write-wins on `updated_at`, server wins on tie)
3. Server returns all records changed since `last_sync_at`
4. Client merges server records using the same conflict resolution

Key constraints every entity must follow:

- **`id TEXT PRIMARY KEY`** — UUIDv7, generated client-side
- **`updated_at INTEGER NOT NULL`** — Unix milliseconds, used for conflict resolution
- **`deleted_at INTEGER`** — nullable, soft delete marker
- **`sync_meta` table** — required on both client and server for tracking state

## Step-by-step adaptation

### 1. Define your data model (`models.go`)

Replace the existing structs with your own. Each entity struct needs:

```go
type YourEntity struct {
    ID        string  `json:"id"`
    // ... your fields ...
    CreatedAt int64   `json:"created_at"`
    UpdatedAt int64   `json:"updated_at"`
    DeletedAt *int64  `json:"deleted_at"`
}
```

Then update `SyncRequest` and `SyncResponse` to include your entities:

```go
type SyncRequest struct {
    LastSyncAt    int64         `json:"last_sync_at"`
    YourEntities  []YourEntity  `json:"your_entities"`
    // add more entity arrays as needed
}

type SyncResponse struct {
    SyncedAt     int64         `json:"synced_at"`
    YourEntities []YourEntity  `json:"your_entities"`
}
```

### 2. Update the database schema (`db.go`)

Replace the `schema` constant with your table definitions:

```sql
CREATE TABLE IF NOT EXISTS your_entities (
    id TEXT PRIMARY KEY NOT NULL,
    -- your columns --
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

Column naming convention: use `snake_case` to match typical JS/TS app conventions. The original food journal used `camelCase` for Android Room compatibility — use whatever your client prefers.

### 3. Write CRUD functions (`db.go`)

For each entity, implement three functions following this pattern:

```go
func upsertYourEntity(db *sql.DB, e YourEntity) error {
    existing, err := getYourEntity(db, e.ID)
    if err != nil {
        return err
    }
    if existing != nil && existing.UpdatedAt >= e.UpdatedAt {
        return nil // server wins on tie
    }
    _, err = db.Exec(`INSERT OR REPLACE INTO your_entities
        (id, ..., created_at, updated_at, deleted_at)
        VALUES (?, ..., ?, ?, ?)`,
        e.ID, ..., e.CreatedAt, e.UpdatedAt, e.DeletedAt)
    return err
}

func getYourEntity(db *sql.DB, id string) (*YourEntity, error) {
    row := db.QueryRow(`SELECT id, ..., created_at, updated_at, deleted_at
        FROM your_entities WHERE id = ?`, id)
    var e YourEntity
    if err := row.Scan(&e.ID, ..., &e.CreatedAt, &e.UpdatedAt, &e.DeletedAt); err != nil {
        if err == sql.ErrNoRows {
            return nil, nil
        }
        return nil, err
    }
    return &e, nil
}

func getYourEntitiesSince(db *sql.DB, since int64) ([]YourEntity, error) {
    result := make([]YourEntity, 0)
    rows, err := db.Query(`SELECT id, ..., created_at, updated_at, deleted_at
        FROM your_entities WHERE updated_at > ? ORDER BY updated_at`, since)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    for rows.Next() {
        var e YourEntity
        if err := rows.Scan(&e.ID, ..., &e.CreatedAt, &e.UpdatedAt, &e.DeletedAt); err != nil {
            return nil, err
        }
        result = append(result, e)
    }
    return result, rows.Err()
}
```

Critical: the `upsert` conflict check must use `>=` (server wins on tie) to be consistent with the protocol.

### 4. Update rebuild migrations (`db.go`)

In `rebuildToFile`, update the `migrateColumn` calls to match your schema. These handle clients that may be missing columns from older versions:

```go
migrateColumn(tmpDB, "your_entities", "updated_at",
    "ALTER TABLE your_entities ADD COLUMN updated_at INTEGER",
    "UPDATE your_entities SET updated_at = created_at WHERE updated_at IS NULL")
migrateColumn(tmpDB, "your_entities", "deleted_at",
    "ALTER TABLE your_entities ADD COLUMN deleted_at INTEGER", "")
```

### 5. Wire up the handler (`handlers.go`)

In `handleSync`, replace the entity loops:

```go
for _, e := range req.YourEntities {
    if err := upsertYourEntity(db, e); err != nil {
        slog.Error("upsert failed", "id", e.ID, "error", err)
    }
}

yourEntities, err := getYourEntitiesSince(db, req.LastSyncAt)
// ... error handling ...

writeJSON(w, http.StatusOK, SyncResponse{
    SyncedAt:     syncedAt,
    YourEntities: yourEntities,
})
```

Also update the debug log line to show your entity counts.

### 6. Update configuration (`main.go`)

Change the default `DB_PATH` to match your application name.

### 7. Update Docker and docs

- `Dockerfile`: change `DB_PATH` env var
- `README.md`: update data model, example JSON, and description

## Client-side requirements

Any client (iOS, Android, web, desktop) must implement:

1. **UUIDv7 generation** on every insert — IDs are generated client-side, not auto-increment
2. **Unix millisecond timestamps** for `created_at` and `updated_at` — not ISO strings, not seconds
3. **Soft deletes** — set `deleted_at = Date.now()` and `updated_at = Date.now()`, never hard-delete synced records
4. **Filter deleted records** in UI queries with `WHERE deleted_at IS NULL`
5. **Track `last_sync_at`** locally (in a `sync_meta` or similar table)
6. **Send changes since last sync** — query all tables for `updated_at > last_sync_at`
7. **Apply server changes** with the same conflict resolution (compare `updated_at`, keep higher value)
8. **Handle `303` response** — if server returns 303, upload the full SQLite DB to `/rebuild`, then re-sync

## Adding a new entity to an existing server

If you need to add a new table to an already-running server:

1. Add the struct to `models.go`, add to `SyncRequest`/`SyncResponse`
2. Add the table to the `schema` constant in `db.go`
3. Add upsert/get/getSince functions in `db.go`
4. Add a `migrateColumn` call in `rebuildToFile` for the new table
5. Wire up in `handlers.go`
6. Existing clients that don't send the new field will send an empty array — no harm done
7. Clients that need the new data start including it in their sync payload

The server handles missing fields gracefully because the upsert only processes what it receives.
