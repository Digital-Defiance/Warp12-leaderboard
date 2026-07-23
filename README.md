# IWGF Leaderboard

Federation standings for [Warp](https://warp.iwgf.org) and [Subspace Lattice](https://lattice.iwgf.org). Hosted at **[iwgf.org](https://iwgf.org)** (Firebase Hosting site `warp-12-leaderboard` on project **`warp-12`**).

This package lives at the IWGF workspace root as `leaderboard/` (remote: [Warp12-leaderboard](https://github.com/Digital-Defiance/Warp12-leaderboard)).

## Features

- **Federation Standings hub** — `/leaderboard` → Warp or Lattice TEI
- **Warp 12 TEI** — `/leaderboard/warp` (`playerStats`)
- **Lattice TEI** — `/leaderboard/lattice` (`latticeTei`)
- **Published round logs**, crews/charters, Federation Profile at **[profile.iwgf.org](https://profile.iwgf.org)**

## Quick start

```bash
# From IWGF workspace
cd leaderboard
cp .env.example .env   # same VITE_FIREBASE_* as Warp12 Bridge
yarn install
yarn dev               # http://localhost:4210
```

Deps: published `warp12-engine` + `@warp12/tei-core` via `file:../Warp12/libs/tei-core` (requires the Warp12 sibling checkout).

## Deploy

Firestore rules stay in **Warp12**. Hosting deploys stage `dist/` into `Warp12/federation-hosting/leaderboard` (Firebase `public` must stay under that tree), then deploy target `leaderboard`.

```bash
yarn deploy:hosting
# or from Warp12:
yarn deploy:hosting:leaderboard
```

| Deploy target | Site id | Public URL |
| ------------- | ------- | ---------- |
| `leaderboard` | `warp-12-leaderboard` | iwgf.org, profile.iwgf.org |
