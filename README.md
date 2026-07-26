This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Steps to connect to websocket server
- Run the server (https://github.com/sazid18/foryst-server) 
- Add NEXT_PUBLIC_WS_URL in env file

# Tooling used to produce this README
 
## AI model
**Claude Sonnet 5**, running in Cowork mode.
 
## Claude feature
**Projects** — the wireframe, state-management diagram, and interfaces doc were carried over from a Claude Project ("Polymarket single bid"), which kept that context available here without re-uploading it.
 
## Tools
- **Glob** — listed the imported project-cache folder to see what source material was available.
- **Read** — read `PROJECT_CONTEXT.md`, `state-management-interfaces.md`, the state-management `.mermaid` diagram, `metadata.json`, and the Figma wireframe screenshot to reconstruct the project's history.
- **Write** — created the README file.
- **present_files** — surfaced the finished file to you as a downloadable card.
## Skills
- **`senior-nextjs-frontend-engineer`** (custom-built) — invoked throughout the application build for Next.js App Router decisions, Server/Client Component boundaries, and state management (TanStack Query, Zustand) choices.


## Journey: wireframe → state management → implementation
 
- **Wireframe** — Figma layout of the market list and bid flow.
- **State management brainstorming** — mapped the architecture as a flowchart: server state (markets, bids) into TanStack Query, client UI state (modal, connection) into Zustand, and a WebSocket singleton as transport-only.
- **State interfaces** — formalized the diagram into canonical TypeScript interfaces (`Market`, `Bid`, `SocketMessage`, shared `queryKeys`, API contracts).
- **Implementation** — built atoms → molecules → organisms → page, a mock backend, offline queueing, and a PWA service worker.
- **Verification** — 153-test Vitest suite plus lint/build checks.


## Specs created along the way
- **Wireframe screenshot** — the mobile-first Figma layout (market list + bid flow).
- **`bidding-app-state-management.mermaid`** — the state-flow diagram (REST/SSR, TanStack Query cache, WebSocket router, Zustand modal store).
- **`state-management-interfaces.md`** — the canonical TypeScript contracts (`Market`, `Bid`, `BidPayload`, `SocketMessage`, `queryKeys`, `MarketApi`/`BidApi`).
- **`PROJECT_CONTEXT.md`** — the handoff doc covering non-obvious constraints, component layers, mock backend, PWA/service worker, and testing setup.
- **`/senior-nextjs-frontend-engineer`** — a custom skill built along the way, encoding senior-level Next.js/React conventions (App Router, Server/Client Component boundaries, TanStack Query + Zustand patterns) so they'd be applied consistently across the build.


## Claude Chats
- For wireframe, component implementation and mock data. Used this chat for creating prompt to implement components. <link https://claude.ai/share/b8d8b91e-a9b6-4f01-8d6a-a6d6475d4eac>
- Used for brainstroming about State management and create State interface. This state is also used to create prompt for state management implementation. <link: https://claude.ai/share/1da66d53-ea9a-49be-b129-53c96badbacb>
- Claude CLI chats: https://drive.google.com/drive/folders/1ccIcIRJPQ8ppx-NnidVZnT9KdM5OGFM7?usp=sharing
 
