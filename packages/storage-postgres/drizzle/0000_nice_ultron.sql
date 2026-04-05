CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(384),
	"session_id" text,
	"project_path" text,
	"tags" text[],
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_memories_bigm" ON "memories" USING gin ("content" gin_bigm_ops);--> statement-breakpoint
CREATE INDEX "idx_memories_vector" ON "memories" USING hnsw ("embedding" vector_cosine_ops);