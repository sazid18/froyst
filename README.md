This is a [Next.js](https://nextjs.org) prediction-markets demo, bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Installation

1. **Prerequisites**: Node.js 20 or later, and npm.
2. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables (see [Connecting to the WebSocket server](#connecting-to-the-websocket-server) below) — a default `.env.local` pointing at `ws://localhost:4000` is already checked into the repo, so this step is optional unless you need a different server.

4. Run the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3001](http://localhost:3001) with your browser to see the result. (Note: this project runs on port `3001`, not the Next.js default `3000`.)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Connecting to the WebSocket server

Live price/bid updates are delivered over a WebSocket connection, controlled by the `NEXT_PUBLIC_WS_URL` environment variable (read in `app/providers/AppStateProvider.tsx`):

- **Unset** (no env file, or the var not defined): the app falls back to a client-side mock socket driver (`app/mocks/mockSocketDriver.ts`) that simulates live updates by polling `POST /api/mocks/drift` every 2 seconds — no real server needed, useful for local UI work without running a separate process.
- **Set**: the app opens a real `WebSocket` connection to that URL instead (`app/lib/socket/socketManager.ts`), with automatic reconnect and backoff, and expects `MARKET_UPDATE` / `BID_UPDATE` messages pushed from the server.

To connect to a real WebSocket server:

1. Start your WebSocket server (for local dev, this typically listens on `ws://localhost:4000`).
2. Add (or edit) a `.env.local` file at the project root:

   ```bash
   NEXT_PUBLIC_WS_URL=ws://localhost:4000
   ```

3. Restart `npm run dev` so Next.js picks up the new environment variable.

`NEXT_PUBLIC_*` variables are inlined into the client bundle at build time, so changes require a dev server restart to take effect.

## Testing

```bash
npm run test
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
