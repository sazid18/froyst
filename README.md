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

### Connecting to the WebSocket Server

1. Run the [server](https://github.com/sazid18/foryst-server).
2. Add `NEXT_PUBLIC_WS_URL` to your env file.

---

## How This Was Built

### AI Model
**Claude Sonnet 5**, running in Cowork mode.

### Claude Feature: Projects
The wireframe, state-management diagram, and interfaces doc were carried over from a Claude Project ("Polymarket single bid"), keeping that context available without re-uploading it.

### Skills
- **`senior-nextjs-frontend-engineer`** (custom-built) — invoked throughout the build for Next.js App Router decisions, Server/Client Component boundaries, and state management (TanStack Query, Zustand) choices.

### Journey: Wireframe → State Management → Implementation
1. **Wireframe** — Figma layout of the market list and bid flow.
2. **State management brainstorming** — mapped the architecture as a flowchart: server state (markets, bids) into TanStack Query, client UI state (modal, connection) into Zustand, and a WebSocket singleton as transport-only.
3. **State interfaces** — formalized the diagram into canonical TypeScript interfaces (`Market`, `Bid`, `SocketMessage`, shared `queryKeys`, API contracts).
4. **Implementation** — built atoms → molecules → organisms → page, a mock backend, offline queueing, and a PWA service worker.
5. **Verification** — 153-test Vitest suite plus lint/build checks.

### Specs Created Along the Way
| Spec | Description |
|---|---|
| Wireframe screenshot | Mobile-first Figma layout (market list + bid flow) |
| `bidding-app-state-management.mermaid` | State-flow diagram (REST/SSR, TanStack Query cache, WebSocket router, Zustand modal store) |
| `state-management-interfaces.md` | Canonical TypeScript contracts (`Market`, `Bid`, `BidPayload`, `SocketMessage`, `queryKeys`, `MarketApi`/`BidApi`) |
| `PROJECT_CONTEXT.md` | Handoff doc covering non-obvious constraints, component layers, mock backend, PWA/service worker, and testing setup |
| `/senior-nextjs-frontend-engineer` | Custom skill encoding senior-level Next.js/React conventions (App Router, Server/Client Component boundaries, TanStack Query + Zustand patterns) for consistent use across the build |

### Claude Chats
- [Wireframe, component implementation, and mock data](https://claude.ai/share/b8d8b91e-a9b6-4f01-8d6a-a6d6475d4eac) — used to create prompts for implementing components.
- [State management brainstorming and interface design](https://claude.ai/share/1da66d53-ea9a-49be-b129-53c96badbacb) — used to create prompts for state management implementation.
- [Claude CLI chats](https://drive.google.com/drive/folders/1ccIcIRJPQ8ppx-NnidVZnT9KdM5OGFM7?usp=sharing)