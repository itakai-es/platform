CREATE TABLE "help_article_visits" (
    "article_id" TEXT NOT NULL,
    "visitor_key" TEXT NOT NULL,
    "counted_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "help_article_visits_pkey" PRIMARY KEY ("article_id", "visitor_key"),
    CONSTRAINT "help_article_visits_article_id_fkey" FOREIGN KEY ("article_id")
        REFERENCES "help_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "help_article_visits_counted_at_idx" ON "help_article_visits" ("counted_at");
