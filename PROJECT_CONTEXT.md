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
5. A shared browser runtime profile script is generated at dist/runtime-profile.js.
6. A guided dist/START-HERE.html file is generated for easy click-through navigation.
7. dist/ is validated against required files and directories.

## Key Files

- album-contents.json: content manifest and copy/validation rules.
- scripts/build-album.ts: build and validation script.
- scripts/runtime-client.ts: generated browser runtime for profiles and audio URL resolution.
- scripts/renderers/: typed page renderers, shared renderer types, and HTML formatting helpers.
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
- Keep presentation behavior shared across web/mobile/offline by using runtime profiles instead of separate player implementations.
- Keep generated page HTML in renderer modules instead of embedding large templates directly in the build orchestration script.

## Runtime Architecture

The generated browser runtime exposes `window.albumRuntime`.

Profiles:

- offline
- desktop-high
- desktop-low
- mobile
- kiosk

Profiles currently tune:

- Butterchurn render size, FPS, texture ratio, and preset-complexity intent.
- Player preload behavior.
- UI density.
- Touch vs keyboard control intent.

Audio is resolved through `window.albumRuntime.audioProvider.getAudioUrl(item)` and currently uses the direct MP3 file path.

Butterchurn and Butterchurn presets are loaded as normal script files (`dist/butterchurn.min.js` and `dist/butterchurnPresetsMinimal.min.js`), and `dist/party-mode.js` contains only the app-specific Party Mode runtime.

The generated `play-album.html` has a mobile Party Mode view for the `mobile` runtime profile. It keeps the same player and audio provider, but presents a full-screen visual/art surface with minimal overlay controls, tap-to-reveal chrome, previous/next controls, a mobile tracklist drawer, volume touch adjustment on the right side, and swipe-down navigation back to the album page.

## Open Decisions

- Required asset list and directory taxonomy.
- Whether additional build steps are needed (hashing, minification, metadata transforms).

## Notes For Future Sessions

Update this file when architecture, content layout, or build behavior changes.
