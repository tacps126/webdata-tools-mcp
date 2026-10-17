// Thin Apify client: run one Actor synchronously and return its dataset items.
//
// Uses `POST /v2/acts/{owner}~{name}/run-sync-get-dataset-items`, which runs the Actor and
// returns the results in the same response (Apify caps this at 300 s). Billing happens on the
// caller's Apify account; `maxTotalChargeUsd` makes Apify stop the run at a spend ceiling, so a
// confused agent cannot run up a bill.

const DEFAULT_API_BASE = 'https://api.apify.com';

export class ApifyError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApifyError';
    this.status = status;
  }
}

/**
 * @param {object} o
 * @param {string} o.actor           "owner/name"
 * @param {object} o.input           Actor input
 * @param {number} o.limit           max dataset items to return
 * @param {string} o.token           Apify API token
 * @param {number} o.maxChargeUsd    spend ceiling for this run
 * @param {number} [o.timeoutSecs]   Actor run timeout (<= 300)
 * @param {typeof fetch} [o.fetchImpl]
 * @param {string} [o.apiBase]
 * @returns {Promise<{items: object[], runId: string|null}>}
 */
export async function runActorSync({
  actor,
  input,
  limit,
  token,
  maxChargeUsd,
  timeoutSecs = 150,
  fetchImpl = fetch,
  apiBase = process.env.APIFY_API_BASE || DEFAULT_API_BASE,
}) {
  if (!token) {
    throw new ApifyError(
      'APIFY_TOKEN is not set. Create a free Apify account, copy your API token from ' +
        'Console > Settings > API & Integrations, and pass it to this server as the ' +
        'APIFY_TOKEN environment variable.',
      401,
    );
  }
  const [owner, name] = actor.split('/');
  const url = new URL(`${apiBase}/v2/acts/${owner}~${name}/run-sync-get-dataset-items`);
  url.searchParams.set('timeout', String(timeoutSecs));
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('maxTotalChargeUsd', String(maxChargeUsd));

  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout((timeoutSecs + 20) * 1000),
    });
  } catch (err) {
    throw new ApifyError(`Could not reach Apify: ${err.message}`, 0);
  }

  const text = await res.text();
  if (!res.ok) throw new ApifyError(describeFailure(res.status, text, actor), res.status);

  let items;
  try {
    items = JSON.parse(text);
  } catch {
    throw new ApifyError('Apify returned a response that is not JSON.', res.status);
  }
  if (!Array.isArray(items)) items = [items];
  return { items, runId: res.headers.get('x-apify-run-id') };
}

function describeFailure(status, body, actor) {
  let detail = '';
  try {
    detail = JSON.parse(body)?.error?.message ?? '';
  } catch {
    detail = body.slice(0, 200);
  }
  switch (status) {
    case 401:
      return 'Apify rejected the API token. Check APIFY_TOKEN.';
    case 402:
      return `Not enough Apify credit to run ${actor}. ${detail}`.trim();
    case 404:
      return `Actor ${actor} was not found. ${detail}`.trim();
    case 408:
      return `${actor} did not finish in time. Try a smaller max_items. ${detail}`.trim();
    case 429:
      return 'Apify rate limit hit. Wait a few seconds and retry.';
    default:
      return `Apify error ${status}${detail ? `: ${detail}` : ''}`;
  }
}
