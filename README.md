# Farm Explorer

A standalone, read-only dashboard for the public Duxplorer farming feeds
(ducks, canines, bulls, turtles, felines, eagles).

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
```

Each species has its own feed, reward token (EGG, WAVES, TN, SPICE, PETE,
PUZZLE) and estimated daily emission, configured in `src/data.ts`
(`SPECIES`). Felines, eagles and turtles currently show no active emissions
on Duxplorer, so their projections render as zero. Reward projections are
estimates — on-chain integer amounts use 8 decimals (`TOKEN_DIVISOR`).
