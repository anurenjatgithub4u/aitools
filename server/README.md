# FindurAI realtime server

A tiny WebSocket relay: every player in a city room sends a small state packet a few
times a second; the server fans it out to everyone else, keeps the last packet per player
(so newcomers see the city instantly) and relays chat / friend requests.

## Run locally
    cd server && npm install && npm start        # ws://localhost:8787

## Deploy on Fly.io (free allowance, never sleeps)
One time, from this folder:

    npm install -g flyctl            # or: winget install flyctl  /  curl -L https://fly.io/install.sh | sh
    fly auth signup                  # or: fly auth login
    fly launch --copy-config --no-deploy --name findurai-realtime --region sin
    fly deploy

`fly.toml` is checked in, so `fly launch --copy-config` keeps it (answer "no" to Postgres/Redis if asked).
Every later change is just `fly deploy`.

Check it is alive: https://findurai-realtime.fly.dev/health → `{"ok":true,"rooms":0,"players":0}`

Then on Vercel → Project → Settings → Environment Variables (all environments), add

    NEXT_PUBLIC_REALTIME_URL = wss://findurai-realtime.fly.dev/multiplayer

and **redeploy** the site (the variable is baked into the static bundle at build time).
Open the city on two devices: each should see the other walk, and the top chip shows "2 here right now".

Useful:

    fly logs                # live server log
    fly status              # machine state / region
    fly scale count 1       # make sure exactly one machine runs

Origins: only https://www.findurai.com, https://findurai.com, *.vercel.app and http://localhost:3000 may
connect (set `ALLOWED_ORIGINS` to change, comma-separated; a leading dot matches subdomains).

## Any other Node host (Render, Koyeb, a VPS)
The service needs one open port (`PORT`, default 8787) and nothing else: no database.
Point the host at `./server`, start command `node index.mjs`, then set the same Vercel variable.
On hosts that sleep when idle (Render free), add a free cron (cron-job.org / UptimeRobot) that hits `/health` every 10 minutes.
