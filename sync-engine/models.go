package main

type Task struct {
	ID         string  `json:"id"`
	Date       string  `json:"date"`
	Title      string  `json:"title"`
	Notes      string  `json:"notes"`
	CreatedAt  int64   `json:"created_at"`
	UpdatedAt  int64   `json:"updated_at"`
	DeletedAt  *int64  `json:"deleted_at"`
}

type RepeatedTask struct {
	ID           string  `json:"id"`
	Title        string  `json:"title"`
	DefaultNotes string  `json:"default_notes"`
	CategoryID   *string `json:"category_id"`
	CreatedAt    int64   `json:"created_at"`
	UpdatedAt    int64   `json:"updated_at"`
	DeletedAt    *int64  `json:"deleted_at"`
}

type Category struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	CreatedAt int64   `json:"created_at"`
	UpdatedAt int64   `json:"updated_at"`
	DeletedAt *int64  `json:"deleted_at"`
}

type SyncRequest struct {
	LastSyncAt    int64          `json:"last_sync_at"`
	Tasks         []Task         `json:"tasks"`
	RepeatedTasks []RepeatedTask `json:"repeated_tasks"`
	Categories    []Category     `json:"categories"`
}

type SyncResponse struct {
	SyncedAt      int64          `json:"synced_at"`
	Tasks         []Task         `json:"tasks"`
	RepeatedTasks []RepeatedTask `json:"repeated_tasks"`
	Categories    []Category     `json:"categories"`
}

type RebuildResponse struct {
	Message  string `json:"message"`
	SyncedAt int64  `json:"synced_at"`
}

type ErrorResponse struct {
	Message    string `json:"message"`
	RebuildURL string `json:"rebuild_url,omitempty"`
}
