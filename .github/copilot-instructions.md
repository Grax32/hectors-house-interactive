# Copilot Instructions

This repository contains an interactive album build pipeline.

## Priority Guidance
- Always read PROJECT_CONTEXT.md before making significant code or content structure changes.
- Keep changes small and focused.
- Prefer TypeScript for scripts under scripts/.
- Preserve existing npm script names unless asked to rename.
- Validate changes with npm run build-album when relevant.

## Build Contract
- album-contents.json is the source of truth for required files, required directories, and copy rules.
- scripts/build-album.ts must remain callable via npm run build-album.
- dist/ should be reproducible from source content and config.

## Editing Style
- Use clear, minimal logging.
- Avoid introducing unrelated refactors.
- Keep file paths and naming consistent with current repo patterns.
