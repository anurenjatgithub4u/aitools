# FindurAI realtime server

A tiny WebSocket relay: every player in a city room sends a small state packet a few
times a second; the server fans it out to everyone else, keeps the last packet per player
(so newcomers see the city instantly) and relays chat / friend requests.

## Run locally
    cd server && npm install && npm start        # ws://localhost:8787

## Deploy (any Node host — Railway, Render, Fly.io, a VPS)
The service needs one open port (`PORT`, default 8787) and nothing else: no database.

    railway up          # or: fly launch / render.com "Web Service" pointing at ./server

Then set on Vercel (Project → Settings → Environment Variables) and redeploy:

    NEXT_PUBLIC_REALTIME_URL = wss://<your-host>/multiplayer

Health check: `GET /health` → `{"ok":true,"rooms":…,"players":…}`.
