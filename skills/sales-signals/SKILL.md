---
name: sales-signals
description: Find companies that are likely to buy right now from public buying signals (hiring for given roles, new funding, new registrations, public contracts won, import growth, trade show attendance, news), score and rank them, then add contacts and a reason to reach out. Uses the webdata-tools MCP server (or the Apify MCP server). Use when someone asks for warm leads, account lists, intent signals, "who is hiring for X", "who just raised money", prospect research for an ICP, or a weekly signal feed for sales.
---

# Sales signals

Turns public buying signals into a short, ranked account list with a reason to reach out and a contact for each account. Every signal comes from an official or public source (job boards, SEC filings, company registers, procurement portals, customs manifests, trade show directories, news), so each claim has a link the user can check.

## 1. Pin down the ideal customer first

Ask (or infer from the conversation) before calling anything:

- **What they sell** and **which team buys it** (security, data, sales, HR, finance, operations...).
- **Where**: countries, US states or cities.
- **Size or stage**: startups, mid-market, enterprise, public sector.
- **Known accounts**, if any: target list, current customers (for lookalikes) or competitors.

Map the product to the signals that fit it. Use two or three signals, not all of them.

| The user sells to... | Strong signals | Tool (webdata-tools MCP) |
|---|---|---|
| A team that is growing (security, data, sales tooling, recruiting) | Hiring for that team's roles | `find_hiring_companies` with `role_keywords`, then `get_company_jobs` for detail |
| Funded startups (banking, payroll, insurance, office, agencies) | New private raise (SEC Form D) | `search_startup_funding` |
| Brand-new businesses (accounting, banking, POS, web, telecom) | New company registration | `find_companies` with `mode: "new"` |
| Government suppliers or their competitors | Contracts won, open tenders | `search_tenders` (`notice_types: ["award"]` for winners) |
| Importers (freight, customs, sourcing, packaging) | Import volume and growth, shared factories | `search_import_records` with `find_lookalikes` |
| An industry vertical (manufacturing, medical, food, auto) | Exhibiting at its trade shows | `get_trade_show_exhibitors` |
| Anyone, as a timing trigger | Recent news: expansion, launch, new office, leadership change | `search_google_news` |

## 2. Collect the signals

- Start small: `max_items` 20-50 per tool. Every call is a paid run on the user's Apify account; each tool states its price. Tell the user the expected cost before a large pull.
- Keep the time window short and recent: `posted_within_days` 7-30. Old signals are not intent.
- Hiring: put the buyer team's job titles in `role_keywords` (`["security engineer", "SOC", "CISO"]`), and add `searches` to discover companies you do not know yet. Rows come back with `signalScore` (0-100), `matchingRoles`, `rolesPostedLast7Days`, `openRolesChange` and the roles themselves.
- Funding: filter by `states`, `industries` and `min_amount_raised`. Rows include `totalAmountSold`, `industry`, `firstSaleDate` and the founders and executives in `people`.
- Registrations: filter by `countries`, `industry_codes` (NACE, e.g. `62` IT) and `locations`.
- Don't call the same tool twice with the same input in one conversation; reuse the rows.

## 3. Join and score

Join rows on the company's name or website domain (normalise: lowercase, drop `Inc`, `LLC`, `Ltd`, `GmbH`, `SAS`). A company with two independent signals is worth far more than one with a single strong signal.

Score each account from 0 to 100 and show the parts:

- **Fit (up to 40)**: matches the user's industry, place and size.
- **Signal strength (up to 40)**: hiring `signalScore` scaled down, the size of a raise, the value of a contract, import growth (last 12 months against the 12 before).
- **Freshness (up to 20)**: 20 if the newest signal is from the last 7 days, 10 if from the last 30, 0 if older.
- Add 10 for each extra independent signal, capped at 100.

Drop accounts with no fit, however strong the signal.

## 4. Add contacts

For the top 10-20 accounts only. Form D filings and most registers carry no website: find each company's official domain first (a web search for its name plus city). Then pass the websites to `find_website_contacts` (`require_email: true`). It returns emails, phones and social links published on the company's own site, and you pay only for sites with contacts. Founders and executives from Form D filings (`people`) are named contacts too.

Never invent an email address or a person. If none is found, say so and suggest the company's contact page.

## 5. Write the answer

A table, best first:

| Account | Score | Signals (with dates) | Why now | Contact | Source links |
|---|---|---|---|---|---|

Then, for the top 5, a two-sentence opener that cites the signal in plain words ("Saw you're hiring three detection engineers in Austin...") and ties it to what the user sells. No flattery, no claims the data does not support.

End with: what was checked, what it cost, and the next step (for example, schedule the same pull weekly and only new rows come back).

## Make it a weekly feed

Each tool runs on an Apify Actor that supports scheduled runs with *Only new* (or *Only new or changed* for hiring), so a weekly schedule returns only accounts and signals the user has not seen. Point the user to the Actor's page to schedule it and send results to Slack, Google Sheets or a webhook.

## Without the webdata-tools server

The same Actors work through Apify's own MCP server (`https://mcp.apify.com`) with `call-actor`. Input field names are the Actors' own:

| Signal | Actor | Main input |
|---|---|---|
| Hiring | `tacps126/hiring-signals` | `roleKeywords`, `companies`, `searches`, `locations`, `postedWithinDays`, `maxItems` |
| Company jobs | `tacps126/jobs-harvester` | `careerPageUrls`, `companyNames` |
| Funding | `tacps126/startup-funding` | `postedWithinDays`, `states`, `industries`, `minAmountRaised`, `maxItems` |
| New companies | `tacps126/company-registry` | `mode: "new"`, `countries`, `registeredWithinDays`, `industryCodes`, `locations`, `maxItems` |
| Tenders and awards | `tacps126/tenders-radar` | `keywords`, `sectors`, `countries`, `postedWithinDays`, `maxItems` |
| Imports | `tacps126/us-import-records` | `companies`, `suppliers`, `findLookalikes` |
| Trade shows | `tacps126/exhibition-scraper` | `startUrls` (exhibitor-list links), `maxResults` |
| News | `tacps126/google-news` | `queries`, `timeframe`, `country`, `maxItems` |
| Contacts | `tacps126/contact-details` | `startUrls` (websites), `requireEmail`, `maxItems` |

Fetch each Actor's input schema (`fetch-actor-details`) before the first call.

## Rules

- Public business data only. Use contacts for relevant, personal outreach and follow the law where the user is (CAN-SPAM, GDPR, CASL).
- Every signal in the answer carries its source link and date.
- Say when a source returned nothing or failed; don't fill gaps with guesses.
