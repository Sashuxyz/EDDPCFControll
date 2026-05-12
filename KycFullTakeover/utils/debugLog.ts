// Centralised diagnostic logging with PII redaction.
//
// The control logs aggressively during development so devtools shows the
// full request body of every write. That same volume in production = a
// GDPR concern: any browser extension with tabs/scripting permission, any
// session-replay tool (FullStory, Datadog RUM), or a screenshot of an open
// devtools session leaks names, dates of birth, nationalities, emails and
// phone numbers.
//
// In a webpack production build, `process.env.NODE_ENV` is statically
// 'production' and the bundler treestakes the verbose code path. The
// fields listed in REDACT_KEYS are always replaced with '<redacted>' even
// in dev, just in case a developer hits "Copy object" in devtools and
// pastes into Slack.

/* eslint-disable no-console */

const IS_PROD = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');

/** Keys whose values must never be written verbatim, anywhere, ever. */
const REDACT_KEYS: ReadonlySet<string> = new Set([
  'firstname', 'lastname', 'fullname',
  'birthdate', 'syg_dateofbirth',
  'emailaddress1', 'telephone1',
  'syg_pepdetails', 'syg_pepderivationdetails', 'syg_formerpepdetails',
  'syg_mediascreeningandreputationalriskcomment',
  'syg_sanctioncheckcomment',
  'syg_relatedcountries',
]);

/** Deep-clone the value, replacing redacted keys at any depth. */
function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as object)) return '<cycle>';
  seen.add(value as object);
  if (Array.isArray(value)) return value.map((v) => redact(v, seen));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k)) {
      out[k] = typeof v === 'string' && v.length > 0 ? '<redacted>' : v;
    } else if (k === 'body' && v && typeof v === 'object') {
      // Request bodies frequently contain PII. Replace with field-count summary
      // unless we're in dev where the developer wants the full thing.
      if (IS_PROD) {
        const keys = Object.keys(v as object);
        out[k] = `<body: ${keys.length} fields>`;
      } else {
        out[k] = redact(v, seen);
      }
    } else {
      out[k] = redact(v, seen);
    }
  }
  return out;
}

export function debugInfo(tag: string, payload?: unknown): void {
  if (IS_PROD) return;                                // info channel only in dev
  if (payload === undefined) console.info(tag);
  else console.info(tag, redact(payload));
}

export function debugWarn(tag: string, payload?: unknown): void {
  // warns are useful in prod (cookie expired, network blip) but redacted
  if (payload === undefined) console.warn(tag);
  else console.warn(tag, redact(payload));
}

export function debugError(tag: string, payload?: unknown): void {
  // errors are emitted in prod (telemetry hook) but redacted
  if (payload === undefined) console.error(tag);
  else console.error(tag, redact(payload));
}
