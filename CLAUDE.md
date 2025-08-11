# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ganymède is a Tauri-based desktop application for the game Dofus (by Ankama Games). It serves as a 100% CGU-compliant add-on that provides guides, note-taking, and treasure hunting features. The app uses:
- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + neverthrow
- **Backend**: Rust with Tauri v2
- **State Management**: @tanstack/react-query + Zustand
- **Routing**: @tanstack/react-router (https://tanstack.com/router/latest)
- **Internationalization**: @lingui/react with .po files (source is French)
- **IPC**: TauRPC for communication between frontend and backend

## Commands

This project uses pnpm. Use pnpm instead of npm.

**Development:**
- `pnpm tauri dev` - Start development server with Tauri
- `pnpm dev` - Start Vite dev server only (for frontend-only development)

**Build:**
- `pnpm tauri build` - Production build
- `pnpm tauri build --debug` - Debug build with debugging info

**Linting/Formatting:**
- Uses Biome (configured in `biome.jsonc`)
- Format: 2 spaces, semicolons as needed, single quotes
- No separate commands - handled by editor/CI
- No unnecessary comments
- Comments in English

**Internationalization:**
- `pnpm i18n:extract` - Extract translatable strings
- `pnpm i18n:extract --clean` - Extract and show missing translations

**Release Management:**
- `pnpm changeset:version` - Update versions using changesets (it won't be useful for ai as it is done in GitHub Actions)

## Architecture

### Frontend Structure (`src/`)
- `/components/` - Reusable React components
- `/routes/` - File-based routing with @tanstack/router
  - `**/-*.tsx` - Route-adjacent components (not mapped to routes)
- `/hooks/` - Custom React hooks
- `/mutations/` - @tanstack/react-query mutations
- `/queries/` - @tanstack/react-query queryOptions
- `/ipc/` - TauRPC IPC layer for frontend-backend communication
- `/lib/` - Utility functions and shared logic
- `/locales/` - .po translation files (fr, en, es, pt)

### Backend Structure (`src-tauri/`)
- `/src/` - Rust source code with API endpoints
- `/taurpc/` - Custom TauRPC implementation for type-safe IPC

### Key Features
- **Deep Link Support**: Custom protocol handler `ganymede://` for opening specific guides
- **Auto-updater**: Configured with GitHub releases
- **Window Management**: Always-on-top, transparent, custom decorations
- **Sentry Integration**: Error reporting and monitoring

## Coding Conventions

### File Naming
- All files use `snake_case` format (some legacy `kebab-case` should be converted)
- TypeScript imports use `@/folder/file.extension` format

### React Components
- Export functions (not arrow functions) in PascalCase
- Use React 19 features and patterns (no legacy forwardRef)

### Rust Code
- Follow standard Rust conventions
- Error management with thiserror

### Git Conventions
- Angular format: `feat(subject): description`
- Branch naming: `type/issue-number/description` (e.g., `feat/50/new-summary-feature`)
- Use `Close #issue` in commit messages when applicable
- All files should be staged with `git add --all`
- Do not commit directly to `main` branch

### Translations
- French is the source language (msgid)
- All languages must have complete translations before commit
- Check for missing translations with `pnpm i18n:extract --clean`
- Remove obsolete translations marked with `#~`
- Spanish and Portuguese target European variants

## TauRPC Deep-Link System

### Overview
The application implements a sophisticated deep-link system that migrated from JavaScript to Rust for better performance and type safety. The system handles `ganymede://guides/open/{id}?step={step}` URLs.

### Architecture
- **Rust Backend**: `src-tauri/src/deep_link.rs` handles URL parsing and emits TauRPC events
- **Event System**: Uses TauRPC `DeepLinkApiEventTrigger::OpenGuideRequest` for type-safe communication
- **Frontend Handler**: `src/hooks/use_deep_link_guide_handler.ts` manages the complete flow
- **UI Component**: `src/components/deep_link_guide_download_dialog.tsx` handles download confirmation

### Deep-Link Flow
1. **URL Reception**: Rust parses `ganymede://guides/open/{id}?step={step}`
2. **Guide Existence Check**: Uses `guides.guideExists(guide_id)` to scan all folders recursively
3. **Automatic Navigation**: If guide exists, navigates directly to `/guides/{id}?step={step}`
4. **Download Dialog**: If guide missing, shows confirmation dialog with loading states
5. **Download & Navigate**: Downloads to root folder `""` then navigates on success

### Key Implementation Details
- **State Management**: Uses multiple separate `useState` hooks, not single state object
- **Error Handling**: Complete neverthrow Result pattern with toast notifications
- **Guide Discovery**: `get_flat_guides("")` scans all subfolders using glob `**/*.json`
- **Default Step Calculation**: If no step provided, uses progress from user's current profile
- **Cross-Platform**: Handles Windows, Linux, macOS with proper URL registration

### File Structure
```
src-tauri/src/deep_link.rs          # Rust URL parsing & event emission
src/hooks/use_deep_link_guide_handler.ts  # Main logic hook
src/components/deep_link_guide_download_dialog.tsx  # UI component
src/ipc/deep_link.ts               # Frontend IPC wrapper
```

## Important Notes

- The app window is configured as always-on-top with transparency
- Uses React 19 with strict mode enabled
- Sentry is integrated for error reporting
- Deep linking handles guide navigation via `ganymede://guides/open/{id}` URLs with automatic download
- The app checks for updates and redirects to update page if outdated
- Guide files are stored as `{id}.json` and can be in any subfolder
- TauRPC automatically generates TypeScript bindings from Rust traits
- Parallelize the maximum