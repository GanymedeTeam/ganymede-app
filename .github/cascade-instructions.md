# Cascade Assistant Instructions for Ganymede App

## Project Overview
Ganymede is a desktop companion application for Dofus that provides:
- Guide tracking for PVM progression
- Message storage and quick copy functionality
- Favorite location tracking
- DofusDB treasure hunt overlay

## Technical Stack
- Frontend: React with TypeScript, ViteJS
- Styling: Tailwind CSS and Shadcn
- State Management: @tanstack/react-query
- Routing: @tanstack/router
- Backend: Rust with Tauri

## Project Structure
- `/src`: React frontend code (TypeScript)
- `/src-tauri`: Rust backend code

## Naming Conventions
- Use snake_case for file names
- Some legacy files may still use kebab-case

## Key Focus Areas
1. Maintain separation between Rust backend and React frontend
2. Keep UI modern and user-friendly with Tailwind and Shadcn
3. Ensure efficient state management with TanStack Query
4. Maintain proper TypeScript types for type safety
5. Follow Tauri v2 best practices for desktop integration

## Development Guidelines
- Keep Rust code efficient and safe
- Maintain React code with proper TypeScript types
- Use Tailwind classes consistently
- Follow Tauri v2 security best practices
- Document all API endpoints and Rust commands
- No CRLF line endings
- Using function export instead of arrow function when possible
