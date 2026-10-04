# Privacy lint — `bare-metal-eo-matrix-app`

Audited against its own threat model (`ENCRYPTION-DESIGN.md`): the bar is
*passive* confidentiality against the homeserver ("server-blind"), a small
trusted team per workspace, and an actively-malicious homeserver is explicitly
out of scope (§9). Findings are ranked by how much they actually move the
privacy guarantee, and each is labeled **documented** (the author already
named it) vs **gap** (a real hole the design did not account for).

## Findings

### 1. "Keep me signed in" writes the raw vault key to `localStorage` — *documented, still a real hole*

`src/vault.js:73-81, 229-250` (`PERSIST_STASH_KEY`). The comment names the
trade-off plainly: "this writes the raw AES vault key to disk. Anyone with
access to this browser profile can then decrypt the user's local-at-rest data
without knowing the password." It's opt-in and disclosed — but it is the
single highest-value target in the whole app: one `localStorage` read, from
any code running in the origin (and this origin loads React, Babel Standalone,
and a formula interpreter), decrypts everything at rest. **Severity: high.
Status: accepted trade-off, but the XSS blast radius is the entire vault.**

### 2. The vault KDF is weaker than the envelope KDF, inconsistently

`src/vault.js:21` uses `PBKDF2_ITERATIONS = 250_000`; `src/crypto/envelope.js:27`
uses `600_000`. The *identity chain* (password → account key → the thing that
unlocks all server-side data) is hardened to 600k, but the *local-at-rest*
vault is derived at 250k — below the current OWASP PBKDF2-SHA256 floor. The
two KDFs are the same password doing two different jobs, and the weaker one
guards the local copy. **Severity: medium. Status: gap (inconsistency, easy to
fix — one constant).**

### 3. `account_data` is an offline password-cracking oracle sitting on the server

`src/crypto/identity.js:145-156` publishes `{ salt, iters, pub, wrapped_priv }`
to Matrix `account_data` — readable by the homeserver operator and anyone with
server access. The whole chain (identity → WCK → every block) is AES-GCM under
a password-derived key. An adversary who reads `account_data` can run an
offline dictionary attack; the *entire* server-blind guarantee collapses to
**password strength**. No server-side rate limit applies to offline cracking.
**Severity: high for weak passwords, low for strong ones. Status: inherent to
the password-derived design, documented in §1 but not called out as a
cracking oracle.**

### 4. No key verification — the passive/active boundary is undeclared

`ENCRYPTION-DESIGN.md §9` scopes out an *actively malicious* homeserver that
substitutes a member's public key. There is no TOFU pinning, no SAS/emoji
verification, no cross-signing. "Server-blind" is therefore **passive-only**:
an honest-but-curious server cannot read content, but a malicious one can
substitute `member_key` state and decrypt everything a workspace ever writes.
**Severity: the largest structural gap. Status: documented-out-of-scope, but
the README's marketing ("stores ciphertext it cannot read") overstates the
guarantee relative to §9.**

### 5. Metadata is plaintext to the homeserver — by design, but unstated in the README

Room state (`member_key`, `wkey`, membership, room names/topics) is never
megolm-encrypted, so the homeserver sees the **social graph, workspace
membership, and event timing** — who is in which room with whom, and when.
The threat model accepts this (passive *content* confidentiality, not
metadata). The README's "no database, no keys to leak" framing doesn't mention
that the *graph* leaks. **Severity: low for content, medium for metadata.
Status: documented in the design, absent from the README.**

### 6. Vendored third-party code runs in the same origin as the vault key

`public/vendor/{react,react-dom,babel}.js` — Babel Standalone compiles and
evaluates code in the same origin that holds the vault key (finding #1). Any
compromise of a vendored dependency, or any formula-evaluation path that can
reach `eval`, reads the stash. **Severity: medium (amplifies #1). Status: gap
— no CSP or subresource-integrity hardening noted in the checkout.**

## Clean passes (what this codebase gets right, worth naming)

- No `eval`/`new Function`/`exec` in `src/` (dynamic code is vendored Babel only).
- No hardcoded secrets, tokens, or API keys anywhere.
- No plaintext `http://` endpoints (Matrix transport is the SDK's https).
- `console.*` calls log error messages only — no keys, passwords, or ciphertext.
- CSPRNG (`crypto.getRandomValues`) throughout; AES-GCM with random IVs; HKDF
  domain-separated (`eo-wck-wrap`); ECIES ephemeral-key wraps are one-shot and
  forward-secure.
- The WCK is never written to the server in the clear — only ECIES-wrapped per
  member, and grants ride on the granter's own state event (correctly working
  around Matrix's `@`-state_key auth rule).

## The one-sentence verdict

This is a genuinely well-engineered E2EE system whose **content** is
server-blind by construction — and whose residual risks are all in the
*edges the design already named*: the local stash (#1), the KDF gap (#2), the
password-oracle (#3), and the unverified key-distribution boundary (#4). The
first fix that matters most is **#4 key verification**, because it's the
difference between "the server can't read it" (true) and "the server can't
*substitute a reader*" (not yet true).
