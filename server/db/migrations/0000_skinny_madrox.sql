CREATE TABLE `embeddings` (
	`path` varchar(512) NOT NULL,
	`chunk_idx` int NOT NULL,
	`text` varchar(4096) NOT NULL,
	`vector` json NOT NULL
);
--> statement-breakpoint
CREATE TABLE `links` (
	`source_path` varchar(512) NOT NULL,
	`target_path` varchar(512) NOT NULL,
	`type` enum('wiki','ai') NOT NULL,
	`confidence` float,
	`accepted` boolean
);
--> statement-breakpoint
CREATE TABLE `notes_index` (
	`path` varchar(512) NOT NULL,
	`title` varchar(255) NOT NULL,
	`folder` varchar(64) NOT NULL,
	`updated` varchar(10) NOT NULL,
	`word_count` int NOT NULL DEFAULT 0,
	`pl_score` int NOT NULL DEFAULT 500,
	CONSTRAINT `notes_index_path` PRIMARY KEY(`path`)
);
