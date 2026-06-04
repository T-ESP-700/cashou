-- CreateTable
CREATE TABLE "notions" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notion_levels" (
    "id" SERIAL NOT NULL,
    "notion_id" INTEGER NOT NULL,
    "level_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notion_levels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notion_levels_notion_id_level_id_key" ON "notion_levels"("notion_id", "level_id");

-- AddForeignKey
ALTER TABLE "notion_levels" ADD CONSTRAINT "notion_levels_notion_id_fkey" FOREIGN KEY ("notion_id") REFERENCES "notions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notion_levels" ADD CONSTRAINT "notion_levels_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
