# GiveNGo

Surplus food donation platform. Restaurants, caterers and households post leftover food, and GiveNGo offers it to the **nearest available NGO within 20 km**, one at a time. Each NGO gets 10 minutes to accept or pass before the next nearest one is asked.

## Run it in 30 seconds (no API keys, no database)

```bash
cd web
npm install
npm run dev        # open the URL it prints
```

The app starts in **demo mode**. The whole API runs inside the browser and is stored in `localStorage`, using the same routes, rules and nearest-NGO dispatch algorithm as the real server. Maps use OpenStreetMap, so no Google key is needed.

**Presenting it:** use the dark **Demo · view as Donor / NGO** bar at the bottom to switch sides in one click.

1. As **Donor** (Annapurna Kitchens), click **Donate food**, fill it in and post. The right-hand panel shows which NGO is asked first.
2. Switch to **NGO** (Seva Food Bank). The new request appears with a 10-minute countdown. Click **Accept pickup**, then **I have collected it**, then **Mark as delivered**.
3. Switch back to **Donor**. The donation shows as delivered, with a dispatch log and notifications.
4. Click **Can't take it** instead, and the next nearest NGO picks it up automatically (simulated partner NGOs respond on their own).

**Reset** restores the sample data. Sample logins: `donor@demo.com` / `ngo@demo.com`, password `demo123`.

### Share it

```bash
npm run build          # static site in web/dist/ (Netlify, Vercel, GitHub Pages, any host)
npm run build:single   # one self-contained web/dist-single/index.html you can send to anyone
```

## Run against the real backend (optional)

Requires MongoDB (for example a free MongoDB Atlas cluster).

```bash
cd server
cp .env.example .env    # set MONGO_URI and JWT_SECRET
npm install
npm start               # http://localhost:3000

cd ../web
VITE_API_URL=http://localhost:3000 npm run dev
```

The server runs the dispatcher as a cron job every minute (`server/cron/donationRequestScheduler.js`).

## Project layout

```
web/                     React 19 + Vite + TypeScript
  src/lib/demo/store.ts    in-browser database, seed data, dispatcher (port of the cron job)
  src/lib/demo/adapter.ts  axios adapter serving the REST API in demo mode
  src/lib/axios.ts         switches between demo mode and VITE_API_URL
  src/components/          MapCanvas (Leaflet + OSM), LocationPicker, Navbar, DemoDock, …
  src/pages/               Landing, Login, Register, Donor & NGO dashboards, Create donation, Live map, Profile
server/                  Express 5 + Mongoose
  index.js                 REST API (auth, users, donations, requests, ngos, stats)
  cron/                    nearest-NGO sequential dispatcher
```

## Donation lifecycle

`pending` (finding an NGO) → `reserved` (NGO accepted) → `in_transit` (picked up) → `completed` (delivered).
A pending donation that nobody accepts before its pickup window ends becomes `expired`.
