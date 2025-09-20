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
- `pnpm tauri build` - to test compilation

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

### Rust File Organization
When organizing Rust files, follow this strict order to maintain consistency across the codebase:

**Standard File Structure Order:**
1. **use statements** - imports organized hierarchically
2. **const** - constants and const functions
3. **enum** - all enums grouped together
4. **struct** - all structs grouped together  
5. **type aliases** - type definitions
6. **impl** - all implementations grouped
7. **pub fn** - public functions
8. **fn** - private functions
9. **TauRPC** - trait, struct, and impl at the end

**Import Organization:**
```rust
// 1. Standard library imports (grouped)
use std::{collections::HashMap, fs, path::PathBuf};

// 2. External crate imports
use log::{debug, info};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

// 3. Internal crate imports
use crate::tauri_api_ext::ConfPathExt;
```

**Type Organization:**
- Group all enums together first, then all structs together
- Organize by logical relationship within each group
- Keep related types close to each other

**Implementation Guidelines:**
- All `impl` blocks grouped together after type definitions
- `impl Default` typically placed at the end of implementations
- Consider converting complex `impl` blocks to standalone functions for better organization
- Example: `impl Guides` → `get_guides_from_path()`, `write_guides()`, etc.

**TauRPC Placement:**
Always place TauRPC elements at the very end of the file in this order:
```rust
#[taurpc::procedures(...)]
pub trait ApiName { ... }

#[derive(Clone)]
pub struct ApiNameImpl;

#[taurpc::resolvers]
impl ApiName for ApiNameImpl { ... }
```

**Examples:**
- `src/guides.rs` - 938 lines reorganized following these conventions
- `src/conf.rs` - 361 lines reorganized following these conventions

**Benefits:**
- Consistent code organization across the entire codebase
- Easier navigation and maintenance
- Better code readability
- Follows Rust community best practices

### Git Conventions
- Angular format: `feat(subject): description`
- Branch naming: `type/issue-number/description` (e.g., `feat/50/new-summary-feature`)
- Use `Close #issue` in commit messages when applicable
- All files should be staged with `git add --all`
- Do not commit directly to `main` branch

### Translations
- French is the source language (msgid)
- All languages must have complete translations before commit
- Check for missing translations with `pnpm i18n:extract`
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

- After huge changes in TypeScript files, use `pnpm format`
- Never use `any` in TypeScript
- The app window is configured as always-on-top with transparency
- Uses React 19 with strict mode enabled
- Sentry is integrated for error reporting
- Deep linking handles guide navigation via `ganymede://guides/open/{id}` URLs with automatic download
- The app checks for updates and redirects to update page if outdated
- Guide files are stored as `{id}.json` and can be in any subfolder
- TauRPC automatically generates TypeScript bindings from Rust traits
- **Parallelize the maximum of tasks. You can Update multiple files at once to be faster.**
