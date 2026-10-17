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
      'All open jobs from company career pages in one normalized format (title, company, location, remote/hybrid, seniority, salary, apply URL, posted date). Paste career-page URLs from Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Workday, Personio or Teamtailor; the board type is detected automatically.',
    shape: {
      career_page_urls: strings('Career page URLs, e.g. "https://jobs.lever.co/spotify".'),
      title_includes: z.array(z.string()).optional().describe('Keep jobs whose title contains any of these.'),
      location_includes: z.array(z.string()).optional().describe('Keep jobs in these locations.'),
      remote_only: z.boolean().optional().describe('Only remote jobs.'),
      posted_within_days: z.number().int().min(1).max(365).optional().describe('Only jobs posted in the last N days.'),
      max_items: maxItems(50),
    },
    map: (a) =>
      clean({
        careerPageUrls: a.career_page_urls,
        titleIncludes: a.title_includes,
        locationIncludes: a.location_includes,
        remoteOnly: a.remote_only,
        postedWithinDays: a.posted_within_days,
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
      'Search Indeed job listings by keyword and location in 9 countries (us, uk, ca, au, ie, de, fr, nl, sg): title, company, location, salary, job type, benefits, skills and apply link.',
    shape: {
      query: z.string().min(1).describe('Job title, skill or company, e.g. "react developer".'),
      location: z.string().optional().describe('City, state, postcode or "Remote". Empty = whole country.'),
      country: z.enum(['us', 'uk', 'ca', 'au', 'ie', 'de', 'fr', 'nl', 'sg']).default('us').describe('Indeed country site.'),
      date_posted_days: z.enum(['1', '3', '7', '14']).optional().describe('Only jobs posted in the last N days.'),
      job_type: z.enum(['fulltime', 'parttime', 'contract', 'temporary', 'internship']).optional(),
      max_items: maxItems(30),
    },
    map: (a) =>
      clean({
        queries: [a.query],
        locations: a.location ? [a.location] : undefined,
        country: a.country,
        datePosted: a.date_posted_days,
        jobType: a.job_type,
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
      sort: z.enum(['recency', 'relevance']).default('recency'),
      search: z.string().optional().describe('Only reviews containing this text.'),
      date_period: z.enum(['last30days', 'last3months', 'last6months']).optional(),
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
      sort: z.enum(['new', 'hot', 'top', 'relevance']).default('new'),
      time: z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).default('week'),
      include_comments: z.boolean().default(false),
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
    name: 'find_website_contacts',
    actor: 'tacps126/contact-details',
    title: 'Find emails, phones and social profiles on websites',
    price: 'about $0.002 per website with contacts found; nothing found, no charge',
    description:
      'Finds business emails, phone numbers, addresses and social profiles (LinkedIn, X, Facebook, Instagram, YouTube) on any list of websites; it visits the contact and about pages itself. Use only for lawful business outreach (GDPR / CAN-SPAM).',
    shape: {
      websites: strings('Website addresses or domains, e.g. "apify.com".'),
      max_pages_per_site: z.number().int().min(1).max(20).default(5),
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
    title: 'Search German property listings (ImmoScout24)',
    price: 'about $0.001 per listing',
    description:
      'Apartments and houses for rent or sale in Germany: price, rent, area, rooms, address with coordinates, energy class, features, agent, photos and dates. Germany only.',
    shape: {
      locations: strings('Cities, districts or regions in plain words, e.g. ["Berlin","München Schwabing"].'),
      offer_type: z.enum(['rent', 'buy']).default('rent'),
      property_type: z.enum(['apartment', 'house']).default('apartment'),
      min_price: z.number().optional(),
      max_price: z.number().optional(),
      min_area: z.number().optional().describe('Minimum area in m2.'),
      min_rooms: z.number().optional(),
      max_items: maxItems(50),
    },
    map: (a) =>
      clean({
        locations: a.locations,
        offerType: a.offer_type,
        propertyType: a.property_type,
        minPrice: a.min_price,
        maxPrice: a.max_price,
        minArea: a.min_area,
        minRooms: a.min_rooms,
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
      only_on_sale: z.boolean().default(false),
      only_available: z.boolean().default(false),
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
];

export const ACTORS = [...new Set(TOOLS.map((t) => t.actor))];
