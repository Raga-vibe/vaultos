# VaultOS

The control layer for autonomous wallets.
**Autonomous finance, with boundaries.** The agent never has unrestricted authority.

```
User Policy → Opportunity → SERV Reasoning → Policy Verification
            → Approve/Reject → AgentKit Wallet → Base Sepolia tx → Audit Log
```

Three layers, three responsibilities, no overlap:

| Layer | Responsibility | Can it authorise? |
|---|---|---|
| SERV Reasoning | structured assessment and explanation | **No.** Advisory only. |
| Policy Engine | deterministic enforcement | **Yes. Only this.** |
| Coinbase AgentKit | wallet custody and on-chain execution | No. Executes what policy approved. |

## The security rule

An LLM never decides whether a hard financial constraint is satisfied.

The policy engine evaluates a `CanonicalAction` assembled from the stored
opportunity record and the real on-chain balance — never from numbers in a
model response. `buildCanonicalAction()` takes no assessment parameter, so
there is no argument you could pass that would let a model response reach the
engine. That is what makes the rule a property of the code rather than a
promise in a document.

If `maxAllocationPercent` is 20 and the action is 25%, it is REJECTED
regardless of what SERV says. If `leverageAllowed` is false, any leveraged
action is REJECTED deterministically. `npm run spike:serv-invalid` proves both,
offline, with no credentials.

## A name that deliberately did not change

`AGENT_WALLET_NAME` still defaults to **`agentvault-agent`**, and it must.

Coinbase resolves a wallet by that name: `cdp.evm.getOrCreateAccount({ name })`
returns the same address every time for the same string. The funded Base
Sepolia wallet this project has been tested against —
`0x13E40C93accf887ABA72a59B038c9737927F2C31` — is bound to that exact name.
Renaming it would not rename the wallet; it would silently create a new, empty
one, and any funds sent afterwards would go somewhere the old name can never
reach.

The two `Symbol.for("agentvault.*")` cache keys are internal registry keys with
no user-visible surface, and are left alone for the same reason: churn without
benefit.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill it in
```

Keys: SERV from <https://console.openserv.ai/settings/keys>, CDP from the
Coinbase Developer Platform. Every variable is server-side. Nothing here is
ever prefixed `NEXT_PUBLIC_`.

## Deploying

Vercel, Node 24. Two things are not optional, and neither is discoverable from
the code alone — the second one lives in the dashboard, not in this repo.

**1. `engines` picks the Node version.**

```json
{ "engines": { "node": "24.x" } }
```

This *overrides* the Node.js Version chosen in Vercel's project settings, not
the other way round. Do not lower it.

**2. `NODE_OPTIONS=--experimental-require-module` must be set as a project
environment variable**, in Project Settings → Environment Variables, for every
environment you deploy. Without it every route that touches a wallet returns a
500 and the deployment looks completely broken. See gotcha (f) for why.

Environment variable changes do not apply to an existing build. Redeploy after
setting it.

**Verifying it took.** `GET /api/health` reports the runtime it is actually
running on, on both the success and the failure path:

```json
{"runtime": {"node": "v24.20.0",
             "versionSupportsRequireEsm": true,
             "requireModuleEnabled": true}}
```

`requireModuleEnabled` is `process.features.require_module` — what Node says
about itself, not what the version number implies. **If it reads `false`, the
environment variable is missing or the build predates it.** That one field is
the difference between a five-minute fix and an afternoon.

## Commands

```bash
npm run spike:serv-invalid      # offline — no keys needed
npm run spike:matrix            # offline — the decision matrix
npm run spike:serv              # SERV structured output over the wire
npm run spike:wallet            # stable wallet resolution (regression test)
npm run spike:balance -- --faucet
npm run spike:transfer
npm run spike:receipt -- 0x<hash>
npm test                        # vitest
npm run typecheck
npm run lint
npm run build
npm run dev                     # then: curl localhost:3000/api/health
```

## Six gotchas — do not undo these fixes

**(a) `configureWithWallet()` creates a NEW wallet when called without an
`address`.** Verified in the installed package's compiled source:

```js
const serverAccount = await (config.address
    ? cdpClient.evm.getAccount({ address: config.address })
    : cdpClient.evm.createAccount({ idempotencyKey }));
```

A fresh empty wallet on every hot reload and every serverless cold start.
Fixed in `lib/agentkit/wallet.ts`: resolve a stable named account with
`cdp.evm.getOrCreateAccount({ name })` first, pass its address in, memoise the
provider on `globalThis`. `npm run spike:wallet` is the regression test — it
resolves cold and warm and fails if the addresses differ.

**(b) `CdpV2WalletProvider` does not exist in agentkit 0.10.4**, despite
appearing in the CDP docs. Confirmed absent from the package's type
definitions. Use `CdpEvmWalletProvider`.

**(c) AgentKit's ERC20 `transfer` action never throws.** Every failure path
returns a *string* beginning with `"Error"`, and the whole body is wrapped in
`catch (error) { return \`Error transferring the asset: ${error}\` }`. Five
distinct such returns. A caller checking only for exceptions reads a failed
transfer as success. `lib/agentkit/execute.ts` treats an `"Error"` prefix, or
a response with no parseable `0x` hash, as a hard failure.

**(d) `next.config.ts` needs `serverExternalPackages`** for `@coinbase/agentkit`,
`@coinbase/cdp-sdk` and `@coinbase/coinbase-sdk`. Verified by removing it: the
Next 16 build fails at page-data collection with `TypeError: Z is not a
function`.

**(e) AgentKit's telemetry ping can kill your process.** Not in the original
brief — found the hard way on Windows. Every `WalletProvider` fires an
analytics event on construction:

```js
trackInitialization() {
    try {
        sendAnalyticsEvent({ ... });   // async — returns a Promise
    } catch (error) {
        console.warn("Failed to track ...", error);
    }
}
```

`sendAnalyticsEvent` is async and throws on any non-2xx response from
`cca-lite.coinbase.com`. The `try/catch` cannot catch a rejected promise,
nothing awaits it, and since Node 15 an unhandled rejection terminates the
process. So a 400 from Coinbase's telemetry endpoint crashes the entire app
while it is constructing a wallet. There is no opt-out setting in the package.

Fixed in `lib/agentkit/analytics-guard.ts`: one process-level handler that
swallows exactly this rejection and re-raises every other one, so real
failures still crash loudly. node_modules is deliberately not patched — that
would vanish on the next `npm install`.

Also: no `next/font/google` — it fetches at build time.

**(f) Vercel disables `require(esm)`, and the version number will lie to you
about it.** `@coinbase/agentkit` is published as CommonJS only — no `import`
condition, no `module` field. Its CommonJS requires `@coinbase/cdp-sdk`'s
CommonJS build, which requires `jose`, and jose 6 is ESM-only:

```
@coinbase/agentkit (CJS) → @coinbase/cdp-sdk/_cjs → jose@6 (ESM)
```

Loading AgentKit therefore needs `require(esm)`, added in Node 20.19 and 22.12.
Vercel's functions report Node **24.20** and still throw `ERR_REQUIRE_ESM`,
because the platform disables the feature regardless of version. Pinning a
newer Node does not help — that was the first wrong diagnosis here, and it cost
hours.

Vercel documents the opt-in: set `NODE_OPTIONS=--experimental-require-module`
as a project environment variable and redeploy. That is the whole fix; there is
no code change.

Do not try to solve this by pinning packages. jose is only the first ESM-only
module the chain reaches — this tree contains **63** of them, so overriding
them one at a time is endless. And do not remove `serverExternalPackages` to
bundle the SDKs instead: that build now *succeeds*, then dies at runtime on
`TypeError: Z is not a function`, which is gotcha (d) wearing a different hat.

`/api/health` exists in its current shape because of this bug. When a module
fails to load, the version number is the least useful fact available and
`process.features.require_module` is the most useful, so the endpoint reports
both — see Deploying.

**Open question — `export const runtime = "nodejs"`.** Server routes declare it
explicitly, per the project brief. But Next 16's own bundled documentation
(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`)
says the opposite: *"The Edge Runtime is deprecated. Remove the `runtime`
export from your route files."* `nodejs` is already the default. Keeping the
export is harmless — the build passes either way — but it is now redundant and
contradicts the shipped docs. Decide whether to drop it.

## Layout

```
lib/server-guard.ts          browser guard + requireEnv
lib/serv/client.ts           OpenAI SDK pointed at SERV
lib/serv/schema.ts           JSON Schema + Zod, kept in sync by a test
lib/serv/assess.ts           assessOpportunity() + parseAssessment()
lib/agentkit/analytics-guard.ts  stops AgentKit telemetry crashing the process
lib/agentkit/wallet.ts       stable wallet + faucet + snapshot
lib/agentkit/execute.ts      USDC submit / confirm / balances / action path
lib/policy/types.ts          RiskPolicy, CanonicalAction, PolicyVerdict
lib/policy/engine.ts         pure engine — full rule set
lib/opportunities/source.ts  six seeded opportunities + buildCanonicalAction
lib/audit/log.ts             append-only events
lib/store/                   Store interface + memory and Supabase backends
lib/api/validate.ts          request schemas — note what they REFUSE
lib/api/flow.ts              request orchestration, in enforced order
lib/api/respond.ts           JSON helpers; bigints as strings, no leaked stacks
app/api/                     8 routes
supabase/schema.sql          run once in the Supabase SQL editor
scripts/                     _report.ts + 6 spikes
```

## Verified technology

SERV Reasoning is an OpenAI-compatible inference API. There is **no separate
SERV inference SDK** — use the official `openai` npm package with the base URL
overridden. (The npm package `openserv-labs/sdk` is a different product, for
marketplace agents.)

```
Base URL (OpenAI shape)  https://inference-api.openserv.ai/v1
Auth                     Authorization: Bearer $SERV_API_KEY
Model                    gpt-5.4-mini
reasoning_effort         "low" | "medium" | "high"   (we use "medium")
```

Structured output uses `response_format: { type: "json_schema", json_schema:
{ name, strict: true, schema } }`. The schema needs `additionalProperties:
false` and a complete `required` array. SERV's own docs warn that providers may
not honour the schema, so every response is validated with Zod at the app
boundary. Shadow Agent validator/regeneration errors surface as HTTP 502 and
are treated as a hard reject, never as unvalidated content.

Docs live at `docs.openserv.ai/serv-reasoning/...` —
`docs.openserv.ai/docs/serv-reasoning` 404s.

AgentKit facts below were read from the installed package, not from docs:

```
@coinbase/agentkit  0.10.4        @coinbase/cdp-sdk  1.56.0
Wallet provider     CdpEvmWalletProvider.configureWithWallet(config?)
Chain               Base Sepolia only, chain ID 84532
Faucet              cdp.evm.requestFaucet({ address, network, token })
Base Sepolia USDC   0x036CbD53842c5426634e7929541eC2318f3dCF7e
             EURC   0x808456652fdb597867f38412077A9182bf77359F
            CBBTC   0xcbB7C0006F23900c38EB856149F799620fcb8A4a
             WETH   0x4200000000000000000000000000000000000006
```

`viem` and `zod` are pinned to match AgentKit's own resolutions so the tree
dedupes to a single copy of each. AgentKit pins `viem` to exactly `2.38.3` and
requires `zod ^3.23.8`; zod 4 would split the tree and break the Action schema
types.

## Status

Proven offline:

- 134 unit tests pass
- `tsc --noEmit` clean, eslint clean, `next build` succeeds
- `spike:serv-invalid` passes 17/17: 11 malformed-response cases rejected,
  plus the fail-closed assertions
- Gotchas (d) and (f) reproduced and confirmed fixed — (f) by running the
  production build under `NODE_OPTIONS=--no-experimental-require-module`,
  which reproduces Vercel's runtime exactly
- No credential variable names in the client bundle; no `NEXT_PUBLIC_` anywhere

Proven on chain (20 September 2026, Base Sepolia):

| Criterion | Evidence |
|---|---|
| Wallet creates/reuses the same address | `0x13E40C93accf887ABA72a59B038c9737927F2C31` — cold and warm resolution match |
| Network | `base-sepolia`, chain ID `84532` |
| Balance retrieval | native + USDC read via `readContract` |
| Faucet funding | ETH `0x4db1a77d…a001a`, USDC `0xc1084b5b…d2175` |
| USDC transfer submitted | `0x6ab020525f2678ffda9a60a9258d39a8b6b5f51ba474db5b010c1e63e1486f0d` |
| Receipt confirmed | block 47083940, 62,147 gas, balance 1000000 → 990000 |
| SERV structured output | schema-valid assessment returned by `gpt-5.4-mini` |

Explorer: <https://sepolia.basescan.org/tx/0x6ab020525f2678ffda9a60a9258d39a8b6b5f51ba474db5b010c1e63e1486f0d>

Milestone 1 is complete. Nothing in this repo is simulated.

## API

| Route | Does |
|---|---|
| `GET /api/health` | Wallet smoke test; reports the serving Node runtime and which store is active |
| `GET /api/health?lite=1` | The same check without resolving the CDP wallet. Returns runtime, store, `depositAddressConfigured` and `rpcConfigured` in milliseconds instead of seconds. Used by every screen that only needs those fields; the full check is reserved for System status. |
| `GET /api/wallet` | Address, network, native and USDC balances |
| `GET /api/opportunities` | The opportunity records |
| `GET /api/policy` | Current policy, or the conservative default |
| `PUT /api/policy` | Replace the policy. Unknown fields are refused |
| `POST /api/assess` | SERV assessment. **Advisory — cannot authorise anything** |
| `POST /api/evaluate` | Dry run. Builds the action, returns the verdict, executes nothing |
| `POST /api/execute` | Evaluates, then executes only if APPROVED and autoExecute is on |
| `GET /api/audit` | The append-only trail |

**What the request schemas refuse is the point.** `POST /api/evaluate` and
`POST /api/execute` accept an opportunity id and an amount — nothing else.
There is no `risk`, no `liquidity`, no `usesLeverage`, no
`walletBalanceAtomic`. Those come from the stored record and from the chain.
If the schema accepted them, an HTTP client could declare a HIGH-risk position
LOW and walk past the policy — the same hole the SERV boundary closes, reopened
at the network edge. `validate.test.ts` asserts each of those fields is
rejected.

**Two decisions inside `POST /api/execute`:**

An APPROVED verdict with `autoExecute` off returns `requiresManualApproval`
and executes nothing. The route does not treat its own invocation as a human
consenting — the caller could be an agent loop, and the thing asking to spend
the money is not a substitute for permission.

An execution is recorded the moment a transaction hash exists, not when the
receipt confirms. Once a transfer is broadcast the funds are committed whether
or not the receipt is readable afterwards. Counting on confirmation means a
failed receipt read hides the spend from the daily cap and the agent can send
it again. Counting on submission can at worst over-count a transaction that
never lands, costing an unused allowance. Double-spend versus wasted
allowance — the asymmetry decides it.

## Storage

Memory by default; Supabase when `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are set to real values. `/api/health` reports
which is live, because "which database am I writing to" should never be a
guess. Run `supabase/schema.sql` once in the SQL editor first.

Atomic amounts are stored as TEXT, never numeric. They routinely exceed what a
JSON number holds safely, and a rounded amount is a wrong amount. Row level
security is enabled with no permissive policies, so only the service role key
— which never leaves the server — can read the tables. The anon key is designed
to be public; an audit log readable with it would be readable by anyone.

## Opportunities

Six fixtures, each shaped to exercise a different rule. `npm run spike:matrix`
runs them against three policies and prints the grid — offline, no credentials.

| Fixture | Under the default policy |
|---|---|
| Stablecoin reserve | APPROVED — the baseline |
| Balanced lending pool | APPROVED — sits exactly on the ceilings |
| Volatile asset strategy | REJECTED — `RISK_ABOVE_MAX` |
| Locked-term vault | REJECTED — `LIQUIDITY_BELOW_MIN`, despite LOW risk |
| Leveraged carry trade | REJECTED — `LEVERAGE_NOT_ALLOWED` and nothing else |
| Euro stablecoin reserve | APPROVED — carries a risk the bands cannot see |

**These are fixtures, and they say so.** Base Sepolia is a testnet; there are
no real lending markets on it and no real yields. Every record carries
`dataSource: "SEEDED"` so nothing downstream can mistake it for a live feed,
and the protocol names are generic — no real organisation's name is attached
to numbers it never published. A test asserts that too.

What is *not* invented: the token addresses, the chain, the balances read
against them, and any transaction that results. The fixtures describe what the
agent is deciding about; the decision and its consequences are real.

**The carry trade is the interesting one.** It passes every rule except the
leverage ban — liquid, only moderately risky by its own accounting, best
headline yield in the set. A scoring system would let it through on points.
A categorical ban does not, and that is the difference between a risk model
and a control system.

**The euro reserve is the honest one.** It passes policy cleanly while
carrying currency risk that `LOW/MEDIUM/HIGH` cannot express. It is in the set
to mark where a deterministic engine stops being sufficient and a human has to
look — the kind of gap worth naming rather than hiding.

## The policy rules

Five are always enforced:

| Rule | Meaning |
|---|---|
| `maxAllocationPercent` | Most one action may deploy, as a share of balance |
| `maxRisk` | Highest risk band accepted |
| `minLiquidity` | Lowest liquidity band accepted |
| `leverageAllowed` | Whether leverage is permitted at all |
| `autoExecute` | Whether an approved action needs a human to confirm |

The rest are optional. Leaving one unset means the user has not configured
that constraint. Setting one the engine cannot evaluate — because the caller
passed no `EvaluationContext` — is a **rejection**, not a pass.

| Rule | Meaning |
|---|---|
| `maxTotalExposurePercent` | Ceiling on everything deployed across open positions |
| `minReserveAtomic` | Atomic units that must remain, whatever the percentages say |
| `maxActionsPerDay` | Actions permitted in a rolling 24 hours |
| `maxDailyDeployedPercent` | Share of balance deployable in a rolling 24 hours |
| `cooldownSeconds` | Minimum gap between actions |
| `allowedProtocols` | Allowlist. An empty array permits nothing — it is not read as "no restriction" |
| `blockedProtocols` | Denylist. Wins over the allowlist |

**Why the cumulative rules exist.** A per-action percentage cap does not bound
an autonomous agent. Twenty separate actions, each a compliant 20% of the
balance at the time, will empty a wallet — every one passes, and the wallet
still ends at zero. A pure-percentage rule cannot even finish draining it:
20% of a shrinking balance is always "allowed", so the agent continues
indefinitely. `engine.test.ts` runs exactly that twenty-step attack and
asserts it stops after two.

**Determinism.** The engine never reads the clock and never queries a
database. `now` and the action history are passed in as an `EvaluationContext`.
That is what makes a past decision reproducible when auditing it — and it is
why a history row with an unreadable timestamp is a rejection rather than a
skipped row. If we cannot tell whether a past action falls inside the window,
we cannot tell whether the daily cap holds, and dropping the row would hide
spending from the very limit meant to bound it.

## Roadmap

Milestones 1-5 complete. Deployed on Base Sepolia at
<https://vaultos-rust.vercel.app>.

No mainnet, leverage, multi-chain, trading strategies, yield optimization,
background workers, multi-agent framework, auth UI or payments.
