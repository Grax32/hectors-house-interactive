# Project Context

## Project Name

Hector's House Album Interactive

## Purpose

Build and validate distributable album content for an interactive experience.

Primary delivery target is a USB drive where dist/ is the drive root.

## Current Build Flow

1. npm run build-album runs scripts/build-album.ts.
2. The script reads album-contents.json.
3. Content is copied into dist/ based on copy rules.
4. WAV track audio is converted to MP3 in dist/ with artwork embedded when available.
5. A guided dist/START-HERE.html file is generated for easy click-through navigation.
6. dist/ is validated against required files and directories.

## Key Files

- album-contents.json: content manifest and copy/validation rules.
- scripts/build-album.ts: build and validation script.
- package.json: npm scripts and tooling dependencies.
- tsconfig.json: TypeScript configuration for scripts.

## Content Source

- content-files/ is the source content directory.

## Content Layout (v1)

Use a simple client-facing layout where each release keeps its own metadata, artwork, and music together.

```text
dist/
  START-HERE.html (guided start page)
  content/
    01-[track-slug]/
      index.html
      song.json
      artwork.jpg (or .png)
  music/
    __[album-title].m3u8
    01 - [track-title].mp3
    wav/
      01 - [track-title].wav
  artist/
    profile.json
    portrait.jpg (or .png)
  singles/ (optional)
    [single-slug]/
      song.json
      artwork.jpg (or .png)
      audio.mp3
```

This keeps what clients care about (music and artwork) in obvious, repeatable locations.

## Metadata Shape (v1)

album.json fields:

- title
- year
- releaseDate
- description
- artwork
- tracks (array of track folder names)

song.json fields:

- title
- duration
- releaseDate
- artwork
- audioFile
- description

## Naming Conventions (v1)

- Use lowercase kebab-case folder names for albums, singles, and tracks.
- Prefix album track folders with sequence numbers (for example: 01-intro, 02-main-theme).
- Keep artwork filename stable as artwork.jpg or artwork.png.
- Keep one primary audio file per song folder (audio.mp3 by default).

## Conventions

- Keep scripts in scripts/.
- Keep build logic deterministic and repeatable.
- Prefer explicit manifest entries over implicit behavior.

## Open Decisions

- Required asset list and directory taxonomy.
- Whether additional build steps are needed (hashing, minification, metadata transforms).

## Notes For Future Sessions

Update this file when architecture, content layout, or build behavior changes.
