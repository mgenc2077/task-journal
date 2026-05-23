# Sync Engine

Go server that synchronizes Task Journal data between clients over LAN.

## Quick start

### Docker

```sh
docker build -t sync-engine .

docker run -p 42061:42061 \
  -v sync-data:/data \
  sync-engine
```

### Binary

```sh
go build -o sync-engine .

./sync-engine

PORT=8080 DB_PATH=/path/to/db.sqlite ./sync-engine
./sync-engine -v
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `42061` | HTTP listen port |
| `DB_PATH` | `taskjournal.db` | Path to SQLite database file |
| `LOG_LEVEL` | `info` | Log level: `debug` or `info`. Also enabled by `-v` flag |

## API

### `POST /sync`

Synchronize changes between client and server.

**Request:**

```json
{
  "last_sync_at": 1700000000000,
  "tasks": [
    {
      "id": "019e2dbf-2122-7088-8be5-4d93c35f98c9",
      "date": "2025-01-15",
      "title": "Review PR",
      "notes": "",
      "created_at": 1700000000000,
      "updated_at": 1700000000000,
      "deleted_at": null
    }
  ],
  "repeated_tasks": [
    {
      "id": "019e2dc0-0198-7dbb-b529-34c59b1996fe",
      "title": "Standup",
      "default_notes": "What did I do yesterday?",
      "category_id": "019e2dc1-ab12-7abc-def0-1234567890ab",
      "created_at": 1700000000000,
      "updated_at": 1700000000000,
      "deleted_at": null
    }
  ],
  "categories": [
    {
      "id": "019e2dc1-ab12-7abc-def0-1234567890ab",
      "name": "Work",
      "created_at": 1700000000000,
      "updated_at": 1700000000000,
      "deleted_at": null
    }
  ]
}
```

**Responses:**

| Status | When | Body |
|---|---|---|
| `200 OK` | Sync completed | `{"synced_at": <ms>, "tasks": [...], "repeated_tasks": [...], "categories": [...]}` |
| `303 See Other` | Server DB not initialized (empty) | `{"message": "...", "rebuild_url": "/rebuild"}` + `Location: /rebuild` header |

**Conflict resolution:** When both sides have the same ID, the row with the higher `updated_at` wins. Server wins on tie. No per-field merging.

### `POST /rebuild`

Replace the server database with a client-provided SQLite file. Used for initial sync when the server is empty.

**Request:**
- Content-Type: `application/octet-stream`
- Body: raw SQLite database file

**Response:**

| Status | When | Body |
|---|---|---|
| `200 OK` | Rebuild succeeded | `{"message": "Database rebuilt", "synced_at": <ms>}` |
| `400 Bad Request` | Empty body or not a SQLite file | `{"message": "..."}` |

## Sync flow

```
Client                              Server
  |                                    |
  |  POST /sync (changes since last)   |
  |----------------------------------->|
  |                                    |
  |       303 See Other (if empty)     |
  |<-----------------------------------|
  |                                    |
  |  POST /rebuild (full SQLite DB)    |
  |----------------------------------->|
  |       200 OK (rebuilt)             |
  |<-----------------------------------|
  |                                    |
  |  POST /sync (last_sync_at=0)       |
  |----------------------------------->|
  |       200 OK (server state)        |
  |<-----------------------------------|
```

On subsequent syncs, the server responds with `200 OK` directly.

## Data model

```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,        -- UUIDv7
    date TEXT NOT NULL,                  -- "YYYY-MM-DD"
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,         -- Unix ms
    updated_at INTEGER NOT NULL,         -- Unix ms, conflict resolution
    deleted_at INTEGER                   -- Soft delete, NULL = active
);

CREATE TABLE repeated_tasks (
    id TEXT PRIMARY KEY NOT NULL,        -- UUIDv7
    title TEXT NOT NULL,
    default_notes TEXT NOT NULL DEFAULT '',
    category_id TEXT REFERENCES categories(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE TABLE categories (
    id TEXT PRIMARY KEY NOT NULL,        -- UUIDv7
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE TABLE sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

### Soft deletes

Deletion sets `deleted_at` to the current timestamp (unix ms) and bumps `updated_at`. Deleted rows are included in sync responses so the deletion propagates to all clients. Filter with `WHERE deleted_at IS NULL` for UI queries.

### IDs

All IDs are UUIDv7 — time-sortable, unique across devices. Generated client-side on insert. No auto-increment.

## File structure

```
sync-engine/
├── main.go        # Entry point, HTTP server, graceful shutdown, config
├── db.go          # SQLite init, schema, queries, rebuild, dbHolder with mutex
├── handlers.go    # POST /sync, POST /rebuild HTTP handlers
├── models.go      # JSON request/response types
├── uuid.go        # UUIDv7 generation
├── Dockerfile     # Multi-stage build (Go builder → Alpine runtime)
├── ADAPTATION.md  # Guide for adapting this server to other apps
├── go.mod
└── go.sum
```

## Dependencies

- [ncruces/go-sqlite3](https://github.com/ncruces/go-sqlite3) — WASM-based SQLite driver, no CGO required
- Standard library only for everything else
