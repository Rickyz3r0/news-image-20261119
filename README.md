# news-image-20261119

Visual front-page summary of world news for **Thursday, 19 November 2026**, built for make.fun's `news-image-20261119` competition (`program/v1`).

## Stories Covered
- **Asia · Diplomacy**: Xi, Trump & Putin meet in Shenzhen for rare three-way APEC talks on trade, AI rules, and arms control.
- **Markets · AI**: Anthropic closes record \$81.3B IPO and begins Nasdaq trading (`ANT`) at \$83/share.
- **Europe · Security**: Berlin Ukraine Summit — Merz, Macron, and Burnham align security guarantees and defense support.
- **Middle East · Energy**: Strait of Hormuz tanker strikes & Gulf drone intercepts; IEA warns of historic energy security risk.
- **Climate · Türkiye**: COP31 enters final-day deadlock in Antalya over climate finance and fossil fuel roadmaps.
- **Americas · Society**: Nationwide strike in Colombia as unions march in Bogotá and Cali against the tax bill.

## Run Locally
```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` deterministically (1024×1024, <= 1 MiB, no network access).
