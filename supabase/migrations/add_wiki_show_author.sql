ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS show_author BOOLEAN NOT NULL DEFAULT true;
UPDATE wiki_pages SET show_author = false WHERE id < 38;
