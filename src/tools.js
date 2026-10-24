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
    price: 'about $0.002 per article',
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
    price: 'about $0.001 per job',
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
    price: 'about $0.003 per job',
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
    price: 'about $0.0005 per review; company profile free',
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
    price: 'about $0.0002 per review',
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
    name: 'search_reddit',
    actor: 'tacps126/reddit-monitor',
    title: 'Search Reddit posts and comments',
    price: 'about $0.001 per post or comment',
    description:
      'Reddit posts (and optionally comments) by keyword, subreddit or user: title, text, author, subreddit, score, links and dates. Good for brand and topic monitoring.',
    shape: {
      keywords: z.array(z.string()).optional().describe('Search all of Reddit; "exact phrase" works.'),
      subreddits: z.array(z.string()).optional().describe('Subreddit names, e.g. ["webscraping"].'),
      sort: z.enum(['new', 'hot', 'top', 'relevance']).default('new').describe('Result order.'),
      time: z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).default('week').describe('Time window for keyword searches.'),
      include_comments: z.boolean().default(false).describe('Also return comments of the matched posts (more results, higher cost).'),
      max_items: maxItems(50),
    },
    check: (a) =>
      (a.keywords?.length || a.subreddits?.length)
        ? null
        : 'Provide at least one of: keywords or subreddits.',
    map: (a) =>
      clean({
        keywords: a.keywords,
        subreddits: a.subreddits,
        sort: a.sort,
        time: a.time,
        includeComments: a.include_comments,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'find_reddit_leads',
    actor: 'tacps126/reddit-lead-finder',
    title: 'Find buying-intent posts on Reddit',
    price: 'about $0.002 per lead plus $0.0001 per post read',
    description:
      'Reddit posts and comments where people ask for a tool like yours, look for an alternative to a competitor, compare options or complain. Each lead is tagged with its intent (recommendation_request, alternative_seeking, comparison, pain_point) and the phrase that showed it.',
    shape: {
      categories: z.array(z.string()).optional().describe('What you sell, as buyers say it, e.g. ["CRM", "invoice software"].'),
      competitors: z.array(z.string()).optional().describe('Products whose users you want, e.g. ["HubSpot"].'),
      subreddits: z.array(z.string()).optional().describe('Only search these subreddits, e.g. ["smallbusiness", "SaaS"].'),
      time: z.enum(['day', 'week', 'month', 'year']).default('month').describe('How far back to look.'),
      max_items: maxItems(30, 300),
    },
    check: (a) =>
      (a.categories?.length || a.competitors?.length)
        ? null
        : 'Provide at least one of: categories or competitors.',
    map: (a) =>
      clean({
        keywords: a.categories,
        competitors: a.competitors,
        subreddits: a.subreddits,
        time: a.time,
        maxItems: a.max_items,
        maxPostsPerSource: 50,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_research',
    actor: 'tacps126/research-radar',
    title: 'Search papers, preprints and patents',
    price: 'about $0.003 per result',
    description:
      'Papers, preprints and patents from OpenAlex, arXiv, PubMed and Europe PMC in one deduplicated list, newest first or most influential first: title, abstract, authors and affiliations, venue, DOI, PDF link, citations, citations per year, field-normalized impact (top 1% / 10%), open-access status, and for patents the number, applicants and IPC/CPC classes. Retracted papers are left out.',
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
      hazards: z.array(z.enum(['weather', 'flood', 'storm', 'heat', 'cold', 'fire', 'drought', 'earthquake', 'tsunami', 'volcano', 'landslide', 'health', 'environment', 'transport', 'infrastructure', 'security', 'other'])).optional().describe('Only these hazard types.'),
      min_severity: z.enum(['minor', 'moderate', 'severe', 'extreme']).default('moderate').describe('Lowest CAP severity kept.'),
      areas: strings('Area names to match: a state, district, county or city, e.g. ["Kerala", "Texas"].').optional(),
      sent_within_hours: z.number().int().min(1).max(720).default(24).describe('Only alerts issued in the last N hours.'),
      max_items: maxItems(30, 500),
    },
    map: (a) =>
      clean({
        countries: a.countries,
        hazards: a.hazards,
        minSeverity: a.min_severity,
        areas: a.areas,
        sentWithinHours: a.sent_within_hours,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'search_tenders',
    actor: 'tacps126/tenders-radar',
    title: 'Search public tenders and contract awards',
    price: 'about $0.004 per notice',
    description:
      'Public procurement notices from official portals in one schema: US SAM.gov (federal), EU TED (every EU/EEA country), UK Find a Tender and Contracts Finder, France BOAMP, Spain PLACSP, Germany, Netherlands TenderNed, Canada CanadaBuys, Colombia SECOP II, Ukraine Prozorro, EU institutions (Funding & Tenders portal), Australia AusTender (awards) and South Africa eTenders. Title, buyer, deadline, value and currency, CPV/UNSPSC/NAICS codes, sectors, buyer contacts, suppliers for awards, notice link. Open tenders by default.',
    shape: {
      keywords: strings('Words matched literally on title and description; add translations for non-English portals, e.g. ["software", "logiciel"].').optional(),
      sectors: z.array(z.enum(['banking', 'securities', 'insurance', 'tax', 'trade', 'health', 'food', 'energy', 'environment', 'tech', 'transport', 'employment', 'housing', 'defense', 'education'])).optional().describe('Sectors from CPV/UNSPSC/NAICS/PSC codes and multilingual terms (housing = construction and real estate).'),
      countries: z.array(z.string()).optional().describe('ISO codes, e.g. ["US", "GB", "FR", "CA"], or "EU" for every EU/EEA country.'),
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
      'A landscape of a technology or research field from open research data: an opportunity score (0-100) with its reasons, momentum, lab-to-market gap and geographic concentration; works per year and growth stage; industry participation and the top companies; key researchers, institutions, countries and funders; rising sub-topics, standout recent work and related patents. Several fields come back ranked. For written opportunities, use the field-opportunity-analysis prompt.',
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
      'How much research already covers a product or research idea: matching works, works in the last two years, crowdedness (open, early, active, crowded), growth, who is working on it (researchers, institutions, companies), the closest prior work and related patents. For a written assessment, use the idea-validation prompt.',
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
    price: 'about $0.002 per website with contacts found; nothing found, no charge',
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
    name: 'search_german_property_listings',
    actor: 'tacps126/immobilienscout24-scraper',
    title: 'Search German and Austrian property listings (ImmoScout24)',
    price: 'about $0.001 per listing',
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
    price: 'about $0.001 per product',
    description:
      'Products from any Shopify store: prices, sale prices, discounts, stock, variants, SKUs, images and descriptions. Whole stores, collections or single products. Useful for price and stock monitoring.',
    shape: {
      stores: strings('Store domains, collection links or product links, e.g. "allbirds.com".'),
      keywords: z.array(z.string()).optional().describe('Only products matching any of these words.'),
      only_on_sale: z.boolean().default(false).describe('Only products with a sale price.'),
      only_available: z.boolean().default(false).describe('Only products that are in stock.'),
      max_items: maxItems(100, 1000),
    },
    map: (a) =>
      clean({
        startUrls: a.stores,
        keywords: a.keywords,
        onlyOnSale: a.only_on_sale || undefined,
        onlyAvailable: a.only_available || undefined,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'analyze_shopify_stores',
    actor: 'tacps126/shopify-store-analyzer',
    title: 'Analyze Shopify stores (location, catalog, contacts)',
    price: 'about $0.004 per store',
    description:
      'For each Shopify store: name, city and country, currency, product and collection counts, a catalog snapshot (price range and median, share on sale and in stock, top brands and product types, newest product) and its e-mails, phones and social profiles. Non-Shopify sites are skipped for free.',
    shape: {
      stores: strings('Store websites or domains, e.g. ["allbirds.com", "gymshark.com"].'),
      include_contacts: z.boolean().default(true).describe('Also read the store\'s contact pages for e-mails, phones and socials.'),
      countries: z.array(z.string()).optional().describe('Keep only stores based in these countries (ISO codes or names).'),
      max_items: maxItems(20, 1000),
    },
    map: (a) =>
      clean({
        startUrls: a.stores,
        includeContacts: a.include_contacts,
        countries: a.countries,
        maxItems: a.max_items,
      }),
    limit: (a) => a.max_items,
  },
  {
    name: 'get_trade_show_exhibitors',
    actor: 'tacps126/exhibition-scraper',
    title: 'Get trade show exhibitor lists (booths and contacts)',
    price: 'about $0.002 per exhibitor',
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
];

export const ACTORS = [...new Set(TOOLS.map((t) => t.actor))];
