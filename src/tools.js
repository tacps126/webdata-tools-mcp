// Tool catalogue. Each tool maps a small, agent-friendly argument set onto one Actor's input.
// `extra_input` lets an agent pass any other documented Actor input field through unchanged.

import { z } from 'zod';

const maxItems = (def, max = 500) =>
  z
    .number()
    .int()
    .min(1)
    .max(max)
    .default(def)
    .describe(`Maximum results to return (default ${def}, max ${max}). Cost scales with this.`);

export const extraInput = z
  .record(z.string(), z.unknown())
  .optional()
  .describe('Advanced: extra Actor input fields, merged over the defaults.');

const strings = (desc) => z.array(z.string().min(1)).min(1).describe(desc);

const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0),
    ),
  );

/** Each tool: name, actor, title, description, price note, input shape, map(args) -> Actor input. */
export const TOOLS = [
  {
    name: 'search_google_news',
    actor: 'tacps126/google-news',
    title: 'Search Google News',
    price: 'about $0.001 per article',
    description:
      'Search Google News (any language and country) and return articles with the publisher\'s real article URL, publisher, date and related coverage. Supports Google operators ("exact phrase", -exclude, OR, intitle:) and site filters.',
    shape: {
      query: z.string().min(1).describe('Search query, e.g. "generative AI" or "tesla -musk".'),
      country: z.string().length(2).default('US').describe('Two-letter edition country, e.g. US, GB, DE.'),
      language: z.string().min(2).default('en').describe('Language code, e.g. en, de, fr.'),
      timeframe: z.enum(['1h', '1d', '7d', '30d', '1y']).optional().describe('Only articles newer than this.'),
      sites: z.array(z.string()).optional().describe('Limit to these publisher domains, e.g. ["reuters.com"].'),
      max_items: maxItems(20, 200),
    },
    map: (a) =>
      clean({
        queries: [a.query],
        country: a.country,
        language: a.language,
        timeframe: a.timeframe,
        sites: a.sites,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'find_hiring_companies',
    actor: 'tacps126/hiring-signals',
    title: 'Find companies hiring for given roles',
    price: 'about $0.01 per company with a matching signal; companies without one are free',
    description:
      'Buying-intent signal: which companies are hiring for the roles you care about, how many roles, how fresh, and seniority/locations. Give target accounts (their jobs-page URLs on Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Recruitee, Personio, Teamtailor) and/or job-search phrases to discover companies.',
    shape: {
      role_keywords: z
        .array(z.string())
        .optional()
        .describe('A role counts when its title contains any of these words, e.g. ["data engineer","security"]. Empty = every role.'),
      companies: z
        .array(z.string())
        .optional()
        .describe('Target accounts\' jobs-page URLs, e.g. "https://boards.greenhouse.io/stripe".'),
      searches: z
        .array(z.string())
        .optional()
        .describe('Job-search phrases to discover companies you do not know yet, e.g. "head of security".'),
      locations: z.array(z.string()).optional().describe('Keep roles in these locations.'),
      posted_within_days: z.number().int().min(1).max(365).default(30).describe('Only roles posted in the last N days.'),
      max_items: maxItems(50, 500),
    },
    check: (a) =>
      (a.companies?.length || a.searches?.length)
        ? null
        : 'Provide at least one of: companies (jobs-page URLs) or searches (job-search phrases).',
    map: (a) =>
      clean({
        companies: a.companies,
        searches: a.searches,
        roleKeywords: a.role_keywords,
        locations: a.locations,
        postedWithinDays: a.posted_within_days,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_company_jobs',
    actor: 'tacps126/jobs-harvester',
    title: 'Get all open jobs from company career pages',
    price: 'about $0.0015 per job',
    description:
      'All open jobs from companies in one normalized format (title, company, location with country code, remote/hybrid, seniority, salary, skills, apply URL, posted date). Give career-page URLs (the company\'s own careers page or its job board) or just company names; 13 job-board systems are supported (Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable, Rippling, BambooHR, Pinpoint, Breezy, Recruitee, Personio, Teamtailor) and found automatically.',
    shape: {
      career_page_urls: z.array(z.string()).optional().describe('Career page URLs, e.g. "https://www.figma.com/careers" or "https://jobs.lever.co/spotify".'),
      company_names: z.array(z.string()).optional().describe('Company names, e.g. ["Datadog", "Ramp"]; each is looked up on every supported job-board system.'),
      title_includes: z.array(z.string()).optional().describe('Keep jobs whose title contains any of these.'),
      location_includes: z.array(z.string()).optional().describe('Keep jobs in these locations.'),
      countries: z.array(z.string()).optional().describe('Keep jobs in these countries: ISO codes ("US", "DE") or names.'),
      remote_only: z.boolean().optional().describe('Only remote jobs.'),
      posted_within_days: z.number().int().min(1).max(365).optional().describe('Only jobs posted in the last N days.'),
      max_items: maxItems(50),
    },
    check: (a) =>
      (a.career_page_urls?.length || a.company_names?.length)
        ? null
        : 'Provide at least one of: career_page_urls or company_names.',
    map: (a) =>
      clean({
        careerPageUrls: a.career_page_urls,
        companyNames: a.company_names,
        titleIncludes: a.title_includes,
        locationIncludes: a.location_includes,
        countries: a.countries,
        remoteOnly: a.remote_only,
        postedWithinDays: a.posted_within_days,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'find_remote_jobs',
    actor: 'tacps126/remote-jobs-scraper',
    title: 'Find remote jobs from company career sites and remote-job feeds',
    price: 'about $0.002 per job',
    description:
      'Remote jobs straight from employers: hundreds of company job boards plus the Remote OK, Jobicy, Working Nomads and Himalayas feeds, keeping only roles the posting marks as remote. Normalized title, company, country, seniority, salary and skills; each job links to its source.',
    shape: {
      title_includes: z.array(z.string()).optional().describe('Keep jobs whose title contains any of these, e.g. ["engineer"].'),
      countries: z.array(z.string()).optional().describe('Keep jobs open to these countries: ISO codes ("US", "CA") or names.'),
      posted_within_days: z.number().int().min(1).max(365).optional().describe('Only jobs posted in the last N days.'),
      min_annual_salary: z.number().int().min(0).optional().describe('Minimum yearly pay in the posting\'s currency (jobs without pay are kept).'),
      max_items: maxItems(50),
    },
    map: (a) =>
      clean({
        titleIncludes: a.title_includes,
        countries: a.countries,
        postedWithinDays: a.posted_within_days,
        minAnnualSalary: a.min_annual_salary,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_startup_jobs',
    actor: 'tacps126/wellfound-jobs-scraper',
    title: 'Search startup jobs on Wellfound (AngelList Talent)',
    price: 'about $0.002 per job',
    description:
      'Startup jobs from Wellfound by role and city, or remote: title, startup name, size and pitch, salary and equity range, years of experience, remote or on-site, apply link.',
    shape: {
      role: z.string().min(1).describe('The role, e.g. "software engineer", "product manager", "designer".'),
      city: z.string().optional().describe('Optional city, e.g. "San Francisco", "New York", "London".'),
      remote: z.boolean().default(false).describe('Only remote jobs (ignores city).'),
      max_items: maxItems(50),
    },
    map: (a) =>
      clean({
        query: a.role,
        location: a.remote ? undefined : a.city,
        remote: a.remote || undefined,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_tech_jobs',
    actor: 'tacps126/dice-jobs-scraper',
    title: 'Search US tech jobs on Dice',
    price: 'about $0.00055 per job',
    description:
      'US tech jobs from Dice by keyword and city: title, company, location, salary text, employer type (direct hire or recruiter), Easy Apply, remote / on-site / hybrid, posted and updated dates.',
    shape: {
      query: z.string().min(1).describe('What to search for, e.g. "data engineer", "java developer".'),
      location: z.string().optional().describe('Optional US city or state, e.g. "Austin, TX".'),
      remote: z.boolean().default(false).describe('Only remote jobs.'),
      max_items: maxItems(50, 300),
    },
    map: (a) =>
      clean({
        query: a.query,
        location: a.location,
        remote: a.remote || undefined,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_indeed_jobs',
    actor: 'tacps126/indeed-jobs',
    title: 'Search Indeed jobs',
    price: 'about $0.0015 per job (back to $0.003 on 6 Dec 2026)',
    description:
      'Search Indeed job listings by keyword and location in 9 countries (us, uk, ca, au, ie, de, fr, nl, sg): title, company, location, salary, job type, benefits, skills, apply link and (with details) the full job description.',
    shape: {
      query: z.string().min(1).describe('Job title, skill or company, e.g. "react developer".'),
      location: z.string().optional().describe('City, state, postcode or "Remote". Empty = whole country.'),
      country: z.enum(['us', 'uk', 'ca', 'au', 'ie', 'de', 'fr', 'nl', 'sg']).default('us').describe('Indeed country site.'),
      date_posted_days: z.enum(['1', '3', '7', '14']).optional().describe('Only jobs posted in the last N days.'),
      job_type: z.enum(['fulltime', 'parttime', 'contract', 'temporary', 'internship']).optional().describe('Only this employment type.'),
      include_details: z.boolean().default(true).describe("Add each job's full description. Off = search-card summary only."),
      max_items: maxItems(30),
    },
    map: (a) =>
      clean({
        queries: [a.query],
        locations: a.location ? [a.location] : undefined,
        country: a.country,
        datePosted: a.date_posted_days,
        jobType: a.job_type,
        includeDetails: a.include_details,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_naukri_jobs',
    actor: 'tacps126/naukri-jobs-scraper',
    title: 'Search Naukri.com jobs (India)',
    price: 'about $0.0015 per job',
    description:
      "Jobs from Naukri.com, India's largest job board, by keyword and city: title, company, AmbitionBox rating, experience range in years, skills, and (with details) the full description, salary in rupees, industry, department and qualifications.",
    shape: {
      query: z.string().min(1).describe('Job title, skill or company, e.g. "python developer".'),
      location: z.string().optional().describe('City in India, e.g. "Bangalore", "Pune", "Delhi NCR". Empty = all of India.'),
      date_posted_days: z.enum(['1', '3', '7', '15', '30']).optional().describe('Only jobs posted in the last N days.'),
      include_details: z.boolean().default(true).describe('Open each job for the full description, salary, industry and qualifications. Off = faster, search-card fields only.'),
      max_items: maxItems(30, 500),
    },
    map: (a) =>
      clean({
        queries: [a.query],
        locations: a.location ? [a.location] : undefined,
        datePosted: a.date_posted_days,
        includeDetails: a.include_details,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_trustpilot_reviews',
    actor: 'tacps126/trustpilot-reviews',
    title: 'Get Trustpilot reviews and company rating',
    price: 'about $0.00028 per review; company profile free',
    description:
      'Trustpilot reviews for one or more companies (rating, title, text, reviewer, country, date, company reply) plus the company\'s TrustScore and review counts. Filter by stars, language, verified and date period.',
    shape: {
      companies: strings('Company domains or Trustpilot URLs, e.g. "apify.com".'),
      star_ratings: z.array(z.enum(['1', '2', '3', '4', '5'])).optional().describe('Only these ratings, e.g. ["1","2"] for complaints.'),
      sort: z.enum(['recency', 'relevance']).default('recency').describe('Newest reviews first (recency) or most relevant first.'),
      search: z.string().optional().describe('Only reviews containing this text.'),
      date_period: z.enum(['last30days', 'last3months', 'last6months']).optional().describe('Only reviews from this period.'),
      max_reviews: maxItems(50),
    },
    map: (a) =>
      clean({
        companies: a.companies,
        starRatings: a.star_ratings,
        sort: a.sort,
        search: a.search,
        datePeriod: a.date_period,
        maxReviews: a.max_reviews,
      }),
    limit: (a) => a.max_reviews + a.companies.length,
  },
  {
    name: 'get_app_reviews',
    actor: 'tacps126/app-reviews',
    title: 'Get App Store and Google Play reviews',
    price: 'about $0.00015 per review',
    description:
      'Reviews from the Apple App Store and Google Play in one dataset: rating, text, author, date, app version, developer reply, sentiment. Mix both stores and several countries.',
    shape: {
      apps: strings('App Store / Google Play links, App Store ids ("id324684580") or Android package names ("com.spotify.music").'),
      countries: z.array(z.string().length(2)).default(['us']).describe('Two-letter store countries, e.g. ["us","gb"].'),
      star_ratings: z.array(z.enum(['1', '2', '3', '4', '5'])).optional().describe('Only these ratings, e.g. ["1","2"].'),
      max_items: maxItems(100, 2000),
    },
    map: (a) =>
      clean({
        apps: a.apps,
        countries: a.countries,
        starRatings: a.star_ratings,
        maxItems: a.max_items,
        maxReviewsPerApp: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_youtube_transcripts',
    actor: 'tacps126/youtube-transcripts',
    title: 'Get YouTube video transcripts',
    price: 'about $0.0025 per transcript (videos without captions are free)',
    description:
      'Full transcripts of YouTube videos, and of every video in a playlist, a channel (newest first) or a YouTube search, as clean text plus timed caption lines, with title, channel, publish date, length, views, description and keywords. Picks the caption language you prefer (a written transcript over an auto-generated one) and can translate (best effort). Use for summaries, RAG, research and content repurposing.',
    shape: {
      videos: z.array(z.string().min(1)).optional().describe('Video links or ids, playlist links, channel @handles or channel links.'),
      searches: z.array(z.string().min(1)).optional().describe('YouTube searches whose top videos to read, e.g. ["rust async tutorial"].'),
      max_videos_per_source: z.number().int().min(1).max(500).default(20).describe('Videos taken from each playlist, channel or search.'),
      languages: z.array(z.string().min(2)).optional().describe('Caption languages in order of preference, e.g. ["en", "de"] (default en).'),
      translate_to: z.string().optional().describe('Language code to translate the captions into (best effort).'),
      include_segments: z.boolean().default(true).describe('Add every caption line with its start time. Off = plain text only.'),
      max_items: maxItems(20, 500),
    },
    check: (a) => (!a.videos?.length && !a.searches?.length ? 'Give videos (links, ids, playlists, channels) or searches.' : undefined),
    map: (a) =>
      clean({
        videos: a.videos,
        searchQueries: a.searches,
        maxVideosPerSource: a.max_videos_per_source,
        languages: a.languages,
        translateTo: a.translate_to,
        includeSegments: a.include_segments,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_research',
    actor: 'tacps126/research-radar',
    title: 'Search papers, preprints and patents',
    price: 'about $0.003 per result',
    description:
      'Papers, preprints and patents from OpenAlex, arXiv, PubMed, Europe PMC and the European Patent Office (worldwide patents: EP, WO, US, CN, JP, KR...) in one deduplicated list, newest first or most influential first: title, abstract, authors and affiliations, venue, DOI, PDF link, citations, citations per year, field-normalized impact (top 1% / 10%), open-access status, and for patents the number, applicants, inventors, IPC classes and family id. Retracted papers are left out.',
    shape: {
      queries: strings('Topics, keywords or phrases, e.g. "solid state battery".'),
      sources: z.array(z.enum(['openalex', 'arxiv', 'pubmed', 'europepmc', 'patents', 'crossref'])).optional().describe('Which sources to search. Default: openalex, arxiv, pubmed, europepmc, patents.'),
      posted_within_days: z.number().int().min(1).max(3650).optional().describe('Only results published in the last N days.'),
      open_access_only: z.boolean().default(false).describe('Only papers that are free to read.'),
      sort_by: z.enum(['newest', 'citations', 'impact']).default('newest').describe('newest first, most cited, or highest field-normalized impact (influential work).'),
      max_items: maxItems(30, 500),
    },
    map: (a) =>
      clean({
        queries: a.queries,
        sources: a.sources,
        postedWithinDays: a.posted_within_days,
        openAccessOnly: a.open_access_only,
        sortBy: a.sort_by,
        maxItemsPerSource: Math.min(Math.max(a.max_items, 10), 100),
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_gov_updates',
    actor: 'tacps126/gov-radar',
    title: 'Search official government updates',
    price: 'about $0.003 per update',
    description:
      'Official government updates in one list: US Federal Register rules, proposed rules (with comment deadlines) and notices, SEC press releases, GOV.UK news, guidance and consultations, European Commission press releases, Indian regulators (RBI, SEBI, TRAI, CERC, CDSCO, DGFT) circulars, orders and notifications, plus any RSS feed or official "What\'s new" list page you name. Filter by sector, keyword, authority and type; every update is tagged with its sectors.',
    shape: {
      keywords: strings('Words or phrases matched on title and summary, e.g. "AI", "stablecoin", "battery".').optional(),
      sectors: z.array(z.enum(['banking', 'securities', 'insurance', 'tax', 'trade', 'health', 'food', 'energy', 'environment', 'tech', 'transport', 'employment', 'housing', 'procurement', 'defense', 'education'])).optional().describe('Only updates about these sectors.'),
      jurisdictions: z.array(z.enum(['us', 'uk', 'eu', 'in'])).optional().describe('Countries / regions (default: all).'),
      types: z.array(z.string()).optional().describe('Update types, e.g. rule, proposed-rule, notice, guidance, consultation, circular, press-release.'),
      feed_urls: z.array(z.string().url()).optional().describe('Extra RSS/Atom feeds to read with the same filters.'),
      page_urls: z.array(z.string().url()).optional().describe('Official list pages (circulars, notifications, "What\'s new") to read like a feed; robots.txt is respected.'),
      posted_within_days: z.number().int().min(1).max(365).default(7).describe('Only updates from the last N days.'),
      max_items: maxItems(30, 500),
    },
    check: (a) =>
      !(a.keywords?.length || a.sectors?.length || a.jurisdictions?.length || a.feed_urls?.length || a.page_urls?.length)
        ? 'Give keywords, sectors, jurisdictions, feed_urls or page_urls so the search stays focused.'
        : undefined,
    map: (a) =>
      clean({
        keywords: a.keywords,
        sectors: a.sectors,
        jurisdictions: a.jurisdictions,
        types: a.types,
        feedUrls: a.feed_urls,
        pageUrls: a.page_urls,
        postedWithinDays: a.posted_within_days,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_alerts',
    actor: 'tacps126/alerts-radar',
    title: 'Get official weather and disaster warnings',
    price: 'about $0.002 per alert',
    description:
      'Official warnings in force from national services in one schema: US National Weather Service, MeteoAlarm (38 European countries), India NDMA (IMD, CWC, state disaster authorities), Brazil INMET, plus worldwide GDACS disasters and USGS earthquakes. Event, hazard type, severity, areas, start and expiry, instructions, issuing service. Most severe first.',
    shape: {
      countries: z.array(z.string()).optional().describe('ISO codes or names, e.g. ["IN"], ["US", "DE"], or "EU" for every MeteoAlarm country.'),
      states: strings('States or provinces by name or ISO 3166-2 code, e.g. ["Kerala", "US-TX"].').optional(),
      hazards: z.array(z.enum(['weather', 'rain', 'flood', 'storm', 'heat', 'cold', 'fire', 'drought', 'earthquake', 'tsunami', 'volcano', 'landslide', 'health', 'environment', 'transport', 'infrastructure', 'security', 'other'])).optional().describe('Only these hazard types.'),
      min_severity: z.enum(['minor', 'moderate', 'severe', 'extreme']).default('moderate').describe('Lowest CAP severity kept.'),
      areas: strings('Area names to match: a state, district, county or city, e.g. ["Kerala", "Texas"].').optional(),
      sent_within_hours: z.number().int().min(1).max(720).default(24).describe('Only alerts issued in the last N hours.'),
      max_items: maxItems(30, 500),
    },
    map: (a) =>
      clean({
        countries: a.countries,
        states: a.states,
        hazards: a.hazards,
        minSeverity: a.min_severity,
        areas: a.areas,
        sentWithinHours: a.sent_within_hours,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_grants',
    actor: 'tacps126/grants-radar',
    title: 'Search open public funding calls',
    price: 'about $0.003 per call',
    description:
      'Open and forecast public funding calls in one schema: US Grants.gov (every federal agency), EU Funding & Tenders (Horizon Europe, Digital Europe, LIFE, EU4Health, Erasmus+, cascade calls) and UKRI. Title, funder, programme, grant size (min/max), total budget, expected awards, deadline, eligibility, contacts, link. Soonest deadline first.',
    shape: {
      keywords: strings('Words matched on title, programme and description, e.g. ["battery", "energy storage"].').optional(),
      sectors: z.array(z.enum(['banking', 'securities', 'insurance', 'tax', 'trade', 'health', 'food', 'energy', 'environment', 'tech', 'transport', 'employment', 'housing', 'defense', 'education'])).optional().describe('Only calls about these sectors.'),
      countries: z.array(z.enum(['US', 'EU', 'GB'])).optional().describe('Funders: US (Grants.gov), EU (Funding & Tenders), GB (UKRI).'),
      min_award: z.number().optional().describe('Smallest grant size wanted (maximum award, in the call currency).'),
      min_days_to_deadline: z.number().int().min(0).default(0).describe('Leave out calls closing sooner than this.'),
      include_forecasts: z.boolean().default(true).describe('Include calls announced but not open yet.'),
      max_items: maxItems(30, 500),
    },
    check: (a) =>
      !(a.keywords?.length || a.sectors?.length || a.countries?.length)
        ? 'Give keywords, sectors or countries so the search stays focused.'
        : undefined,
    map: (a) =>
      clean({
        keywords: a.keywords,
        sectors: a.sectors,
        countries: a.countries,
        minAward: a.min_award,
        minDaysToDeadline: a.min_days_to_deadline,
        includeForecasts: a.include_forecasts,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_india_district_notices',
    actor: 'tacps126/india-district-notices',
    title: "Get notices from India's district websites",
    price: 'about $0.003 per notice',
    description:
      "Tenders, recruitment and announcements from the official websites of India's 748 districts (collector offices), by state and district: title (often Hindi or the state language), date, district, state, official PDF link. Newest first.",
    shape: {
      states: strings('States or union territories by name or ISO code, e.g. ["Bihar"], ["IN-UP"]. Up to 120 districts per call.').optional(),
      districts: strings('District names, e.g. ["Patna", "Lucknow"].').optional(),
      categories: z.array(z.enum(['tenders', 'recruitment', 'announcements'])).default(['tenders']).describe('Notice lists to read.'),
      keywords: strings('Whole words matched on titles.').optional(),
      posted_within_days: z.number().int().min(0).max(3650).default(30).describe('Only notices dated in the last N days (0 = any).'),
      max_items: maxItems(30, 500),
    },
    check: (a) => (!(a.states?.length || a.districts?.length) ? 'Give states or districts.' : undefined),
    map: (a) =>
      clean({
        states: a.states,
        districts: a.districts,
        categories: a.categories,
        keywords: a.keywords,
        postedWithinDays: a.posted_within_days,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_legislation',
    actor: 'tacps126/legislation-radar',
    title: 'Search new laws, regulations and bills',
    price: 'about $0.003 per law',
    description:
      'New legislation from official publishers in one schema: EU regulations, directives and decisions (EUR-Lex), UK Acts and statutory instruments of all four nations (legislation.gov.uk), US public laws and bill texts with their stage (GovInfo), Australian Acts and legislative instruments (Federal Register of Legislation), Canadian regulations (Canada Gazette Part II). Number, title, date, sectors, official text and PDF links. Newest first.',
    shape: {
      keywords: strings('Whole words matched on titles, e.g. ["sanctions", "artificial intelligence"].').optional(),
      countries: z.array(z.enum(['AU', 'CA', 'EU', 'GB', 'US'])).optional().describe('Jurisdictions (default: all).'),
      kinds: z.array(z.enum(['regulation', 'directive', 'decision', 'act', 'statutory-instrument', 'public-law', 'bill'])).optional().describe('Kinds of legislation.'),
      posted_within_days: z.number().int().min(1).max(365).default(7).describe('Only laws dated in the last N days.'),
      max_items: maxItems(30, 500),
    },
    map: (a) =>
      clean({
        keywords: a.keywords,
        countries: a.countries,
        kinds: a.kinds,
        postedWithinDays: a.posted_within_days,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'screen_sanctions',
    actor: 'tacps126/sanctions-screener',
    title: 'Screen names against official sanctions lists',
    price: 'about $0.003 per name',
    description:
      'Screens people and organisations against the official sanctions lists read from each publisher: US OFAC SDN and consolidated (non-SDN), UN Security Council, EU consolidated financial sanctions, UK Sanctions List, Canada and Switzerland (SECO). Matching handles transliteration (Cyrillic, Arabic), word order, patronymics, initials and company forms. Returns a verdict per name (match, possible-match, no-match) with the matching entries: list, programmes, countries, birth dates, identifiers, listing date and link. A screening aid, not legal advice.',
    shape: {
      names: strings('People or organisations to screen, e.g. ["Rosneft", "Vladimir Putin"].'),
      date_of_birth: z.string().optional().describe('For a single person: a date or year of birth, which lowers matches with a different birth year.'),
      country: z.string().optional().describe('For a single subject: a nationality or country (name or ISO code).'),
      entity_type: z.enum(['any', 'individual', 'entity']).default('any').describe('People only, organisations (with vessels and aircraft) only, or both.'),
      lists: z.array(z.enum(['us-ofac-sdn', 'us-ofac-cons', 'un', 'eu', 'gb', 'ca', 'ch'])).optional().describe('Lists to check (default: all).'),
      min_score: z.number().int().min(50).max(100).default(85).describe('Name similarity from which an entry is reported.'),
    },
    map: (a) =>
      clean({
        mode: 'screen',
        subjects:
          a.date_of_birth || a.country
            ? a.names.map((name) => clean({ name, dateOfBirth: a.date_of_birth, country: a.country }))
            : undefined,
        names: a.date_of_birth || a.country ? undefined : a.names,
        entityType: a.entity_type,
        lists: a.lists,
        minScore: a.min_score,
        maxItems: a.names.length,
      }),
    limit: (a) => a.names.length,
  },
  {
    name: 'search_recalls',
    actor: 'tacps126/recalls-radar',
    title: 'Search product recalls and safety alerts',
    price: 'about $0.002 per recall',
    description:
      'Product recalls and safety alerts from regulators in one schema: US FDA enforcement reports (food, drugs, medical devices), US CPSC consumer products, Health Canada / CFIA / Transport Canada, UK Food Standards Agency and OPSS, and the EU Safety Gate. Product, brands, company, hazard, class, date, distribution, remedy and official link. Newest first.',
    shape: {
      keywords: strings('Matched on title, product, brand, company and hazard, e.g. ["peanut", "lithium battery", "Acme"].').optional(),
      categories: z.array(z.enum(['food', 'drug', 'device', 'vehicle', 'consumer-product', 'cosmetic'])).optional().describe('Recall categories (default: all).'),
      countries: z.array(z.enum(['US', 'CA', 'GB', 'EU'])).optional().describe('Publishers by country (default: all).'),
      posted_within_days: z.number().int().min(1).max(365).default(30).describe('Only recalls published in the last N days.'),
      max_items: maxItems(30, 500),
    },
    map: (a) =>
      clean({
        keywords: a.keywords,
        categories: a.categories,
        countries: a.countries,
        postedWithinDays: a.posted_within_days,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'find_companies',
    actor: 'tacps126/company-registry',
    title: 'Find companies and new registrations in official registers',
    price: 'about $0.0025 per company',
    description:
      'Official company registers in one schema. mode "new": companies newly registered in France (BODACC), Norway (Brønnøysund), Finland (PRH), Estonia and the US states New York, Colorado, Connecticut and Oregon, and in France also insolvency judgments, deregistrations and business sales; filter by NACE/NAF industry code, city/region/postcode and keywords. mode "search": companies by name in France (with officers), Norway, Finland, Estonia, Czechia, the four US states and, for other countries, the worldwide LEI index. Registry id, legal form, status, dates, industry, address, employees, capital, officers or registered agents, business email where published (Connecticut), register link.',
    shape: {
      mode: z.enum(['new', 'search']).default('new').describe('new = registrations and register events; search = look up by name.'),
      names: strings('Company names to search (mode "search"), e.g. ["Nokia"].').optional(),
      countries: z.array(z.string()).optional().describe('ISO codes: FR, NO, FI, EE, CZ; US (all four states) or one state: US-NY, US-CO, US-CT, US-OR; others are searched in the LEI index.'),
      events: z.array(z.enum(['registration', 'insolvency', 'deregistration', 'sale'])).optional().describe('France, mode "new" (default: registration).'),
      industry_codes: strings('NACE/NAF code prefixes, e.g. ["56.10"] restaurants, ["62"] IT; NAICS for Connecticut.').optional(),
      locations: strings('Cities, regions or postcode prefixes, e.g. ["Oslo", "75"].').optional(),
      registered_within_days: z.number().int().min(1).max(365).default(7).describe('mode "new": the last N days.'),
      max_items: maxItems(50, 1000),
    },
    check: (a) => (a.mode === 'search' && !a.names?.length ? 'Give names to search.' : undefined),
    map: (a) =>
      clean({
        mode: a.mode,
        names: a.names,
        countries: a.countries,
        events: a.events,
        industryCodes: a.industry_codes,
        locations: a.locations,
        registeredWithinDays: a.registered_within_days,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_supplier_contracts',
    actor: 'tacps126/tenders-radar',
    title: 'List the public contracts a company won',
    price: 'about $0.004 per award (summaries free)',
    description:
      'Public contracts each company won: US federal (USAspending), every EU/EEA country (TED award notices) and the UK (Contracts Finder). First a summary per company (awards, total value per currency, top buyers, first and last award, legal names the portals used), then every award with buyer, value, date, codes and link. For competitor tracking, sales prospecting and supplier due diligence.',
    shape: {
      suppliers: strings('Company names, e.g. ["Accenture", "Palantir"].'),
      countries: z.array(z.string()).optional().describe('Limit to "US", "GB", "EU" or EU/EEA ISO codes (default: all three portals).'),
      awarded_within_days: z.number().int().min(1).max(3650).default(730).describe('Awards from the last N days.'),
      max_items: maxItems(50, 1000),
    },
    map: (a) =>
      clean({
        suppliers: a.suppliers,
        countries: a.countries,
        awardedWithinDays: a.awarded_within_days,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items + a.suppliers.length,
  },
  {
    name: 'search_tenders',
    actor: 'tacps126/tenders-radar',
    title: 'Search public tenders and contract awards',
    price: 'about $0.004 per notice',
    description:
      'Public procurement notices from official portals in one schema: US SAM.gov (federal), EU TED (every EU/EEA country), UK Find a Tender and Contracts Finder, France BOAMP, Spain PLACSP, Germany, Netherlands TenderNed, Canada CanadaBuys, Colombia SECOP II, Brazil PNCP, India GeM, Ukraine Prozorro, EU institutions (Funding & Tenders portal), US contract awards (USAspending), Australia AusTender (awards) and South Africa eTenders. Title, buyer, deadline, value and currency, CPV/UNSPSC/NAICS codes, sectors, buyer contacts, suppliers for awards, notice link. Open tenders by default.',
    shape: {
      keywords: strings('Words matched literally on title and description; add translations for non-English portals, e.g. ["software", "logiciel"].').optional(),
      sectors: z.array(z.enum(['banking', 'securities', 'insurance', 'tax', 'trade', 'health', 'food', 'energy', 'environment', 'tech', 'transport', 'employment', 'housing', 'defense', 'education'])).optional().describe('Sectors from CPV/UNSPSC/NAICS/PSC codes and multilingual terms (housing = construction and real estate).'),
      countries: z.array(z.string()).optional().describe('ISO codes, e.g. ["US", "GB", "FR", "CA"], or "EU" for every EU/EEA country.'),
      states: strings('States or regions by name or ISO 3166-2 code, e.g. ["Texas", "IN-MH"]; where the work is or the buyer sits.').optional(),
      notice_types: z.array(z.enum(['tender', 'award', 'planning', 'amendment', 'cancellation'])).default(['tender']).describe('tender = open opportunities; award = who won and for how much.'),
      codes: z.array(z.string()).optional().describe('CPV, UNSPSC, NAICS or PSC code prefixes, e.g. ["72"] for IT services (CPV) or ["5415"] (US NAICS).'),
      min_value: z.number().optional().describe('Minimum estimated value in the notice currency.'),
      posted_within_days: z.number().int().min(1).max(90).default(3).describe('Only notices from the last N days.'),
      max_items: maxItems(30, 500),
    },
    check: (a) =>
      !(a.keywords?.length || a.sectors?.length || a.countries?.length || a.codes?.length)
        ? 'Give keywords, sectors, countries or codes so the search stays focused.'
        : undefined,
    map: (a) =>
      clean({
        keywords: a.keywords,
        sectors: a.sectors,
        countries: a.countries,
        states: a.states,
        noticeTypes: a.notice_types,
        codes: a.codes,
        minValue: a.min_value,
        postedWithinDays: a.posted_within_days,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'analyze_field',
    actor: 'tacps126/innovation-radar',
    title: 'Analyse a technology or research field',
    price: 'about $0.03 per field',
    description:
      'A landscape of a technology or research field from open research data: an opportunity score (0-100) with its reasons, momentum, lab-to-market gap and geographic concentration; works per year and growth stage; industry participation and the top companies; key researchers, institutions, countries and funders; rising sub-topics, standout recent work, related patents, the worldwide patent filing trend and older European patents that look free to use (expired or lapsed, with legal status). Several fields come back ranked. For written opportunities, use the field-opportunity-analysis prompt.',
    shape: {
      fields: strings('Fields or technologies, e.g. "solid state battery", "CRISPR base editing".'),
      years: z.number().int().min(2).max(40).default(10).describe('Years of history for the trend.'),
    },
    map: (a) => clean({ mode: 'landscape', fields: a.fields, years: a.years, topWorks: 10 }),
    limit: (a) => a.fields.length,
  },
  {
    name: 'validate_idea',
    actor: 'tacps126/innovation-radar',
    title: 'Check how new or crowded an idea is',
    price: 'about $0.03 per idea',
    description:
      'How much research already covers a product or research idea: matching works, works in the last two years, crowdedness (open, early, active, crowded), growth, who is working on it (researchers, institutions, companies), the closest prior work, related patents, the patent trend and possibly free-to-use patents. For a written assessment, use the idea-validation prompt.',
    shape: {
      ideas: strings('Ideas in plain words, e.g. "a window that generates solar power with perovskite tandem cells".'),
    },
    map: (a) => clean({ mode: 'validate', ideas: a.ideas, topWorks: 10 }),
    limit: (a) => a.ideas.length,
  },
  {
    name: 'find_website_contacts',
    actor: 'tacps126/contact-details',
    title: 'Find emails, phones and social profiles on websites',
    price: 'about $0.00175 per website with contacts found; nothing found, no charge',
    description:
      'Finds business emails, phone numbers, addresses and social profiles (LinkedIn, X, Facebook, Instagram, YouTube) on any list of websites; it visits the contact and about pages itself. Use only for lawful business outreach (GDPR / CAN-SPAM).',
    shape: {
      websites: strings('Website addresses or domains, e.g. "apify.com".'),
      max_pages_per_site: z.number().int().min(1).max(20).default(5).describe('Pages read per website; contact, imprint and about pages are picked first.'),
      require_email: z.boolean().default(false).describe('Drop sites where no email was found.'),
      max_items: maxItems(50, 1000),
    },
    map: (a) =>
      clean({
        startUrls: a.websites,
        maxPagesPerSite: a.max_pages_per_site,
        requireEmail: a.require_email,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'find_local_businesses',
    actor: 'tacps126/contact-details',
    title: 'Find local businesses by category and city, with their contacts',
    price: 'about $0.00125 per business, plus $0.00175 when contacts are found on its website',
    description:
      'Lead lists without a list of websites: every business of the given kinds in a city or area (open map data: name, category, address, phone, listed email, website, coordinates), each website then checked for emails, phones and social profiles. Says whether the email was found on the business site and whether the site still works. Use only for lawful business outreach (GDPR / CAN-SPAM).',
    shape: {
      city: z.string().min(2).describe('Town or city, e.g. "Pune", "Austin", "Manchester".'),
      country_code: z.string().length(2).describe('Two-letter country code of the city, e.g. "IN", "US", "GB".'),
      categories: z.array(z.string().min(2)).optional().describe('Kinds of business in everyday words, e.g. ["dentist"], ["plumber","electrician"], ["indian restaurant"]. Empty = all businesses.'),
      radius_km: z.number().min(0.5).max(50).default(10).describe('Distance from the city centre.'),
      require_email: z.boolean().default(false).describe('Only businesses with an email.'),
      require_website: z.boolean().default(false).describe('Only businesses that list their own website.'),
      exclude_chains: z.boolean().default(false).describe('Leave out branches of chains and brands.'),
      max_items: maxItems(50, 1000),
    },
    map: (a) =>
      clean({
        city: a.city,
        countryCode: a.country_code,
        categories: a.categories,
        radiusKm: a.radius_km,
        requireEmail: a.require_email,
        requireWebsite: a.require_website,
        excludeChains: a.exclude_chains,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_german_property_listings',
    actor: 'tacps126/immobilienscout24-scraper',
    title: 'Search German and Austrian property listings (ImmoScout24)',
    price: 'about $0.00095 per listing',
    description:
      'Apartments and houses for rent or sale in Germany or Austria: price, rent, area, rooms, address with coordinates, energy class, features, agent, photos and dates. Not Switzerland.',
    shape: {
      country: z.enum(['de', 'at']).default('de').describe('de = Germany (immobilienscout24.de), at = Austria (immobilienscout24.at).'),
      locations: strings('Cities, districts or regions in plain words, e.g. ["Berlin","München Schwabing"]; in Austria a city or federal state, e.g. ["Wien","Tirol"].'),
      offer_type: z.enum(['rent', 'buy']).default('rent').describe('Rent or buy listings.'),
      property_type: z.enum(['apartment', 'house']).default('apartment').describe('Apartments or houses.'),
      min_price: z.number().optional().describe('Minimum price in EUR (monthly rent or purchase price).'),
      max_price: z.number().optional().describe('Maximum price in EUR (monthly rent or purchase price).'),
      min_area: z.number().optional().describe('Minimum area in m2.'),
      min_rooms: z.number().optional().describe('Minimum number of rooms.'),
      changes_only: z
        .boolean()
        .default(false)
        .describe('Only listings that are new, changed (old and new price, rent, size, rooms) or removed since the last call with the same search. For price tracking on a schedule.'),
      max_items: maxItems(50),
    },
    map: (a) =>
      clean({
        country: a.country,
        locations: a.locations,
        offerType: a.offer_type,
        propertyType: a.property_type,
        minPrice: a.min_price,
        maxPrice: a.max_price,
        minArea: a.min_area,
        minRooms: a.min_rooms,
        changesOnly: a.changes_only || undefined,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_shopify_products',
    actor: 'tacps126/shopify-products',
    title: 'Get products from Shopify stores',
    price: 'about $0.0004 per product',
    description:
      'Products from any Shopify store: prices, sale prices, discounts, stock, variants, SKUs, images and descriptions. Whole stores, collections or single products. Filter by sale, discount and price and sort across stores (best deals first). Useful for price and stock monitoring.',
    shape: {
      stores: strings('Store domains, collection links or product links, e.g. "allbirds.com".'),
      keywords: z.array(z.string()).optional().describe('Only products matching any of these words.'),
      only_on_sale: z.boolean().default(false).describe('Only products with a sale price.'),
      only_available: z.boolean().default(false).describe('Only products that are in stock.'),
      min_discount_percent: z.number().min(0).max(100).optional().describe('Only products discounted at least this much (%).'),
      min_price: z.number().min(0).optional().describe('Lowest price to keep, in the store currency.'),
      max_price: z.number().min(0).optional().describe('Highest price to keep, in the store currency.'),
      sort_by: z
        .enum(['default', 'cheapest', 'priciest', 'biggest_discount', 'newest', 'recently_updated', 'title'])
        .default('default')
        .describe('Order across all stores before the limit applies, e.g. "biggest_discount" for the best deals.'),
      max_items: maxItems(100, 1000),
    },
    map: (a) =>
      clean({
        startUrls: a.stores,
        keywords: a.keywords,
        onlyOnSale: a.only_on_sale || undefined,
        onlyAvailable: a.only_available || undefined,
        minDiscountPercent: a.min_discount_percent,
        minPrice: a.min_price,
        maxPrice: a.max_price,
        sortBy:
          {
            cheapest: 'priceLow',
            priciest: 'priceHigh',
            biggest_discount: 'discountHigh',
            newest: 'newest',
            recently_updated: 'recentlyUpdated',
            title: 'title',
          }[a.sort_by] || undefined,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_walmart_products',
    actor: 'tacps126/walmart-products',
    title: 'Get products from Walmart',
    price: 'about $0.003 per product, plus about $0.0022 per product with full details',
    description:
      'Walmart.com products from searches, category links or product links: price, was-price, rating, review count, seller, stock and sponsored flag. With details on: brand, model, UPC, specifications, description and seller rating. Filter by price, rating and stock; sort like the site. Useful for price checks, assortment research and price/stock monitoring.',
    shape: {
      queries: z.array(z.string()).optional().describe('Search words as typed on Walmart.com, e.g. ["air fryer"].'),
      links: z.array(z.string()).optional().describe('Walmart search, category or product links, or product item ids.'),
      sort_by: z
        .enum(['best_match', 'price_low', 'price_high', 'best_seller', 'rating_high', 'new'])
        .default('best_match')
        .describe('Order of search results.'),
      min_price: z.number().min(0).optional().describe('Lowest price to keep, in USD.'),
      max_price: z.number().min(0).optional().describe('Highest price to keep, in USD.'),
      min_rating: z.number().min(0).max(5).optional().describe('Lowest star rating to keep, e.g. 4.'),
      in_stock_only: z.boolean().default(false).describe('Drop products shown as out of stock.'),
      exclude_sponsored: z.boolean().default(false).describe('Drop sponsored (ad) placements.'),
      include_details: z.boolean().default(false).describe('Open each product page for brand, UPC, specs and description (extra cost per product).'),
      max_items: maxItems(50, 1000),
    },
    map: (a) =>
      clean({
        searchQueries: a.queries,
        startUrls: a.links,
        sortBy: a.sort_by,
        minPrice: a.min_price,
        maxPrice: a.max_price,
        minRating: a.min_rating,
        inStockOnly: a.in_stock_only || undefined,
        excludeSponsored: a.exclude_sponsored || undefined,
        includeDetails: a.include_details || undefined,
        maxItemsPerSearch: a.max_items,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
    check: (a) => ((a.queries && a.queries.length) || (a.links && a.links.length) ? null : 'Give at least one search (queries) or one link (links).'),
  },
  {
    name: 'analyze_shopify_stores',
    actor: 'tacps126/shopify-store-analyzer',
    title: 'Analyze Shopify stores (location, catalog, contacts)',
    price: 'about $0.004 per store',
    description:
      'For each Shopify store: name, city and country, currency, product and collection counts, a catalog snapshot (price range and median, share on sale and in stock, top brands and product types, newest product) and its e-mails, phones and social profiles. Filter by size, price, activity and e-mail; sort by size or newest product. Non-Shopify sites are skipped for free.',
    shape: {
      stores: strings('Store websites or domains, e.g. ["allbirds.com", "gymshark.com"].'),
      include_contacts: z.boolean().default(true).describe('Also read the store\'s contact pages for e-mails, phones and socials.'),
      countries: z.array(z.string()).optional().describe('Keep only stores based in these countries (ISO codes or names).'),
      min_products: z.number().int().min(0).optional().describe('Only stores with at least this many products.'),
      max_products: z.number().int().min(0).optional().describe('Only stores with at most this many products (small stores).'),
      active_within_days: z.number().int().min(1).optional().describe('Only stores that published a product in the last N days.'),
      require_email: z.boolean().default(false).describe('Only stores where an e-mail address was found.'),
      sort_by: z
        .enum(['default', 'most_products', 'fewest_products', 'highest_price', 'lowest_price', 'newest_product', 'name'])
        .default('default')
        .describe('Order the stores before the limit applies.'),
      max_items: maxItems(20, 1000),
    },
    map: (a) =>
      clean({
        startUrls: a.stores,
        includeContacts: a.include_contacts,
        countries: a.countries,
        minProducts: a.min_products,
        maxProducts: a.max_products,
        activeWithinDays: a.active_within_days,
        requireEmail: a.require_email || undefined,
        sortBy:
          {
            most_products: 'productsHigh',
            fewest_products: 'productsLow',
            highest_price: 'medianPriceHigh',
            lowest_price: 'medianPriceLow',
            newest_product: 'newestProduct',
            name: 'storeName',
          }[a.sort_by] || undefined,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_trade_show_exhibitors',
    actor: 'tacps126/exhibition-scraper',
    title: 'Get trade show exhibitor lists (booths and contacts)',
    price: 'about $0.001 per exhibitor',
    description:
      "Exhibitor lists of trade shows as B2B leads: company, booth and hall, email, phone, website, address, socials and categories. 91 built-in shows (e.g. medica, sema-show, nab-show, fabtech, ish, automechanika, wtm-london, orgatec, eurotier, wine-paris, biofach) or any exhibitor-list link or show homepage on Messe Frankfurt, Messe Düsseldorf, Koelnmesse, NürnbergMesse, Newfront/ExpoPlatform, RX, Map Your Show, a2z / A2Z Connect, Swapcard or Corussoft; the link's own show and year are used. Contact coverage depends on what the organiser publishes.",
    shape: {
      shows: z.array(z.string().min(1)).optional().describe('Built-in show ids, e.g. ["medica","sema-show"]. The Actor README lists all ids.'),
      urls: z.array(z.string().url()).optional().describe("Links to any show's exhibitor list or exhibitor search page (or its homepage)."),
      include_contacts: z.boolean().default(true).describe('Open each exhibitor profile for email, phone, website, address and socials. Off = names and booths only (faster).'),
      changes_only: z
        .boolean()
        .default(false)
        .describe('Only exhibitors that are new, changed (old and new booth, email, phone, website, address) or removed since the last call with the same shows. Removed ones need the whole list, so it ignores max_items for that.'),
      max_items: maxItems(50, 2000),
    },
    map: (a) =>
      clean({
        exhibitionList: a.shows,
        startUrls: (a.urls ?? []).map((url) => ({ url })),
        includeDetails: a.include_contacts,
        changesOnly: a.changes_only || undefined,
        maxResults: a.max_items,
      }),
    // max_items applies per show.
    limit: (a) => a.max_items * Math.max(1, (a.shows?.length ?? 0) + (a.urls?.length ?? 0)),
  },
  {
    name: 'find_events',
    actor: 'tacps126/events-scraper',
    title: 'Find upcoming events (Luma, Eventbrite, Meetup)',
    price: 'about $0.001 per event',
    description:
      'Upcoming events by topic and city, or from Luma / Eventbrite / Meetup links (or any page with schema.org events): name, dates, venue with address and coordinates, organiser, hosts, ticket prices, free/sold-out and attendee count, in one format. Use for event prospecting, sponsorships and community research.',
    shape: {
      searches: z.array(z.string().min(1)).optional().describe('Topics or keywords, e.g. ["AI","startup"].'),
      location: z.string().optional().describe('City in plain words (e.g. "London", "Bengaluru") or "online". Luma searches within a city.'),
      urls: z.array(z.string().url()).optional().describe('Luma city/category/calendar/event links, Eventbrite searches or events, Meetup search or group links, or any events page.'),
      sources: z.array(z.enum(['luma', 'eventbrite', 'meetup'])).optional().describe('Sites searched for `searches` (default all three). Meetup knows about 70 big cities by name; others as "City, CC" (e.g. "Lyon, FR").'),
      include_details: z.boolean().default(true).describe('Open each event for organiser, tickets and full description. Off = faster.'),
      max_items: maxItems(30, 500),
    },
    map: (a) =>
      clean({
        searches: a.searches,
        location: a.location,
        startUrls: (a.urls ?? []).map((url) => ({ url })),
        sources: a.sources,
        includeDetails: a.include_details,
        maxItems: a.max_items,
      }),
    // max_items applies per link and per search on each site.
    limit: (a) =>
      a.max_items *
      Math.max(1, (a.searches?.length ?? 0) * (a.sources?.length ?? 3) + (a.urls?.length ?? 0)),
  },
  {
    name: 'get_prediction_markets',
    actor: 'tacps126/prediction-markets',
    title: 'Get prediction market odds (Kalshi, Polymarket, Manifold, PredictIt)',
    price: 'about $0.003 per market',
    description:
      'Prediction markets from Kalshi, Polymarket, Manifold and PredictIt in one table: the market-implied probability, every outcome price, bid and ask, 24-hour and 7-day change, volume, liquidity, open interest, close date, status and, once settled, the result. Search by keyword or category, or pass market links or tickers; optional daily price history. Use for event forecasting, news context and research.',
    shape: {
      search: z.string().optional().describe('Keywords, e.g. "fed rate", "bitcoin", "election". Empty = the busiest markets.'),
      platforms: z.array(z.enum(['kalshi', 'polymarket', 'manifold', 'predictit'])).optional().describe('Which platforms (default kalshi and polymarket).'),
      categories: z.array(z.enum(["politics", "elections", "economics", "finance", "crypto", "sports", "tech-science", "ai", "climate-weather", "culture", "world", "companies", "health", "mentions"])).optional().describe('Only markets in these categories.'),
      markets: z.array(z.string().min(1)).optional().describe('Market or event links, Kalshi tickers or Polymarket slugs.'),
      status: z.enum(['open', 'closed', 'all']).default('open').describe('open, closed (settled, with result) or all.'),
      sort_by: z.enum(['volume24h', 'volume', 'liquidity', 'closingSoon', 'newest', 'move24h']).default('volume24h').describe('Order of results.'),
      min_volume_24h: z.number().min(0).optional().describe('Minimum 24-hour volume (dollars on Polymarket, contracts on Kalshi).'),
      closes_within_days: z.number().int().min(1).optional().describe('Only markets that close within this many days.'),
      history_days: z.number().int().min(0).max(365).default(0).describe('Add a daily price history of this many days (Kalshi and Polymarket). 0 = none.'),
      max_items: maxItems(30, 1000),
    },
    map: (a) =>
      clean({
        search: a.search,
        platforms: a.platforms,
        categories: a.categories,
        markets: a.markets,
        status: a.status,
        sortBy: a.sort_by,
        minVolume24h: a.min_volume_24h,
        closesWithinDays: a.closes_within_days,
        historyDays: a.history_days || undefined,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_sports_data',
    actor: 'tacps126/sports-data',
    title: 'Get sports scores, box scores, odds and standings',
    price: 'about $0.0008 per game, odds row, standings row or player; $0.001 per box-score player line',
    description:
      'Scores and schedules, player box scores, betting odds (opening vs current or closing moneyline, spread and total, line movement, no-vig probability, and how each line settled), standings and rosters for 24 leagues: NFL, NBA, WNBA, MLB, NHL, college football and basketball, Premier League, LaLiga, Bundesliga, Serie A, Ligue 1, Champions League and more, MLS, Liga MX, Formula 1, ATP and WTA tennis (with rankings), PGA golf and UFC. Filter by date, status and team or player.',
    shape: {
      leagues: z.array(z.enum(["nfl", "ncaaf", "nba", "wnba", "ncaab", "mlb", "nhl", "premier-league", "championship", "la-liga", "bundesliga", "serie-a", "ligue-1", "eredivisie", "primeira-liga", "champions-league", "europa-league", "mls", "liga-mx", "f1", "atp", "wta", "pga", "ufc"])).min(1).describe('One or more leagues.'),
      data_type: z.enum(['games', 'boxScores', 'odds', 'standings', 'teams', 'rosters']).default('games').describe('games, boxScores (one row per player per game), odds (one row per game per sportsbook), standings (tennis: rankings), teams or rosters. Box scores, teams and rosters cover team sports.'),
      days_back: z.number().int().min(0).max(400).default(1).describe('Days back from today; 1 = yesterday and today.'),
      days_ahead: z.number().int().min(0).max(60).default(0).describe('Days ahead for schedules and upcoming lines.'),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('YYYY-MM-DD; replaces days_back.'),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('YYYY-MM-DD; replaces days_ahead.'),
      game_status: z.enum(['any', 'final', 'live', 'scheduled']).default('any').describe('final for results and closing lines, scheduled for fixtures.'),
      teams: z.array(z.string().min(1)).optional().describe('Team or player names or abbreviations, e.g. ["Lakers", "KC", "Sinner"].'),
      match_type: z.enum(['any', 'singles', 'doubles']).default('any').describe('Tennis only.'),
      season: z.number().int().min(1990).optional().describe('Season year for standings, e.g. 2026; empty = current.'),
      max_items: maxItems(100, 5000),
    },
    map: (a) =>
      clean({
        leagues: a.leagues,
        dataType: a.data_type,
        daysBack: a.days_back,
        daysAhead: a.days_ahead,
        dateFrom: a.date_from,
        dateTo: a.date_to,
        gameStatus: a.game_status,
        teams: a.teams,
        matchType: a.match_type === 'any' ? undefined : a.match_type,
        season: a.season,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_lottery_results',
    actor: 'tacps126/lottery-results',
    title: 'Get lottery results and number frequency',
    price: 'about $0.003 per draw or number row',
    description:
      'Winning numbers for Powerball (with Double Play), Mega Millions, Millionaire for Life, Cash4Life, NY Lotto, Take 5, Pick 10, Numbers, Win 4, Quick Draw, Lotto Texas, Texas Two Step and Cash Five, with the estimated jackpot and jackpot winners where published; history back to 1980. Or number frequency (hot and cold numbers) for any date range, with what pure chance would give.',
    shape: {
      games: z.array(z.enum(["powerball", "mega-millions", "millionaire-for-life", "cash4life", "ny-lotto", "take-5", "pick-10", "ny-numbers", "ny-win-4", "quick-draw", "lotto-texas", "texas-two-step", "cash-five"])).min(1).describe('Which games.'),
      data_type: z.enum(['draws', 'stats']).default('draws').describe('draws (one row per draw) or stats (how often and how recently each number was drawn).'),
      days_back: z.number().int().min(1).max(20000).optional().describe('Default 30 for draws, 365 for stats.'),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('YYYY-MM-DD; replaces days_back.'),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('YYYY-MM-DD (default today).'),
      max_items: maxItems(100, 5000),
    },
    map: (a) =>
      clean({
        games: a.games,
        dataType: a.data_type,
        daysBack: a.days_back,
        dateFrom: a.date_from,
        dateTo: a.date_to,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_podcasts',
    actor: 'tacps126/podcasts',
    title: 'Search podcasts and charts (Apple Podcasts)',
    price: 'about $0.004 per podcast; $0.001 per episode',
    description:
      "Podcasts from Apple Podcasts search, top charts (any country and genre) or links, enriched from each show's RSS feed: owner name and contact email, website, language, categories, episode count, how often it posts and the last episode date; optionally the latest episodes with audio and transcript links. Use for guest booking, sponsorship outreach and podcast research.",
    shape: {
      search_terms: z.array(z.string().min(1)).optional().describe('Words to search, e.g. ["startup marketing"].'),
      chart_genres: z.array(z.enum(["All", "Arts", "Business", "Comedy", "Education", "Fiction", "Government", "Health & Fitness", "History", "Kids & Family", "Leisure", "Music", "News", "Religion & Spirituality", "Science", "Society & Culture", "Sports", "Technology", "True Crime", "TV & Film"])).optional().describe('Top-chart genres (All = the overall chart).'),
      podcasts: z.array(z.string().min(1)).optional().describe('Apple Podcasts links or ids, or RSS feed links.'),
      country: z.string().length(2).default('us').describe('Store country for search and charts, e.g. us, gb, in.'),
      include_episodes: z.boolean().default(false).describe('Add the latest episodes of each podcast.'),
      active_within_days: z.number().int().min(1).optional().describe('Only shows with an episode in the last N days.'),
      with_email_only: z.boolean().default(false).describe('Only shows whose feed lists an owner email.'),
      languages: z.array(z.string().min(2)).optional().describe('Feed language codes, e.g. ["en"].'),
      max_items: maxItems(50, 1000),
    },
    check: (a) => (!a.search_terms?.length && !a.chart_genres?.length && !a.podcasts?.length ? 'Give search_terms, chart_genres or podcasts.' : undefined),
    map: (a) =>
      clean({
        searchTerms: a.search_terms,
        chartGenres: a.chart_genres,
        podcasts: a.podcasts,
        country: a.country,
        includeEpisodes: a.include_episodes || undefined,
        activeWithinDays: a.active_within_days,
        withEmailOnly: a.with_email_only || undefined,
        languages: a.languages,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_startup_funding',
    actor: 'tacps126/startup-funding',
    title: 'Search new startup funding rounds (SEC Form D)',
    price: 'about $0.005 per filing',
    description:
      'New private fundraises from SEC Form D filings: company, address, phone, industry, amount raised and offered, number of investors, securities, first sale date and the founders, executives and directors named in each filing. Filter by state, industry, amount and company age; pooled investment funds and amendments left out by default. Use for sales prospecting, investor research and deal flow.',
    shape: {
      posted_within_days: z.number().int().min(1).max(365).default(7).describe('Filings in the last N days (about 300-500 per weekday).'),
      states: z.array(z.string().length(2)).optional().describe("Company's state, e.g. [\"CA\", \"NY\"]."),
      query: z.string().optional().describe('Words in the filing, e.g. a company name.'),
      industries: z.array(z.enum(["Agriculture", "Airlines and Airports", "Biotechnology", "Business Services", "Coal Mining", "Commercial", "Commercial Banking", "Computers", "Construction", "Electric Utilities", "Energy Conservation", "Environmental Services", "Health Insurance", "Hospitals and Physicians", "Insurance", "Investing", "Investment Banking", "Lodging and Conventions", "Manufacturing", "Oil and Gas", "Other", "Other Banking and Financial Services", "Other Energy", "Other Health Care", "Other Real Estate", "Other Technology", "Other Travel", "Pharmaceuticals", "Pooled Investment Fund", "REITS and Finance", "Residential", "Restaurants", "Retailing", "Telecommunications", "Tourism and Travel Services"])).optional().describe('Form D industry groups.'),
      min_amount_raised: z.number().min(0).optional().describe('Only raises that sold at least this many dollars.'),
      incorporated_within_five_years: z.boolean().default(false).describe('Only young companies.'),
      max_items: maxItems(50, 1000),
    },
    map: (a) =>
      clean({
        postedWithinDays: a.posted_within_days,
        states: a.states,
        query: a.query,
        industries: a.industries,
        minAmountRaised: a.min_amount_raised,
        incorporatedWithinFiveYears: a.incorporated_within_five_years || undefined,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'find_property_auctions',
    actor: 'tacps126/auctions-radar',
    title: 'Find court, bank and government auctions, scored',
    price: 'about $0.015 per lot',
    description:
      'Foreclosure, court, tax and bank auctions from Germany, Spain, Italy and India in one format: price, valuation, debts that stay with the property, total cost, area, price per m2, possession (vacant or occupied), auction dates, deposit, seller, case number, documents and photos. Every lot is scored 0 to 100 against similar lots nearby and against the budget, place and dates given, with strengths, watch-outs and its rank among peers. Use for finding below-market property, screening distressed assets and auction alerts.',
    shape: {
      countries: z.array(z.enum(['DE', 'ES', 'IT', 'IN'])).optional().describe('Countries to read (default all four).'),
      asset_types: z.array(z.enum(['apartment', 'house', 'commercial', 'industrial', 'land', 'agricultural', 'parking', 'vehicle', 'other'])).optional().describe('Kinds of asset (default property and vehicles).'),
      regions: z.array(z.string().min(2)).optional().describe('States, provinces or regions, e.g. ["Bayern"], ["Madrid"], ["Kerala"], ["Lombardia"].'),
      location: z.string().min(2).optional().describe('A town, postcode or address to measure distance from.'),
      radius_km: z.number().min(0.5).max(1000).optional().describe('Only lots within this distance of location.'),
      budget_min: z.number().min(0).optional().describe('Lowest price wanted, in budget_currency.'),
      budget_max: z.number().min(0).optional().describe('Highest price wanted, in budget_currency.'),
      budget_currency: z.string().length(3).default('EUR').describe('EUR or INR, or any currency with a daily reference rate.'),
      min_area_sqm: z.number().min(0).optional().describe('Smallest area in m2.'),
      auction_within_days: z.number().int().min(1).optional().describe('Only auctions in the next N days.'),
      vacant_only: z.boolean().default(false).describe('Only lots stated as vacant.'),
      profile: z.enum(['balanced', 'bargainHunter', 'lowRisk', 'quickDeal']).default('balanced').describe('What the score favours.'),
      sort_by: z.enum(['score', 'auctionDate', 'price', 'pricePerSqm', 'discount']).default('score').describe('Order of results.'),
      max_items: maxItems(50, 1000),
    },
    check: (a) => (a.radius_km && !a.location ? 'radius_km needs a location.' : undefined),
    map: (a) =>
      clean({
        countries: a.countries,
        assetTypes: a.asset_types,
        regions: a.regions,
        location: a.location,
        radiusKm: a.radius_km,
        budgetMin: a.budget_min,
        budgetMax: a.budget_max,
        budgetCurrency: a.budget_currency,
        minAreaSqm: a.min_area_sqm,
        auctionWithinDays: a.auction_within_days,
        vacantOnly: a.vacant_only || undefined,
        profile: a.profile,
        sortBy: a.sort_by,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_clinical_trials',
    actor: 'tacps126/clinical-trials',
    title: 'Search clinical trials (ClinicalTrials.gov)',
    price: 'about $0.003 per study',
    description:
      'Clinical trials from ClinicalTrials.gov by condition, drug or device, sponsor, site location, status, phase and sponsor type: dates, enrollment, design, interventions, eligibility, outcomes, central contacts (name, phone, email) and study sites. Use for trial landscapes, site and patient recruitment, competitive intelligence and new-study alerts.',
    shape: {
      condition: z.string().optional().describe('Disease or condition, e.g. "obesity", "breast cancer".'),
      intervention: z.string().optional().describe('Drug, device or procedure, e.g. "semaglutide".'),
      sponsor: z.string().optional().describe('Sponsor, e.g. "Pfizer".'),
      keywords: z.string().optional().describe('Words anywhere in the study record.'),
      location: z.string().optional().describe('Country, state or city of a site, e.g. "India", "Boston".'),
      statuses: z.array(z.enum(['RECRUITING', 'NOT_YET_RECRUITING', 'ENROLLING_BY_INVITATION', 'ACTIVE_NOT_RECRUITING', 'COMPLETED', 'SUSPENDED', 'TERMINATED', 'WITHDRAWN', 'UNKNOWN'])).optional().describe('Empty = any status.'),
      phases: z.array(z.enum(['EARLY_PHASE1', 'PHASE1', 'PHASE2', 'PHASE3', 'PHASE4', 'NA'])).optional().describe('Empty = any phase.'),
      sponsor_types: z.array(z.enum(['INDUSTRY', 'NIH', 'FED', 'OTHER_GOV', 'NETWORK', 'OTHER'])).optional().describe('Empty = any sponsor.'),
      first_posted_within_days: z.number().int().min(1).optional().describe('Only studies first posted in the last N days.'),
      max_items: maxItems(50, 1000),
    },
    check: (a) =>
      [a.condition, a.intervention, a.sponsor, a.keywords, a.location].some(Boolean) || a.first_posted_within_days
        ? undefined
        : 'Give a condition, intervention, sponsor, keywords, location or first_posted_within_days.',
    map: (a) =>
      clean({
        condition: a.condition,
        intervention: a.intervention,
        sponsor: a.sponsor,
        keywords: a.keywords,
        location: a.location,
        statuses: a.statuses,
        phases: a.phases,
        sponsorTypes: a.sponsor_types,
        firstPostedWithinDays: a.first_posted_within_days,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_vulnerabilities',
    actor: 'tacps126/cve-feed',
    title: 'Search CVE vulnerabilities (NVD, CISA KEV, EPSS)',
    price: 'about $0.003 per CVE',
    description:
      'New and updated vulnerabilities from the NVD with CVSS score and severity, CWE, affected vendors and products, references, CISA known-exploited status (date added, due date, ransomware use) and the EPSS exploit likelihood. Filter by vendor, product, keyword, severity, CVSS or EPSS, or look up CVE ids. Use for patch triage and security alerts.',
    shape: {
      source: z.enum(['nvd', 'kev']).default('nvd').describe('nvd: CVEs published or modified in the window; kev: CVEs CISA added to its known-exploited catalog.'),
      within_days: z.number().int().min(1).max(120).default(2).describe('Look-back window in days (about 600-900 CVEs a day on NVD).'),
      keywords: z.string().optional().describe('Words in the description, e.g. "remote code execution".'),
      vendors: z.array(z.string().min(1)).optional().describe('Affected vendors, e.g. ["microsoft", "cisco"].'),
      products: z.array(z.string().min(1)).optional().describe('Affected products, e.g. ["exchange server"].'),
      severities: z.array(z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])).optional().describe('Empty = all.'),
      min_cvss: z.number().min(0).max(10).optional().describe('Minimum CVSS base score.'),
      known_exploited_only: z.boolean().default(false).describe('Only CVEs in the CISA known-exploited catalog.'),
      min_epss: z.number().min(0).max(1).optional().describe('Minimum probability of exploitation in the next 30 days (0-1).'),
      cve_ids: z.array(z.string().regex(/^CVE-\d{4}-\d+$/i)).optional().describe('Look up these CVEs instead, e.g. ["CVE-2024-3400"].'),
      max_items: maxItems(100, 2000),
    },
    map: (a) =>
      clean({
        source: a.source,
        withinDays: a.within_days,
        keywords: a.keywords,
        vendors: a.vendors,
        products: a.products,
        severities: a.severities,
        minCvss: a.min_cvss,
        knownExploitedOnly: a.known_exploited_only || undefined,
        minEpss: a.min_epss,
        cveIds: a.cve_ids,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_fda_device_clearances',
    actor: 'tacps126/fda-device-clearances',
    title: 'Search FDA medical device clearances (510(k), PMA)',
    price: 'about $0.004 per decision',
    description:
      'FDA medical device 510(k) clearances and PMA approvals: applicant, contact person, address, device and generic name, product code, specialty panel, device class, dates received and decided, review days, decision and links. Filter by date, company, device words, product code, specialty and class. Use for medtech competitive intelligence and sales prospecting.',
    shape: {
      types: z.array(z.enum(['510k', 'pma'])).optional().describe('Default both.'),
      decided_within_days: z.number().int().min(1).max(3650).default(30).describe('Decisions in the last N days.'),
      applicant: z.string().optional().describe('Applicant name, e.g. "Medtronic".'),
      device_name: z.string().optional().describe('Words in the device or trade name, e.g. "catheter".'),
      product_codes: z.array(z.string().length(3)).optional().describe('FDA three-letter product codes, e.g. ["QAS"].'),
      specialties: z.array(z.enum(["Anesthesiology", "Cardiovascular", "Clinical Chemistry", "Dental", "Ear, Nose, & Throat", "Gastroenterology, Urology", "General Hospital", "Hematology", "Immunology", "Microbiology", "Neurology", "Obstetrics/Gynecology", "Ophthalmic", "Orthopedic", "Pathology", "Physical Medicine", "Radiology", "General, Plastic Surgery", "Toxicology", "Clinical Toxicology"])).optional().describe('FDA review panels.'),
      device_classes: z.array(z.enum(['1', '2', '3'])).optional().describe('Empty = all.'),
      max_items: maxItems(50, 1000),
    },
    map: (a) =>
      clean({
        types: a.types,
        decidedWithinDays: a.decided_within_days,
        applicant: a.applicant,
        deviceName: a.device_name,
        productCodes: a.product_codes,
        specialties: a.specialties,
        deviceClasses: a.device_classes,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_healthcare_providers',
    actor: 'tacps126/npi-providers',
    title: 'Search US healthcare providers (NPI Registry)',
    price: 'about $0.003 per provider',
    description:
      'US doctors, dentists, therapists, clinics and hospitals from the official NPI Registry: name, specialty (taxonomy), license, practice address, phone, fax, enumeration date and, for organizations, the authorized official. Search by specialty, state, city, ZIP, name or NPI; can keep only new practices (recently issued NPIs) or providers with a phone.',
    shape: {
      specialties: z.array(z.string().min(1)).optional().describe('Registry specialty names, e.g. ["Dentist", "Chiropractor"].'),
      states: z.array(z.string().length(2)).optional().describe('Two-letter state codes, e.g. ["TX"].'),
      cities: z.array(z.string().min(1)).optional().describe('Practice cities.'),
      postal_codes: z.array(z.string().regex(/^\d{5}$/)).optional().describe('Five-digit ZIP codes.'),
      provider_type: z.enum(['any', 'individual', 'organization']).default('any').describe('Individuals, organizations or both.'),
      last_name: z.string().optional().describe('Individual last name.'),
      organization_name: z.string().optional().describe('Organization name; * for a prefix, e.g. "smile*".'),
      npi_numbers: z.array(z.string().regex(/^\d{10}$/)).optional().describe('Look up these NPIs.'),
      enumerated_within_days: z.number().int().min(1).optional().describe('Only NPIs issued in the last N days (new practices).'),
      with_phone_only: z.boolean().default(false).describe('Only providers with a practice phone.'),
      max_items: maxItems(100, 5000),
    },
    check: (a) =>
      [a.specialties, a.states, a.cities, a.postal_codes, a.npi_numbers].some((x) => x?.length) || a.last_name || a.organization_name
        ? undefined
        : 'Give specialties, states, cities, postal_codes, a name or npi_numbers.',
    map: (a) =>
      clean({
        specialties: a.specialties,
        states: a.states,
        cities: a.cities,
        postalCodes: a.postal_codes,
        providerType: a.provider_type,
        lastName: a.last_name,
        organizationName: a.organization_name,
        npiNumbers: a.npi_numbers,
        enumeratedWithinDays: a.enumerated_within_days,
        withPhoneOnly: a.with_phone_only || undefined,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_import_records',
    actor: 'tacps126/us-import-records',
    title: 'Look up US import records (importers, suppliers, bills of lading)',
    price: 'about $0.004 per company profile, $0.001 per supplier or customer',
    description:
      'US customs sea import records for a US importer or an overseas supplier: total and last-12-month shipments with the trend, its suppliers (or a supplier\'s US customers) with shipments, weight and HS codes, products, source countries, ports and carriers, recent bills of lading, and lookalike importers that buy from the same factories. Use for sourcing, supplier discovery, importer prospecting and supply-chain research.',
    shape: {
      companies: z.array(z.string().min(2)).optional().describe('US importers by name or importyeti.com link, e.g. ["Allbirds"].'),
      suppliers: z.array(z.string().min(2)).optional().describe('Overseas suppliers (factories) by name or link, to see their US customers.'),
      include_partners: z.boolean().default(true).describe('Add one row per supplier (or customer).'),
      max_partners_per_company: z.number().int().min(1).max(500).default(25).describe('Most suppliers or customers per company.'),
      include_shipments: z.boolean().default(false).describe('Add the most recent bills of lading.'),
      shipped_within_days: z.number().int().min(1).optional().describe('Only shipments in the last N days.'),
      find_lookalikes: z.boolean().default(false).describe('Add other US importers that use the same suppliers.'),
      max_lookalikes_per_company: z.number().int().min(1).max(200).default(25).describe('Most lookalike importers per company.'),
      max_items: maxItems(100, 5000),
    },
    check: (a) => (a.companies?.length || a.suppliers?.length ? undefined : 'Give companies or suppliers.'),
    map: (a) =>
      clean({
        companies: a.companies,
        suppliers: a.suppliers,
        includePartners: a.include_partners,
        maxPartnersPerCompany: a.max_partners_per_company,
        includeShipments: a.include_shipments || undefined,
        shippedWithinDays: a.shipped_within_days,
        findLookalikes: a.find_lookalikes || undefined,
        maxLookalikesPerCompany: a.max_lookalikes_per_company,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
];

export const ACTORS = [...new Set(TOOLS.map((t) => t.actor))];
