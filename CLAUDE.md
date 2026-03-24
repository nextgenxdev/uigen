# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Setup:** `npm run setup` (installs deps, generates Prisma client, runs migrations)
- **Dev server:** `npm run dev` (Next.js with Turbopack)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (ESLint with next config)
- **Tests:** `npm test` (Vitest in watch mode), `npx vitest run` (single run)
- **Single test:** `npx vitest run src/lib/__tests__/file-system.test.ts`
- **DB reset:** `npm run db:reset`
- **Prisma generate:** `npx prisma generate` (after schema changes)
- **Prisma migrate:** `npx prisma migrate dev` (after schema changes)

## Architecture

UIGen is an AI-powered React component generator with live in-browser preview. Users describe components in a chat interface; Claude generates code into a virtual file system; the preview renders it live in an iframe.

### Core Data Flow

1. **Chat input** flows through `ChatProvider` (`src/lib/contexts/chat-context.tsx`) which wraps Vercel AI SDK's `useChat` hook, calling `POST /api/chat`
2. **API route** (`src/app/api/chat/route.ts`) uses `streamText` from Vercel AI SDK with two tools (`str_replace_editor`, `file_manager`) that operate on a server-side `VirtualFileSystem` instance
3. **Tool calls stream back** to the client; `ChatProvider.onToolCall` forwards them to `FileSystemProvider.handleToolCall`, which mirrors the operations on the client-side `VirtualFileSystem`
4. **Preview** (`PreviewFrame`) watches the file system via `refreshTrigger`, transforms JSX files with `@babel/standalone`, builds an import map with blob URLs, and renders everything in a sandboxed iframe

### Key Subsystems

- **VirtualFileSystem** (`src/lib/file-system.ts`): In-memory file system with tree structure using `Map<string, FileNode>`. Used both server-side (in the API route) and client-side (in React context). No files are written to disk.
- **JSX Transformer** (`src/lib/transform/jsx-transformer.ts`): Client-side Babel transformation that builds import maps, resolves `@/` aliases, creates blob URLs for local files, fetches third-party packages from esm.sh, and generates preview HTML
- **AI Tools** (`src/lib/tools/`): `str_replace_editor` (view/create/str_replace/insert) and `file_manager` (rename/delete) — these are Vercel AI SDK tool definitions that the LLM calls
- **Mock Provider** (`src/lib/provider.ts`): When `ANTHROPIC_API_KEY` is not set, a `MockLanguageModel` returns static component code so the app runs without an API key
- **Auth**: JWT sessions via `jose`, bcrypt password hashing, cookie-based. Middleware protects `/api/projects` and `/api/filesystem` routes. Anonymous users can use the app without signing in.
- **Persistence**: Prisma + SQLite. Projects store `messages` and `data` (serialized VFS) as JSON strings. Only available to authenticated users.

### Path Aliases

`@/*` maps to `./src/*` (tsconfig paths). The generated components inside the virtual file system also use `@/` imports, resolved at preview time by the JSX transformer.

### Prisma

- Schema: `prisma/schema.prisma`
- Generated client output: `src/generated/prisma`
- Database: `prisma/dev.db` (SQLite)

### UI Components

shadcn/ui (new-york style) in `src/components/ui/`. Added via `npx shadcn@latest add <component>`.

### Node.js Compatibility

`node-compat.cjs` is required via `NODE_OPTIONS` in all scripts to remove `localStorage`/`sessionStorage` globals that Node.js 25+ exposes, preventing SSR errors.

## Code Style

- Use comments sparingly. Only comment complex code.
