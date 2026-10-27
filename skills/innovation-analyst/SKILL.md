---
name: innovation-analyst
description: Analyse technology fields and validate product or research ideas from open research data (OpenAlex, Europe PMC patents) with the webdata-tools MCP server, then write evidence-backed opportunities — what to build, for whom, why now, capital needed, who to talk to. Use when someone asks what to build in a field, whether an idea is new or crowded, how fast a technology is growing, who leads it (companies, labs, countries), or to compare several technologies.
---

# Innovation analyst

Turns the structured evidence from the `analyze_field`, `validate_idea` and `search_research` tools (webdata-tools MCP server, backed by the Innovation Radar and Research Radar Apify Actors) into an analysis. Works with any model: the evidence, the reading guide and the answer shape are fixed, so results stay comparable.

## Pick the tool

| Question | Call |
|---|---|
| "What should I build in X?", "Is X growing?", "Who leads X?", "Compare X, Y, Z" | `analyze_field` with all fields in one call (several come back ranked) |
| "Is my idea new?", "Who is already doing this?" | `validate_idea`; add `analyze_field` on the core technology for growth and industry signals |
| "What's the key recent work?", "Find papers on X" | `search_research` with `sort_by: "impact"` for influential work, `"newest"` for alerts |

Each field or idea costs about $0.03 on the user's Apify account. Don't call the same field twice in one conversation; reuse the record.

## How to read the evidence

- `scores.opportunity` (0–100) and `scores.why`: the overall ranking and the signals behind it.
- `scores.momentum` (0–100): output in the last two full years against the two before; 50 ≈ +40%.
- `scores.labToMarketGap` (0–100): high momentum with few company authors — research is ahead of products.
- `industry.recentShare`: share of recent works with a company author (under 5% academic, 5–15% engaging, over 15% active); `industry.trend`: companies moving in or out.
- `scores.geographicConcentration`: share of the top country among the leaders; high means supply-chain, policy and partner risk.
- `risingTopics`: sub-topics whose share grew most. `standoutRecentWorks`: the most cited recent papers.
- `topCompanies`, `keyResearchers`, `topInstitutions`, `topFunders`: partners, hires, licensors, competitors.
- `reviewShare`: many review papers means the field is consolidating.
- `relatedPatents`: the newest patents on the subject (`likelyExpiredByTerm` = filed 20+ years ago).
- `freeToUsePatents`: older European patents that look free to use: expired, withdrawn/refused/revoked everywhere, or lapsed in some countries (`legalStatus.lapsedIn`; `feesPaidIn` = still maintained there). Never legal advice.
- `patentTrend`: worldwide patent publications, last two full years vs the two before. Patents rising faster than papers = commercialisation; papers rising without patents = still in the lab.
- `growth.stage` says when counts are small: percentages are noisy then; say so.
- Validation: `crowdedness` (open, early, active, crowded), `matchingWorks`, `worksLastTwoYears`, `closestWorks`, `whoIsWorkingOnIt`.
- `broaderSpace` / `position`: the biggest neighbouring space with one term left out. "Open niche in a crowded field" means the application is new but the base technology is busy: proof it works, and competition for talent and suppliers.

## Write the analysis

Capital buckets: **under $50k** (software or a service), **$50k–$1M** (hardware or regulated software), **over $1M** (deep tech, manufacturing, clinical).

**Field landscape** — sections:
1. Summary: two or three sentences; with several fields, the ranking and why.
2. Opportunities, three to five, best first: the idea, for whom, why now (name the signal), capital bucket with the reason, who to talk to (from the evidence).
3. Risks.
4. Evidence quality: strong, moderate or thin, and why.

**Idea validation** — sections: Novelty, Closest prior work, Timing, Who is already there, Capital (bucket and why), Risks, Next steps (three), Evidence quality.

Rules: cite the numbers you rely on; name real organisations only when they appear in the evidence; no generic advice ("do market research"); say when the evidence is thin. Research leads products by years — treat trends as early signals, not market size.

## Without the MCP server

The Innovation Radar Actor writes an `AI_BRIEF` record to its run's key-value store: this same rubric plus the run's evidence. Paste it into any assistant.
