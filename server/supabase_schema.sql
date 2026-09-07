-- Create tables for ChordSync

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Playlist" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "shareCode" TEXT NOT NULL,
  "ownerId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Playlist_shareCode_key" UNIQUE ("shareCode"),
  CONSTRAINT "Playlist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PlaylistItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "playlistId" UUID NOT NULL,
  "source" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "artist" TEXT NOT NULL,
  "addedBy" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaylistItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SongCache" (
  "source" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "artist" TEXT NOT NULL,
  "key" TEXT,
  "capo" INTEGER,
  "contentJson" TEXT NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SongCache_pkey" PRIMARY KEY ("source", "sourceUrl")
);

-- Note: Because we are deferring authentication, we will let the backend
-- service bypass Row Level Security (RLS) using the secret key.
-- So we do not need to enable RLS or set up policies right now.
