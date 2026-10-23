// Ready-made analyst prompts: any model connected to this server gets the same
// rubric, so the analysis reads the same whichever AI writes it.
// Keep the text in step with apify_actors/actors/innovation-radar/src/rubric.rs
// (the Actor's own AI step and its AI_BRIEF record use the same rubric).

import { z } from 'zod';

export const SIGNALS = `How to read the evidence:
- scores.opportunity (0-100) and scores.why: the overall ranking and the signals behind it.
- scores.momentum (0-100): research output in the last two full years against the two before; 50 = about +40%.
- scores.labToMarketGap (0-100): high momentum with few company authors — research is ahead of products.
- industry.recentShare: share of recent works with a company author (under 5% academic, 5-15% engaging, over 15% active); industry.trend says whether companies are moving in or out.
- scores.geographicConcentration: share of the top country among the leading countries; high means one country dominates (supply-chain, policy and partner risk).
- risingTopics: sub-topics whose share grew most; standoutRecentWorks: the most cited recent papers.
- topCompanies / keyResearchers / topInstitutions / topFunders: who to partner with, hire from, license from or compete against.
- reviewShare: a high share of review papers means the field is consolidating.
- broaderSpace / position (validation): the biggest neighbouring space with one term left out; "open niche in a crowded field" means the application is new but the technology around it is busy (competition for talent, suppliers and attention; also proof the base technology works).
- relatedPatents.likelyExpiredByTerm: filed more than 20 years ago — possibly free to use (not legal advice).
Small counts make percentages noisy — say so when growth.stage reports it.`;

export const LANDSCAPE = `You are a pragmatic technology and innovation analyst advising founders, R&D leaders and investors.
From the field evidence, find concrete product or business opportunities.
For each opportunity say what to build, for whom, why now (which signal shows the timing), what it would take
(capital bucket: under $50k software/service, $50k-$1M hardware or regulated software, over $1M deep tech, manufacturing or clinical),
and who in the evidence could be a partner, customer or competitor.
Be specific, cite the signals you rely on, and say when the evidence is thin. No generic advice.`;

export const VALIDATION = `You are a pragmatic technology and innovation analyst. Assess the idea against the evidence:
how new it is (crowdedness, closest prior work), whether the timing is right (growth), who is already working on it
(researchers, institutions, companies), what it would take to build (capital bucket: under $50k, $50k-$1M, over $1M),
the main risks, and the three most useful next steps. Be specific, cite the evidence, and say when it is thin.`;

const LANDSCAPE_SHAPE = `Answer in these sections:
1. Summary — two or three sentences; when several fields were analysed, the ranking and why.
2. Opportunities — three to five, best first. For each: the idea, for whom, why now, capital bucket with the reason, who to talk to.
3. Risks.
4. Evidence quality — strong, moderate or thin, and why.`;

const VALIDATION_SHAPE = `Answer in these sections: Novelty, Closest prior work, Timing, Who is already there,
Capital (bucket and why), Risks, Next steps (three), Evidence quality (strong, moderate or thin).`;

const list = (s) =>
  String(s)
    .split(/\n|;/)
    .map((x) => x.trim())
    .filter(Boolean);

export const PROMPTS = [
  {
    name: 'field-opportunity-analysis',
    title: 'Find opportunities in a technology field',
    description:
      'Analyse one or more technology or research fields with analyze_field, then write ranked, evidence-backed product and business opportunities (why now, capital needed, who to talk to).',
    args: {
      fields: z.string().describe('Fields or technologies, one per line or separated by semicolons, e.g. "sodium-ion battery; solid state battery".'),
      audience: z.string().optional().describe('Who the analysis is for, e.g. "a seed-stage founder", "a corporate R&D team". Default: founders, R&D leaders and investors.'),
    },
    text: ({ fields, audience }) => {
      const names = list(fields);
      return `Call the analyze_field tool with fields ${JSON.stringify(names)} (one call for all of them; ${names.length > 1 ? 'the records come back ranked by opportunity score' : 'one record'}).
Then use only its records as the evidence.${audience ? `\nThe analysis is for ${audience}.` : ''}

${LANDSCAPE}

${SIGNALS}

${LANDSCAPE_SHAPE}`;
    },
  },
  {
    name: 'idea-validation',
    title: 'Validate a product or research idea',
    description:
      'Check an idea with validate_idea (how much research already covers it, who is working on it, closest prior work, related patents), then assess novelty, timing, capital, risks and next steps.',
    args: {
      idea: z.string().describe('The idea in a sentence or two, e.g. "a window that generates solar power with perovskite tandem cells".'),
    },
    text: ({ idea }) => `Call the validate_idea tool with ideas ${JSON.stringify([String(idea).trim()])}.
Then use only its record as the evidence. If the idea is broad, you may also call analyze_field on its core technology for growth and industry signals.

${VALIDATION}

${SIGNALS}

${VALIDATION_SHAPE}`,
  },
];
