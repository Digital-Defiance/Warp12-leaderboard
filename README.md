# Warp12 Leaderboard

Public stats, fleet rankings, and published round logs for [Warp12](https://warp12.app). Hosted at **[leaderboard.warp12.app](https://leaderboard.warp12.app)** as a second Firebase Hosting site on the shared **`warp-12`** project (same Firestore and Auth as the bridge app).

## Features

- **Fleet leaderboard** — ranked captain stats (`playerStats`)
- **Published round logs** — shareable transcripts from in-game log exports (`publishedLogs`)
- **Captain profiles** — call sign, bio, and gaming platform IDs (`playerProfiles`)
- **Warp12 styling** — Federation / FederationWide / Nova Light fonts and bridge color tokens

## Quick start

```bash
cd Warp12-leaderboard
cp .env.example .env   # same VITE_FIREBASE_* as apps/Warp12/.env (warp-12 project)
yarn install
yarn dev               # http://localhost:4210
```

## Deploy

Hosting and Firestore are configured at the **monorepo root**.

### Hosting site ids

Firebase assigns a globally unique site id at creation time. Ours:

| Deploy target | Site id | Public URL |
| ------------- | ------- | ---------- |
| `bridge` | `warp-12` | warp12.app |
| `leaderboard` | `warp-12-leaderboard` | leaderboard.warp12.app |

The deploy target name (`leaderboard` in `firebase.json`) is not the site id — see `.firebaserc`.

Re-apply targets if deploy fails with “could not find site”:

```bash
firebase target:clear hosting leaderboard --project warp-12
firebase target:apply hosting leaderboard warp-12-leaderboard --project warp-12
```

Custom domain **`leaderboard.warp12.app`** is attached to site `warp-12-leaderboard` in Firebase Console → Hosting.

Add **`leaderboard.warp12.app`** to Authentication → Settings → **Authorized domains**.

### Deploy commands

From the monorepo root:

```bash
yarn deploy:firestore              # rules + indexes (both apps)
yarn deploy:hosting:leaderboard    # build + deploy leaderboard only
yarn deploy:hosting                # build + deploy bridge + leaderboard
yarn deploy:firebase               # firestore + both sites
```

From this submodule:

```bash
yarn deploy:hosting   # builds here, deploys via parent firebase.json
```

## Firebase collections

| Collection        | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `playerStats`     | Denormalized stats for leaderboard queries   |
| `playerProfiles`  | Display name, bio, gaming platform links     |
| `publishedLogs`   | Shared round transcripts + metadata          |

Rules and indexes live in the parent repo: `firestore.rules`, `firestore.indexes.json`.

### Publishing from the bridge app (next step)

Wire a **Publish** action in the bridge table log viewer using `publishMatchLog()` from `src/firebase/match-log-service.ts`. Same Firebase Auth user → same `uid` on the leaderboard.

## Submodule

```bash
git submodule update --init Warp12-leaderboard
```

Commit leaderboard UI changes here; commit Firebase hosting/rules changes in the parent repo.
