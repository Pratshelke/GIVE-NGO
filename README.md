# GIVE-NGO

A web app that connects people with surplus food to nearby NGOs. A donor posts a donation, the server offers it to the closest NGO first, and the donation is tracked from pickup to completion.

## How it works

1. A donor registers and posts a donation with a pickup location and an expiry time.
2. A scheduler runs every minute and offers the donation to NGOs one at a time, nearest first, within 20 km.
3. An NGO accepts or rejects the request. A rejected or expired request moves to the next nearest NGO.
4. The NGO confirms pickup and marks the donation complete on delivery.

## Features

- Separate dashboards for donors and NGOs
- Map view of donations and NGOs, with address search
- Distance-based matching using the haversine formula
- Donation lifecycle: pending, reserved, in transit, completed or expired
- Sign-up and login with hashed passwords and JWT sessions

## Tech stack

| Layer | Tools |
|---|---|
| Web | React, TypeScript, Vite, React Router, Leaflet, Google Maps Places |
| Server | Node.js, Express, node-cron, JWT, bcrypt |
| Database | MongoDB with Mongoose and GeoJSON locations |

## Project layout

```
web/      React app: pages, components, auth context, map and geocoding helpers
server/   Express API, Mongoose models, auth middleware, donation scheduler
```

## Run it locally

Start the server. It needs `MONGO_URI`, `JWT_SECRET` and `PORT` in `server/.env`.

```bash
cd server && npm install && node index.js
```

Start the web app. It needs `VITE_API_URL` in `web/.env`, pointing at the server.

```bash
cd web && npm install && npm run dev
```
