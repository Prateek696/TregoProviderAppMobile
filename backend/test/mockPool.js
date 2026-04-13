/**
 * Mock pg Pool for unit/integration tests. Implements just enough surface for
 * the handlers we test against. Queries match on SQL substrings.
 */
class MockPool {
  constructor() {
    this.queries = [];
    this.handlers = []; // [{match: regex|string, rows|fn}]
  }

  /** Register a handler. If match is a string it must be contained in the SQL. */
  when(match, rowsOrFn) {
    this.handlers.push({ match, handler: rowsOrFn });
    return this;
  }

  reset() {
    this.queries = [];
    this.handlers = [];
  }

  async query(sql, values) {
    this.queries.push({ sql, values });
    for (const h of this.handlers) {
      const ok = typeof h.match === 'string' ? sql.includes(h.match) : h.match.test(sql);
      if (ok) {
        const out = typeof h.handler === 'function' ? await h.handler(sql, values) : h.handler;
        if (Array.isArray(out)) return { rows: out, rowCount: out.length };
        return out;
      }
    }
    // Default: empty result set
    return { rows: [], rowCount: 0 };
  }

  async connect() {
    const self = this;
    return { query: (s, v) => self.query(s, v), release() {} };
  }

  async end() { return Promise.resolve(); }
}

module.exports = { MockPool };
