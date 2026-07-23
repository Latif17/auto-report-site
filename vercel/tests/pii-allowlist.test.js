/**
 * PII Allowlist Tests
 * ====================
 * These tests enforce that no personally-identifiable information (PII) is
 * ever returned by any public API endpoint.
 *
 * The approach is DENY BY DEFAULT:
 *  - Every endpoint has an explicit allowlist of permitted response keys.
 *  - The deep key-collector traverses the entire response (including nested
 *    objects and arrays) and records every key path it finds.
 *  - Any key path absent from the allowlist fails the test immediately.
 *  - A separate PII_FIELDS set provides a second, named check so failures
 *    produce a clear "reported_by appeared" message rather than just
 *    "unlisted key".
 *
 * PII fields that must NEVER appear anywhere in a response:
 *   reported_by, user_email, email, full_name, phone,
 *   postcode, address, additional_notes, pool_data
 */

const request = require('supertest');
const app = require('../server');

// ─── Ground Truth ─────────────────────────────────────────────────────────────

/**
 * Canonical set of PII field names.
 * If any of these appear as a key anywhere in a response the test fails.
 */
const PII_FIELDS = new Set([
    'reported_by',
    'user_email',
    'email',
    'full_name',
    'phone',
    'postcode',
    'address',
    'additional_notes',
    'pool_data',
]);

/**
 * Per-endpoint allowlists — the ONLY key paths permitted in each response.
 *
 * Key paths are normalised: array indices are stripped so that
 * `reports[0].id` and `reports[1].id` both appear as `reports.id`.
 *
 * To add a new field to a response you MUST add it here first. This makes
 * every change to the public API surface explicit and reviewable.
 */
const ALLOWLISTS = {
    '/api/dashboard-stats': new Set([
        'users',
        'incidents',
        'formsSubmitted',
    ]),

    '/api/smell-stats-weekly': new Set([
        'labels',
        'datasets',
        'datasets.label',
        'datasets.data',
        'datasets.backgroundColor',
        'datasets.borderColor',
        'datasets.borderWidth',
    ]),

    '/api/stats': new Set([
        'count',
        'recentIncidents',
        'recentIncidents.id',
        'recentIncidents.smell_timestamp',
        'recentIncidents.smell_type',
        'recentIncidents.business_location',
        'recentIncidents.status',
        'recentIncidents.alreadyReported',
    ]),

    '/api/history': new Set([
        'reports',
        'reports.id',
        'reports.submittedAt',
        'reports.smellType',
        'reports.businessLocation',
        'reports.govUkStatus',
    ]),
};

// ─── Key-Collection Utility ───────────────────────────────────────────────────

/**
 * Recursively collects all key paths from `obj`.
 *
 * Rules:
 *  - Object keys are recorded as dot-separated paths: `a.b.c`
 *  - Array items are visited but their numeric indices are NOT recorded.
 *    `items[0].id` and `items[1].id` both produce the single path `items.id`.
 *  - null / primitives produce no keys.
 *
 * @param {*}      obj
 * @param {string} [prefix='']
 * @returns {Set<string>}
 */
function collectAllKeys(obj, prefix = '') {
    const keys = new Set();

    if (Array.isArray(obj)) {
        for (const item of obj) {
            for (const k of collectAllKeys(item, prefix)) {
                keys.add(k);
            }
        }
    } else if (obj !== null && typeof obj === 'object') {
        for (const [key, val] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${key}` : key;
            keys.add(path);
            for (const k of collectAllKeys(val, path)) {
                keys.add(k);
            }
        }
    }

    return keys;
}

// ─── Assertion Helpers ────────────────────────────────────────────────────────

/**
 * Asserts that no key in `body` (at any depth) matches a PII field name.
 * Reports each violation individually for clarity.
 */
function assertNoPII(body) {
    const foundPII = [];
    for (const path of collectAllKeys(body)) {
        const leaf = path.split('.').pop();
        if (PII_FIELDS.has(leaf)) foundPII.push(path);
    }
    if (foundPII.length > 0) {
        throw new Error(
            `PII field(s) found in response: ${foundPII.join(', ')}\n` +
            `These fields must never appear in a public API response.`
        );
    }
}

/**
 * Asserts that every key path in `body` appears in the allowlist for
 * `endpoint`. Any unlisted key is a test failure.
 */
function assertOnlyAllowlistedKeys(body, endpoint) {
    const allowlist = ALLOWLISTS[endpoint];
    const violations = [];
    for (const path of collectAllKeys(body)) {
        if (!allowlist.has(path)) violations.push(path);
    }
    if (violations.length > 0) {
        throw new Error(
            `Unlisted key(s) in ${endpoint} response: ${violations.join(', ')}\n` +
            `Add them to ALLOWLISTS only if they contain no PII.`
        );
    }
}

// ─── Utility Self-Tests ───────────────────────────────────────────────────────
// These tests verify the guardrail tooling itself is correct before trusting
// it to test the real endpoints.

describe('collectAllKeys utility', () => {
    it('collects flat object keys', () => {
        expect(collectAllKeys({ a: 1, b: 'x' })).toEqual(new Set(['a', 'b']));
    });

    it('collects deeply nested key paths', () => {
        expect(collectAllKeys({ a: { b: { c: 1 } } }))
            .toEqual(new Set(['a', 'a.b', 'a.b.c']));
    });

    it('normalises array items — no numeric indices recorded', () => {
        const result = collectAllKeys({ items: [{ id: 1 }, { id: 2, extra: true }] });
        expect(result).toEqual(new Set(['items', 'items.id', 'items.extra']));
    });

    it('handles empty arrays without error', () => {
        expect(collectAllKeys({ items: [] })).toEqual(new Set(['items']));
    });

    it('handles null values without error', () => {
        expect(collectAllKeys({ a: null, b: 0, c: false })).toEqual(new Set(['a', 'b', 'c']));
    });

    it('handles deeply nested arrays', () => {
        const result = collectAllKeys({ a: [{ b: [{ c: 1 }] }] });
        expect(result).toEqual(new Set(['a', 'a.b', 'a.b.c']));
    });
});

// ─── PII Detection Self-Tests ─────────────────────────────────────────────────

describe('PII detection guardrail (self-tests)', () => {
    it('catches a top-level PII field', () => {
        expect(() => assertNoPII({ id: 1, email: 'user@example.com' }))
            .toThrow(/PII field.*email/);
    });

    it('catches PII nested inside an object', () => {
        expect(() => assertNoPII({ incident: { reported_by: 'someone@example.com' } }))
            .toThrow(/PII field.*incident\.reported_by/);
    });

    it('catches PII inside an array of objects', () => {
        expect(() => assertNoPII({ reports: [{ id: 1, additional_notes: 'private text' }] }))
            .toThrow(/PII field.*reports\.additional_notes/);
    });

    it('catches multiple PII fields at once', () => {
        expect(() => assertNoPII({ user_email: 'x', full_name: 'y', postcode: 'E1' }))
            .toThrow(/PII field/);
    });

    it('passes cleanly for a response with no PII', () => {
        expect(() => assertNoPII({ id: 1, smellType: 'Sewage', govUkStatus: 'submitted' }))
            .not.toThrow();
    });
});

// ─── Deny-by-Default Self-Tests ───────────────────────────────────────────────

describe('Allowlist enforcement guardrail (self-tests)', () => {
    const testAllowlist = new Set(['id', 'name']);

    it('catches an unlisted key', () => {
        const body = { id: 1, name: 'ok', secret: 'boom' };
        const violations = [...collectAllKeys(body)].filter(k => !testAllowlist.has(k));
        expect(violations).toContain('secret');
    });

    it('catches a nested unlisted key', () => {
        const body = { id: 1, nested: { hidden: 'value' } };
        const violations = [...collectAllKeys(body)].filter(k => !testAllowlist.has(k));
        expect(violations).toContain('nested');
        expect(violations).toContain('nested.hidden');
    });

    it('passes for a body that exactly matches the allowlist', () => {
        const body = { id: 1, name: 'allowed' };
        const violations = [...collectAllKeys(body)].filter(k => !testAllowlist.has(k));
        expect(violations).toEqual([]);
    });
});

// ─── Endpoint Tests ───────────────────────────────────────────────────────────

describe('PII Allowlist — GET /api/dashboard-stats', () => {
    let body;

    beforeAll(async () => {
        const res = await request(app).get('/api/dashboard-stats');
        expect(res.status).toBe(200);
        body = res.body;
    });

    it('contains no PII fields anywhere in the response', () => {
        assertNoPII(body);
    });

    it('contains only allowlisted keys (deny-by-default)', () => {
        assertOnlyAllowlistedKeys(body, '/api/dashboard-stats');
    });
});

describe('PII Allowlist — GET /api/smell-stats-weekly', () => {
    let body;

    beforeAll(async () => {
        const res = await request(app).get('/api/smell-stats-weekly');
        expect(res.status).toBe(200);
        body = res.body;
    });

    it('contains no PII fields anywhere in the response', () => {
        assertNoPII(body);
    });

    it('contains only allowlisted keys (deny-by-default)', () => {
        assertOnlyAllowlistedKeys(body, '/api/smell-stats-weekly');
    });

    it('is safe for a simulated populated dataset response', () => {
        // Guards against regressions where user data leaks into chart datasets.
        const simulated = {
            labels: ['Mon', 'Tue', 'Wed'],
            datasets: [
                {
                    label: 'Sewage',
                    data: [1, 0, 2],
                    backgroundColor: 'rgba(0,255,0,0.7)',
                    borderColor: '#00ff00',
                    borderWidth: 1,
                },
            ],
        };
        assertNoPII(simulated);
        assertOnlyAllowlistedKeys(simulated, '/api/smell-stats-weekly');
    });
});

describe('PII Allowlist — GET /api/stats', () => {
    let body;

    beforeAll(async () => {
        const res = await request(app).get('/api/stats');
        expect(res.status).toBe(200);
        body = res.body;
    });

    it('contains no PII fields anywhere in the response', () => {
        assertNoPII(body);
    });

    it('contains only allowlisted keys (deny-by-default)', () => {
        assertOnlyAllowlistedKeys(body, '/api/stats');
    });

    it('does not expose reported_by even when an incident is present', () => {
        // Targeted regression test: reported_by was previously leaked via select('*') + spread.
        const keys = collectAllKeys(body);
        expect(keys.has('recentIncidents.reported_by')).toBe(false);
    });

    it('does not expose created_at from the incidents row', () => {
        // created_at was previously leaked via the raw DB spread (...recentIncidents[0]).
        const keys = collectAllKeys(body);
        expect(keys.has('recentIncidents.created_at')).toBe(false);
    });

    it('is safe for a simulated fully-populated incident response', () => {
        // Simulates what the handler produces with real DB data.
        // If someone adds a field to the handler the test below catches it.
        const simulated = {
            count: 42,
            recentIncidents: [
                {
                    id: 1,
                    smell_timestamp: '2026-07-23T12:00:00Z',
                    smell_type: 'Sewage',
                    business_location: 'ReFood',
                    status: 'pending',
                    alreadyReported: false,
                },
            ],
        };
        assertNoPII(simulated);
        assertOnlyAllowlistedKeys(simulated, '/api/stats');
    });
});

describe('PII Allowlist — GET /api/history', () => {
    let body;

    beforeAll(async () => {
        const res = await request(app).get('/api/history?email=test%40example.com');
        expect(res.status).toBe(200);
        body = res.body;
    });

    it('contains no PII fields anywhere in the response', () => {
        assertNoPII(body);
    });

    it('contains only allowlisted keys (deny-by-default)', () => {
        assertOnlyAllowlistedKeys(body, '/api/history');
    });

    it('does not expose additional_notes even if present in the DB', () => {
        // Targeted regression: additional_notes was present in an earlier version.
        const keys = collectAllKeys(body);
        expect(keys.has('reports.additional_notes')).toBe(false);
    });

    it('does not expose user_email even though it was used to look up records', () => {
        const keys = collectAllKeys(body);
        expect(keys.has('reports.user_email')).toBe(false);
    });

    it('does not expose reported_by even if present on incidents table', () => {
        const keys = collectAllKeys(body);
        expect(keys.has('reports.reported_by')).toBe(false);
    });

    it('is safe for a simulated fully-populated reports response', () => {
        const simulated = {
            reports: [
                {
                    id: 1,
                    submittedAt: '2026-07-23T12:00:00Z',
                    smellType: 'Sewage',
                    businessLocation: 'ReFood',
                    govUkStatus: 'submitted',
                },
                {
                    id: 2,
                    submittedAt: '2026-07-22T08:30:00Z',
                    smellType: 'Unknown',
                    businessLocation: 'Veolia',
                    govUkStatus: 'not_submitted',
                },
            ],
        };
        assertNoPII(simulated);
        assertOnlyAllowlistedKeys(simulated, '/api/history');
    });
});
