# webdata-tools-mcp

[![npm](https://img.shields.io/npm/v/webdata-tools-mcp)](https://www.npmjs.com/package/webdata-tools-mcp)
[![GitHub release](https://img.shields.io/github/v/release/tacps126/webdata-tools-mcp)](https://github.com/tacps126/webdata-tools-mcp/releases/latest)
[![CI](https://github.com/tacps126/webdata-tools-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/tacps126/webdata-tools-mcp/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.tacps126%2Fwebdata--tools--mcp-2b6cb0)](https://github.com/modelcontextprotocol/registry)
[![Smithery](https://img.shields.io/badge/Smithery-tacps126%2Fwebdata--tools--mcp-ff5601)](https://smithery.ai/servers/tacps126/webdata-tools-mcp)
[![webdata-tools-mcp MCP server](https://glama.ai/mcp/servers/tacps126/webdata-tools-mcp/badges/score.svg)](https://glama.ai/mcp/servers/tacps126/webdata-tools-mcp)

An [MCP](https://modelcontextprotocol.io) server that gives AI agents twenty-seven web-data tools: job
postings (company career sites, remote jobs, startups on Wellfound, US tech jobs on Dice, Indeed,
Naukri), hiring signals, Google News, official government updates (US, UK, EU, India), public tenders and contract awards (US, EU, UK, France, Spain, Canada, Australia and more), official weather and disaster warnings (US, Europe, India, Brazil, worldwide), public funding calls (US Grants.gov, EU Horizon Europe and more, UKRI, Australia), notices from all 748 Indian district websites, new laws and bills (EU, UK, US), research papers and patents, field trends and idea validation, Trustpilot and app-store reviews, Reddit mentions and
buying-intent leads, website contacts, German and Austrian property listings, Shopify products and
store analysis, trade-show exhibitor lists and upcoming events. Two ready-made prompts turn the research
tools into an innovation analyst that works the same with any model.

Each tool runs a ready-made [Apify](https://apify.com/tacps126) Actor and returns clean JSON. You
pay Apify per result (about $1–3 per 1,000 results); there is no subscription and nothing is sent
anywhere except Apify.

## Tools

| Tool | What it returns | Cost (approx.) | Actor |
|------|-----------------|----------------|-------|
| `search_google_news` | News articles with the publisher's real URL, date, related coverage | $2 / 1,000 articles | [google-news](https://apify.com/tacps126/google-news) |
| `find_hiring_companies` | Which companies are hiring for given roles (buying-intent signal) | 1¢ per company with a signal | [hiring-signals](https://apify.com/tacps126/hiring-signals) |
| `get_company_jobs` | All open jobs from career pages or company names (13 job-board systems: Greenhouse, Lever, Ashby, Workday, Rippling, …) | $1 / 1,000 jobs | [jobs-harvester](https://apify.com/tacps126/jobs-harvester) |
| `find_remote_jobs` | Remote jobs from company job boards plus the Remote OK, Jobicy, Working Nomads and Himalayas feeds | $2 / 1,000 jobs | [remote-jobs-scraper](https://apify.com/tacps126/remote-jobs-scraper) |
| `search_startup_jobs` | Startup jobs on Wellfound by role and city: salary and equity, startup size and pitch | $2 / 1,000 jobs | [wellfound-jobs-scraper](https://apify.com/tacps126/wellfound-jobs-scraper) |
| `search_tech_jobs` | US tech jobs on Dice: salary, employer type, Easy Apply, remote flag | $0.55 / 1,000 jobs | [dice-jobs-scraper](https://apify.com/tacps126/dice-jobs-scraper) |
| `search_indeed_jobs` | Indeed listings in 9 countries | $3 / 1,000 jobs | [indeed-jobs](https://apify.com/tacps126/indeed-jobs) |
| `search_naukri_jobs` | Naukri.com jobs (India): full description, salary in rupees, experience, rating | $1.50 / 1,000 jobs | [naukri-jobs-scraper](https://apify.com/tacps126/naukri-jobs-scraper) |
| `get_trustpilot_reviews` | Reviews, TrustScore and company profile | $0.50 / 1,000 reviews | [trustpilot-reviews](https://apify.com/tacps126/trustpilot-reviews) |
| `get_app_reviews` | App Store and Google Play reviews | $0.20 / 1,000 reviews | [app-reviews](https://apify.com/tacps126/app-reviews) |
| `search_reddit` | Reddit posts and comments by keyword or subreddit, tagged with buying intent | $1 / 1,000 items | [reddit-monitor](https://apify.com/tacps126/reddit-monitor) |
| `find_reddit_leads` | Reddit posts asking for a tool like yours, seeking a competitor alternative, comparing or complaining | $2 / 1,000 leads + $0.10 / 1,000 posts read | [reddit-lead-finder](https://apify.com/tacps126/reddit-lead-finder) |
| `search_gov_updates` | Official government updates: Federal Register rules and notices, GOV.UK, European Commission, SEC, RBI and SEBI circulars, any RSS feed; sector and keyword filters | $3 / 1,000 updates | [gov-radar](https://apify.com/tacps126/gov-radar) |
| `get_alerts` | Official weather and disaster warnings: US NWS, MeteoAlarm (38 countries), India NDMA, Brazil INMET, GDACS, USGS; hazard, severity, area filters | $2 / 1,000 alerts | [alerts-radar](https://apify.com/tacps126/alerts-radar) |
| `search_grants` | Open and forecast funding calls: US Grants.gov, EU Funding & Tenders (Horizon Europe…), UKRI; grant size, budget, deadline, eligibility | $3 / 1,000 calls | [grants-radar](https://apify.com/tacps126/grants-radar) |
| `get_india_district_notices` | Tenders, recruitment and announcements from India's 748 district websites, by state and district | $3 / 1,000 notices | [india-district-notices](https://apify.com/tacps126/india-district-notices) |
| `search_legislation` | New laws and bills: EU regulations and directives (EUR-Lex), UK Acts and SIs, US public laws and bills, Australian and Canadian regulations | $3 / 1,000 laws | [legislation-radar](https://apify.com/tacps126/legislation-radar) |
| `screen_sanctions` | Screen names against official OFAC, UN, EU, UK and Canada sanctions lists (verdict per name) | $3 / 1,000 names | [sanctions-screener](https://apify.com/tacps126/sanctions-screener) |
| `search_recalls` | Product recalls and safety alerts: FDA, CPSC, Health Canada, UK FSA/OPSS, EU Safety Gate | $2 / 1,000 recalls | [recalls-radar](https://apify.com/tacps126/recalls-radar) |
| `search_tenders` | Public tenders and contract awards: US SAM.gov, EU TED, UK, France, Spain, Germany, Netherlands, Canada, Colombia, Australia, South Africa; sector, CPV/UNSPSC, value filters | $4 / 1,000 notices | [tenders-radar](https://apify.com/tacps126/tenders-radar) |
| `search_research` | Papers, preprints and patents from OpenAlex, arXiv, PubMed and Europe PMC, merged; newest or most influential first, with field-normalized impact | $3 / 1,000 results | [research-radar](https://apify.com/tacps126/research-radar) |
| `analyze_field` | A technology field's opportunity score with reasons, growth and momentum, industry participation and top companies, leading countries, institutions and funders, rising topics; several fields ranked | $0.03 / field | [innovation-radar](https://apify.com/tacps126/innovation-radar) |
| `validate_idea` | How new or crowded an idea is, who is working on it, and the closest prior work | $0.03 / idea | [innovation-radar](https://apify.com/tacps126/innovation-radar) |
| `find_website_contacts` | Emails, phones, socials from websites | $2 / 1,000 sites with contacts | [contact-details](https://apify.com/tacps126/contact-details) |
| `search_german_property_listings` | Rent/buy listings in Germany and Austria (ImmoScout24) | $1 / 1,000 listings | [immobilienscout24-scraper](https://apify.com/tacps126/immobilienscout24-scraper) |
| `get_shopify_products` | Prices, discounts, stock, variants from Shopify stores | $1 / 1,000 products | [shopify-products](https://apify.com/tacps126/shopify-products) |
| `analyze_shopify_stores` | Store location, currency, catalog size and snapshot, e-mails, phones, socials | $4 / 1,000 stores | [shopify-store-analyzer](https://apify.com/tacps126/shopify-store-analyzer) |
| `get_trade_show_exhibitors` | Trade-show exhibitors: booth, email, phone, website, address (91 shows or any supported exhibitor-list link; changes-only monitoring) | $2 / 1,000 exhibitors | [exhibition-scraper](https://apify.com/tacps126/exhibition-scraper) |
| `find_events` | Upcoming events from Luma, Eventbrite, Meetup: venue, organiser, hosts, tickets, attendees | $1 / 1,000 events | [events-scraper](https://apify.com/tacps126/events-scraper) |

Every tool also takes an optional `extra_input` object for any other field the Actor documents.
Every result comes back as text and as structured content (`tool`, `count`, `shown`, `truncated`,
`items`), and every tool is marked read-only, so clients can run it without asking.

More about the tools: <https://tacps126.github.io/mcp.html>

## Prompts and agent skill

Two ready-made prompts turn the research tools into an analyst, whichever model you use (Claude, GPT, Gemini, a local model): the evidence, the reading guide and the answer shape are fixed, so results stay comparable.

| Prompt | What it does |
|--------|--------------|
| `field-opportunity-analysis` | Runs `analyze_field` on your fields, then writes ranked opportunities: what to build, for whom, why now, capital needed, who to talk to |
| `idea-validation` | Runs `validate_idea`, then assesses novelty, closest prior work, timing, who is already there, capital, risks and next steps |

For agents that load skills (Claude Code, Codex and others), copy [`skills/innovation-analyst`](skills/innovation-analyst/SKILL.md) into your skills folder.

## Setup

1. Create a free [Apify account](https://apify.com) and copy your API token from
   **Console → Settings → API & Integrations**.
2. Add the server to your client. The token goes in `APIFY_TOKEN`.

**Claude Desktop, one click:** download `webdata-tools-mcp-<version>.mcpb` from the
[latest release](https://github.com/tacps126/webdata-tools-mcp/releases/latest) and open it. Claude
Desktop installs it and asks for your Apify token.

**Claude Desktop / Cursor / Windsurf** (`mcpServers` config):

```json
{
  "mcpServers": {
    "webdata": {
      "command": "npx",
      "args": ["-y", "webdata-tools-mcp"],
      "env": { "APIFY_TOKEN": "<your Apify token>" }
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add webdata -e APIFY_TOKEN=<your Apify token> -- npx -y webdata-tools-mcp
```

Requires Node.js 18 or newer.

Releases are tagged and published by CI from `main` (`.github/workflows/release.yml`).

## Try it

- "Which of these companies are hiring data engineers right now? https://boards.greenhouse.io/stripe, https://jobs.lever.co/spotify"
- "Find remote senior engineer jobs open to people in Canada posted this week."
- "Who on Reddit is looking for an alternative to HubSpot this month?"
- "Analyze these Shopify stores and give me their country, product count and contact e-mail: allbirds.com, gymshark.com"
- "Show the 1 and 2 star Trustpilot reviews of example.com from the last 30 days and group the complaints."
- "Find news from the last 7 days about open-source LLM licensing, with the real publisher links."
- "What should a seed-stage founder build in sodium-ion batteries? Compare it with solid-state." (field-opportunity-analysis prompt)
- "Find the most influential papers of the last three years on retrieval augmented generation."
- "Get contact emails for these 20 agency websites." (use only for lawful business outreach)

## Settings

| Environment variable | Default | Meaning |
|---|---|---|
| `APIFY_TOKEN` | required | Your Apify API token |
| `WEBDATA_MAX_CHARGE_USD` | `0.5` | Spend cap per tool call; Apify stops the run when it is reached |
| `WEBDATA_TIMEOUT_SECS` | `150` | How long one call may run (30 to 300) |

## Cost safety

- Every call is capped at **$0.50** of Apify spend (`WEBDATA_MAX_CHARGE_USD` changes it). Apify stops
  the run when the cap is reached.
- `max_items` defaults to small numbers (20–100) and has a hard maximum per tool.
- Long text fields are shortened to 600 characters, and one result is limited to about 60,000
  characters, so a call cannot flood the agent's context.

## No install: Apify's hosted MCP server

You can also use Apify's own server with these Actors selected, with nothing to install:

```json
{
  "mcpServers": {
    "apify": { "url": "https://mcp.apify.com?tools=tacps126/google-news,tacps126/hiring-signals,tacps126/trustpilot-reviews" }
  }
}
```

It signs you in with OAuth. The tools take the Actors' raw input fields instead of the simplified
arguments above.

## Development

```bash
npm install
npm test                                  # offline: mapping, errors, size limits, MCP handshake
node scripts/sync-actor-inputs.mjs        # refresh test/fixtures from the published Actors
APIFY_TOKEN=... node scripts/smoke.mjs    # live check, a few cents
```

`test/fixtures/actor-inputs.json` lists the input fields of each published Actor; the tests fail if
a tool sends a field the Actor does not accept.

## Responsible use

The Actors read publicly available pages. You are responsible for following each site's terms and
the law that applies to you (GDPR, CAN-SPAM) when you use the data, especially contact details.

## Listed on

<a href="https://glama.ai/mcp/servers/tacps126/webdata-tools-mcp"><img width="380" height="200" src="https://glama.ai/mcp/servers/tacps126/webdata-tools-mcp/badges/card.svg" alt="webdata-tools-mcp on Glama" /></a>
<a href="https://mcprush.com/to/webdata-tools-mcp?ref=badge"><img width="380" height="200" src="https://mcprush.com/badge/webdata-tools-mcp/card.svg" alt="Webdata Tools MCP server on MCPRush" /></a>

Also on [npm](https://www.npmjs.com/package/webdata-tools-mcp), the official [MCP Registry](https://github.com/modelcontextprotocol/registry) (`io.github.tacps126/webdata-tools-mcp`), and [Smithery](https://smithery.ai/servers/tacps126/webdata-tools-mcp).

## License

MIT
