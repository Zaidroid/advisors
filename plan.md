Advisor Pipeline — Google Sheets–Backed Rebuild

     Context

     /Users/zaidsalem/Zlab/Advisors/ currently holds a single-file 500 KB React-via-CDN tool (Advisor Pipeline Tool.html) that manages advisors
     for Elevate — Market Access / C-Suite Coaching. Today it reads from embedded JSON inside the HTML and stores all user edits in localStorage
      only (gsg_elevate_tracker_v1). The CSV sibling (Non-Technical Advisors Responses (1).csv, 482 rows × 32 columns) is a snapshot of the live
      Google Form responses.

     Two problems follow:
     - Advisor data is frozen at export time; the team cannot see new responses without a manual rebuild.
     - Pipeline state (statuses, assignees, notes, follow-up dates, history) lives only in a single browser — unshareable, easily lost.

     The goal is to rebuild the tool so it reads live from the official Google Sheet of form responses and writes its entire backend (config,
     tracker, follow-ups, activity log, team, future matches) to a second Google Sheet, mirroring the architecture already proven in
     /Users/zaidsalem/selection-tool/. Companies + matching are intentionally deferred to a second phase; this plan covers the advisor pipeline
     rebuild only.

     Decisions (confirmed with user)

     - Stack: Vite + React 19 + TypeScript + Tailwind 4 (mirror selection-tool).
     - Auth: Google Identity Services OAuth, restricted to @gazaskygeeks.com, calling Sheets API v4 directly.
     - Backend sheet: auto-provisioned on first run — the app creates missing tabs with correct headers.
     - Scope: Phase 1 = advisors only (read responses + full tracker/follow-ups/activity). Phase 2 (later) = companies + matching.

     Scoring & categorization (first-class feature)

     The tool owns its own scoring and categorization engine — fully configurable from the UI, persisted in the backend sheet, never hardcoded.
     Nothing about scoring depends on values pre-computed in the form responses.

     Two stages, both computed client-side at load time from the raw response fields:

     Stage 1 — Qualification score (0–100, pass/fail)

     Weighted sum of signals already present in the responses:

     ┌─────────────┬──────────────────────────────────────────┬───────────────┬────────────────────────────────────────────────────────────────┐
     │   Signal    │               Source field               │   Default     │                          Scoring rule                          │
     │             │                                          │    weight     │                                                                │
     ├─────────────┼──────────────────────────────────────────┼───────────────┼────────────────────────────────────────────────────────────────┤
     │ tech_rating │ Col 9 (Tech industry rating 1–5)         │ 15            │ (rating / 5) * weight                                          │
     ├─────────────┼──────────────────────────────────────────┼───────────────┼────────────────────────────────────────────────────────────────┤
     │ eco_rating  │ Col 10 (Palestinian ecosystem rating     │ 10            │ (rating / 5) * weight                                          │
     │             │ 1–5)                                     │               │                                                                │
     ├─────────────┼──────────────────────────────────────────┼───────────────┼────────────────────────────────────────────────────────────────┤
     │ clevel      │ Col 13 (C-level Y/N)                     │ 20            │ Yes → full; No → 0                                             │
     ├─────────────┼──────────────────────────────────────────┼───────────────┼────────────────────────────────────────────────────────────────┤
     │ years       │ Col 17 (years bucket)                    │ 15            │ less than 5 → 0.4, 5-10 → 0.75, more than 10 → 1.0, × weight   │
     ├─────────────┼──────────────────────────────────────────┼───────────────┼────────────────────────────────────────────────────────────────┤
     │ experience  │ Col 11 (multi-select areas) + Col 12     │ 15            │ Count of selected areas capped at 5, plus presence of detail   │
     │             │ (detail)                                 │               │ text                                                           │
     ├─────────────┼──────────────────────────────────────────┼───────────────┼────────────────────────────────────────────────────────────────┤
     │ seniority   │ Col 15 (position title)                  │ 10            │ Keyword match: founder/ceo/cto/coo/vp/director/head → tiered   │
     │             │                                          │               │ score                                                          │
     ├─────────────┼──────────────────────────────────────────┼───────────────┼────────────────────────────────────────────────────────────────┤
     │ linkedin    │ Col 8                                    │ 10            │ Valid URL → full; handle only → half; blank → 0                │
     ├─────────────┼──────────────────────────────────────────┼───────────────┼────────────────────────────────────────────────────────────────┤
     │ cv          │ Col 22                                   │ 5             │ Present → full; blank → 0                                      │
     ├─────────────┼──────────────────────────────────────────┼───────────────┼────────────────────────────────────────────────────────────────┤
     │ Total       │                                          │ 100           │ stage1.pass = total ≥ threshold (default threshold = 50)       │
     └─────────────┴──────────────────────────────────────────┴───────────────┴────────────────────────────────────────────────────────────────┘

     Stage 2 — C-Suite category fit (CEO / CTO / COO, 0–100 each)

     Each category has its own keyword/phrase dictionary + weight profile. An advisor's three scores are computed independently; primary =
     argmax.

     ┌──────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     ┐
     │ Category │                                                      Signals (examples)
     │
     ├──────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     ┤
     │ CEO      │ Strategic Planning, Business Advisory, Sales, Fundraising, Board experience, Founder/CEO titles, C-level details mentioning
     │
     │          │ strategy/fundraising/exits
     │
     ├──────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     ┤
     │ CTO      │ Engineering, Product Management, tech specializations, Tech rating ≥ 4, CTO/VP Engineering titles
     │
     ├──────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     ┤
     │ COO      │ HR and Talent Management, Financial Management, Legal Advisory, Health Management, operations keywords, COO/VP Ops titles
     │
     └──────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     ┘

     Only advisors with stage1.pass are categorized (others are marked "unqualified"). Ties break toward the highest raw-signal count.

     Configurability

     Everything above — thresholds, weights, category dictionaries, seniority keywords, years-bucket multipliers — lives as JSON in the Config
     tab of the backend sheet and is editable via ConfigPanel (admin-only UI), with a live preview that recomputes a sample of advisors as
     sliders move. Changes are audited to ActivityLog. A "Reset to defaults" button restores src/config/scoring.ts.

     Where it appears in the UI

     - Dashboard: category distribution (CEO/CTO/COO/Unqualified) with counts and passed %.
     - Pipeline cards: primary category pill + Stage 1 score ring.
     - DetailModal: full score breakdown — every signal, its raw value, its contribution, and the three category scores with dictionary-hit
     highlights.
     - Filters: filter by primary category, by Stage 1 pass/fail, by score range.
     - Re-score on config change: next poll recomputes; stale scores flagged until refresh.

     The existing HTML tool has a working version of this logic (Advisor Pipeline Tool.html lines ~170–280). It will be ported into
     src/utils/scoring.ts and src/config/scoring.ts, then wired to read weights from the Config tab instead of constants.

     Architecture

     Google Form  ──▶  Responses Sheet  ──(read-only, Sheets API)──▶  Advisors Tool
                                                                          │
                                                                          ▼
                                                                Backend Sheet (write)
                                                                ├─ Config
                                                                ├─ Tracker
                                                                ├─ FollowUps
                                                                ├─ ActivityLog
                                                                ├─ Comments
                                                                └─ Team

     Polling (30 s, like selection-tool) refreshes both the Responses Sheet and the backend state; user edits write immediately and re-fetch to
     confirm.

     Responses Sheet (read-only source)

     - Sheet tab: Form Responses 1 (Google Forms default; configurable via Config).
     - Row identity: derived from Timestamp + Email (same compound key the current tool uses via parseGoogleTs → id).
     - Column mapping (indices refer to the CSV):

     ┌──────────────────────┬─────────────────┬─────────────────────┐
     │     Sheet column     │   Tool field    │        Notes        │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 1 Timestamp          │ timestamp / id  │ Compound with email │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 3 Full Name          │ name            │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 4 Gender             │ gender          │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 5 Country            │ country         │ Arabic tolerated    │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 6 Email              │ email           │ Used in compound id │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 7 WhatsApp           │ whatsapp        │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 8 LinkedIn           │ linkedin        │ URL or handle       │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 9 Tech rating        │ techRating      │ 1–5, scoring input  │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 10 Ecosystem rating  │ ecoRating       │ 1–5, scoring input  │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 11 Experience in     │ expAreas        │ Multi-select        │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 12 Experience detail │ expDetail       │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 13 C-level Y/N       │ cLevel          │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 14 C-level detail    │ cLevelDetail    │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 15 Position          │ position        │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 16 Employer          │ employer        │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 17 Years             │ years           │ Bucket              │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 18 Non-tech subjects │ nonTechSubjects │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 19 GSG past          │ gsgPast         │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 20 Paid/volunteer    │ paidOrVol       │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 21 Hourly rate       │ hourlyRate      │ Free text           │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 22 CV                │ cvLink          │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 23 Notes             │ notes           │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 24 Heard from        │ heardFrom       │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 25 Opportunities     │ opportunities   │                     │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 26 Support in        │ supportIn       │ Sparse              │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 27 Support via       │ supportVia      │ Sparse              │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 28 Tech specs        │ techSpecs       │ Sparse              │
     ├──────────────────────┼─────────────────┼─────────────────────┤
     │ 32 Newsletter        │ newsletter      │ Sparse              │
     └──────────────────────┴─────────────────┴─────────────────────┘

     Columns 29–31 are empty form artifacts and dropped. Parsing uses the first header row as field keys and tolerates trailing blanks. Stage-1
     and Stage-2 scores are computed client-side from these fields using logic lifted from the existing HTML (lines ~170–280);
     weights/thresholds live in the Config tab so they can be tuned without a code change.

     Backend Sheet (write target) — schema

     Auto-provisioned on first run. Each tab has a bold gray-bg header row and sensible column widths.

     Config (key/value — all scoring is driven from here)

     ┌─────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────┐
     │                   key                   │                                             value                                             │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ responsesSheetId                        │ string                                                                                        │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ responsesTabName                        │ Form Responses 1                                                                              │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ stale_days                              │ 14                                                                                            │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ stage1_threshold                        │ 50                                                                                            │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ stage1_weights                          │ JSON: {tech_rating, eco_rating, clevel, years, experience, seniority, linkedin, cv} summing   │
     │                                         │ to 100                                                                                        │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ years_multipliers                       │ JSON: {"less than 5": 0.4, "5-10": 0.75, "more than 10": 1.0}                                 │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ seniority_tiers                         │ JSON: ordered list of {keyword, score} pairs (founder/ceo/vp/director/head/manager…)          │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ category_ceo / category_cto /           │ JSON: {keywords: string[], areaWeights: {area: weight}, titleBoost: number, techRatingBias:   │
     │ category_coo                            │ number}                                                                                       │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ category_tiebreaker                     │ string — "raw_signal_count" | "ceo_first" | etc.                                              │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ team_emails                             │ JSON array of authorized editor emails                                                        │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ domain_allowlist                        │ gazaskygeeks.com                                                                              │
     ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
     │ schema_version                          │ integer; used by the auto-migrator                                                            │
     └─────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────┘

     Tracker (one row per advisor)

     advisorId, status, assignee, receivedAck, introScheduled, assessmentDate, decisionDate, notes, lastAction, updatedBy, updatedAt
     - Upsert by advisorId.
     - status is one of the 10 existing statuses (new, acknowledged, allocated, intro_sched, intro_done, assessment, approved, rejected,
     matched, on_hold).

     FollowUps (append-only list)

     id, advisorId, dueDate, type, assignee, status (open/done/snoozed), notes, createdBy, createdAt, completedAt
     - Powers the Alerts view's reminder list and a new FollowUps view.

     ActivityLog (append-only, immutable audit)

     timestamp, userEmail, advisorId, action, field, oldValue, newValue, details
     - Replaces the in-memory history[] on each advisor with a durable, queryable log.

     Comments (append-only, threaded)

     id, advisorId, parentId (nullable), userEmail, createdAt, body, resolved
     - Mirrors the selection-tool's comment pattern so reviewers can discuss cases.

     Team (roster of editors)

     email, name, role, active
     - Seeded from the current TEAM constant (10 names). Used to populate assignee dropdowns. Editing restricted to admin role.

     Project tree (new files under /Users/zaidsalem/Zlab/Advisors/)

     Advisors/
     ├── index.html                    # Vite entry (moved/renamed from existing .html is NOT kept)
     ├── package.json / vite.config.ts / tsconfig.json / netlify.toml
     ├── .env.example                  # VITE_GOOGLE_CLIENT_ID, VITE_BACKEND_SHEET_ID, VITE_RESPONSES_SHEET_ID
     ├── public/
     │   └── favicon, etc.
     ├── apps-script/
     │   └── Code.gs                   # optional fallback endpoints; primary path is direct Sheets API
     ├── src/
     │   ├── main.tsx
     │   ├── App.tsx                   # AuthProvider > DataProvider > FilterProvider > ToastProvider > AppShell
     │   ├── types.ts                  # Advisor, TrackerRow, FollowUp, Activity, Comment, Config
     │   ├── config/
     │   │   ├── team.ts               # seed TEAM (10 names) + domain allowlist
     │   │   ├── statuses.ts           # 10 statuses + color tokens (from HTML line 149-160)
     │   │   └── scoring.ts            # default stage1 / stage2 weights
     │   ├── contexts/
     │   │   ├── AuthContext.tsx       # port from selection-tool, swap domain env var
     │   │   ├── DataContext.tsx       # advisors, tracker, followUps, activity, comments, team, config
     │   │   └── FilterContext.tsx     # port as-is
     │   ├── services/
     │   │   ├── auth.ts               # GIS OAuth + token refresh (port from selection-tool)
     │   │   ├── sheets.ts             # READ: responses, tracker, followUps, activity, comments, team, config
     │   │   │                         # WRITE: upsertTracker, appendFollowUp, completeFollowUp,
     │   │   │                         #        appendActivity, appendComment, updateConfig
     │   │   └── provisioner.ts        # NEW — createMissingTabs(), writeHeaders(), migrateSchema()
     │   ├── utils/
     │   │   ├── scoring.ts            # port stage1/stage2 logic from HTML
     │   │   ├── csv.ts                # keep existing CSV export path
     │   │   └── date.ts               # todayISO, daysBetween, fmtDate, parseGoogleTs
     │   ├── components/
     │   │   ├── AppShell.tsx          # top nav, auth chip, export button
     │   │   ├── DashboardView.tsx     # port from HTML lines 520-648
     │   │   ├── PipelineView.tsx      # port from HTML lines 649-788
     │   │   ├── TrackerView.tsx       # port from HTML lines 789-895, now writes to Sheets
     │   │   ├── AlertsView.tsx        # port + wire to FollowUps tab
     │   │   ├── FollowUpsView.tsx     # NEW — due-today/overdue/snoozed lists, create/complete
     │   │   ├── ActivityView.tsx      # NEW — live audit log, filterable by advisor/user
     │   │   ├── DetailModal.tsx       # port, add Comments thread + Activity tail
     │   │   ├── ConfigPanel.tsx       # NEW — edit scoring weights, team, thresholds (admin only)
     │   │   ├── AdvisorCard.tsx / FilterBar.tsx / ScoreRing.tsx / StatusBadge.tsx / StaleFlag.tsx
     │   │   └── Toast.tsx / ConfirmDialog.tsx
     │   └── styles/
     │       └── globals.css           # port CSS variables (brand-primary #DE6336 etc.) and custom classes

     Key modules to port from /Users/zaidsalem/selection-tool/

     ┌──────────────────────────────────────────┬────────────────────────┬─────────────────────────────────────────────────────────────────────┐
     │           From selection-tool            │    To advisors tool    │                               Changes                               │
     ├──────────────────────────────────────────┼────────────────────────┼─────────────────────────────────────────────────────────────────────┤
     │ src/services/auth.ts                     │ src/services/auth.ts   │ Swap OAuth domain env var; scope stays spreadsheets +               │
     │                                          │                        │ drive.readonly                                                      │
     ├──────────────────────────────────────────┼────────────────────────┼─────────────────────────────────────────────────────────────────────┤
     │ src/services/sheets.ts (sheetsRequest,   │ src/services/sheets.ts │ New action set (advisors/tracker/followups/activity/comments);      │
     │ token refresh, polling helpers)          │                        │ reuse error/CORS/429 handling                                       │
     ├──────────────────────────────────────────┼────────────────────────┼─────────────────────────────────────────────────────────────────────┤
     │ src/contexts/AuthContext.tsx             │ same                   │ Drop-in                                                             │
     ├──────────────────────────────────────────┼────────────────────────┼─────────────────────────────────────────────────────────────────────┤
     │ src/contexts/FilterContext.tsx           │ same                   │ Drop-in                                                             │
     ├──────────────────────────────────────────┼────────────────────────┼─────────────────────────────────────────────────────────────────────┤
     │ src/contexts/DataContext.tsx             │ adapt                  │ Replace companies/scores/votes/interviews with                      │
     │                                          │                        │ advisors/tracker/followUps/activity/comments/config/team            │
     ├──────────────────────────────────────────┼────────────────────────┼─────────────────────────────────────────────────────────────────────┤
     │ netlify.toml, vite.config.ts,            │ same                   │ Rename, bump deps if needed                                         │
     │ tsconfig.json, package.json              │                        │                                                                     │
     ├──────────────────────────────────────────┼────────────────────────┼─────────────────────────────────────────────────────────────────────┤
     │ Toast/confirm UI primitives              │ same                   │                                                                     │
     └──────────────────────────────────────────┴────────────────────────┴─────────────────────────────────────────────────────────────────────┘

     Auto-provisioner (src/services/provisioner.ts)

     On auth success, the DataContext calls ensureBackendSchema(backendSheetId) which:
     1. Fetches spreadsheets.get for sheet metadata.
     2. For each required tab missing, issues batchUpdate with addSheet + a follow-up values.update for its header row (bold, gray background).
     3. Reads Config!schema_version; if lower than SCHEMA_VERSION constant, runs ordered migrations (simple column adds).
     4. Seeds Team, Config defaults from src/config/* on first provision only.
     5. Never destructive — all operations are additive / idempotent.

     Feature migration checklist

     ┌─────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────┐
     │               Current behavior (HTML)               │                                   New behavior                                    │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
     │ Advisor data from embedded JSON                     │ Fetched from Responses Sheet each poll, keyed by compound id                      │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
     │ Tracker in localStorage                             │ Tracker tab, upsert by advisorId, edits attributed via OAuth identity             │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
     │ history[] inside tracker object                     │ Append to ActivityLog on every write                                              │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
     │ Acknowledgment checkbox                             │ Still writes receivedAck in Tracker; also logs to ActivityLog                     │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
     │ Notes textarea                                      │ Tracker notes field; comments thread adds per-user discussion                     │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
     │ Stage1 / Stage2 scoring (fixed in code)             │ utils/scoring.ts reads weights + category dictionaries from Config tab;           │
     │                                                     │ ConfigPanel lets admins tune live                                                 │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
     │ Categorization into CEO / CTO / COO (hardcoded      │ Fully configurable from the UI: keywords, area weights, title boosts, tiebreaker  │
     │ constants)                                          │ — all stored in Config                                                            │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
     │ CSV export (16 cols)                                │ Retained; generated client-side over current advisors + tracker join              │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
     │ Filters (stage/category/status/assignee)            │ Retained; filter context identical                                                │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
     │ 4 views (Dashboard/Pipeline/Tracker/Alerts)         │ Add 2: FollowUps, Activity; gate ConfigPanel behind admin role                    │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
     │ No reminder system                                  │ FollowUps tab with due-date sort, stale detection, snooze, complete               │
     └─────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────┘

     Config / environment

     .env.example
     VITE_GOOGLE_CLIENT_ID=
     VITE_RESPONSES_SHEET_ID=
     VITE_BACKEND_SHEET_ID=
     VITE_DOMAIN_ALLOWLIST=gazaskygeeks.com
     VITE_APP_TITLE="Advisor Pipeline"

     OAuth scopes: https://www.googleapis.com/auth/spreadsheets + drive.readonly (needed to resolve CV Drive links).

     Implementation phases

     1. Scaffold — copy selection-tool boilerplate into Advisors/, strip selection-specific code, set up Vite/TS/Tailwind, get "Hello world"
     loading on npm run dev.
     2. Auth — port AuthContext + services/auth.ts; verify sign-in with domain gate.
     3. Provisioner — implement ensureBackendSchema; manually point VITE_BACKEND_SHEET_ID at a fresh sheet and confirm all 6 tabs + headers +
     defaults appear.
     4. Responses read + scoring engine — implement fetchAdvisors(); confirm 482 rows parse and compound id matches the current HTML tool's ids.
      Port utils/scoring.ts + src/config/scoring.ts defaults, load weights/dictionaries from Config tab, verify Stage 1 totals and CEO/CTO/COO
     category scores match the current HTML tool on a sample of 20 advisors.
     5. Tracker write — implement upsert + ActivityLog append; wire TrackerView inline editors; confirm round-trip survives reload.
     6. Dashboard / Pipeline / Alerts / DetailModal — port views against the new DataContext.
     7. FollowUps + ActivityView + Comments — new screens.
     8. ConfigPanel — admin-only editor for scoring weights, team roster, thresholds; writes back to Config tab.
     9. Polish — CSS port (brand colors, Tajawal for Arabic), loading states, error toasts for 401/429 (patterns exist in selection-tool).
     10. Deploy — npm run build → Netlify (copy netlify.toml), add OAuth redirect URI.

     Critical files to be modified or created

     - Delete/archive: /Users/zaidsalem/Zlab/Advisors/Advisor Pipeline Tool.html (keep under /archive/ for reference during port).
     - Create: the full tree under src/, apps-script/, plus root config files listed above.
     - Reuse (copy + adapt): every file under /Users/zaidsalem/selection-tool/src/services/ and src/contexts/ as noted.
     - Touch (read-only reference): /Users/zaidsalem/Zlab/Advisors/Advisor Pipeline Tool.html for scoring constants, view markup, and CSS
     variables during the port.

     Existing functions / utilities to reuse

     From the current HTML (port into utils/ / components/):
     - Scoring logic: Advisor Pipeline Tool.html lines ~170–280 (stage1 parts + stage2 category scoring).
     - Date helpers: todayISO, daysBetween, fmtDate, parseGoogleTs.
     - ScoreRing, StatusBadge, CategoryPill, StaleFlag components.
     - STATUSES array (10 states + colors), CATEGORIES, TEAM, STALE_DAYS.

     From selection-tool:
     - sheetsRequest() with token refresh + 429 backoff (services/sheets.ts:40-198).
     - OAuth flow in services/auth.ts (GIS init, domain check, token expiry tracking).
     - Poll orchestration pattern in DataContext.tsx (interval per active view).
     - Toast and ConfirmDialog primitives.

     Verification plan

     1. npm run dev — app loads, sign-in button appears, only @gazaskygeeks.com succeeds.
     2. Point VITE_BACKEND_SHEET_ID at an empty sheet, load app, confirm all 6 tabs are auto-created with correct headers and Config has seeded
     rows.
     3. Point VITE_RESPONSES_SHEET_ID at a copy of the live responses sheet, confirm 482 advisors render with correct Stage 1 pass/fail counts
     matching the current HTML tool (diff computed ids pairwise).
     4. Edit status + assignee + notes on one advisor; reload → values persist; open backend sheet → Tracker row present; ActivityLog has 3 new
     rows (one per field change).
     5. Create a follow-up with due-date today → appears in Alerts view, in FollowUps "Due today", and in backend FollowUps tab.
     6. Add a comment in DetailModal → appears as a row in Comments tab.
     7. Sign in as a second team member → their email is the updatedBy on a fresh edit; ActivityLog shows both users.
     8. Scoring config roundtrip: in ConfigPanel, drop clevel weight from 20 → 0 and bump experience from 15 → 35 → live preview recomputes;
     save → dashboard's CEO/CTO/COO counts shift after next poll; ActivityLog records the change with before/after JSON.
     9. Category dictionary edit: add "operations" to category_coo.keywords → a specific known-advisor's primary flips from CTO to COO in the
     Pipeline view after refresh.
     10. Refresh with no network → app shows offline toast, no data loss on reconnect.
     11. npm run build succeeds; npm run preview serves the built SPA; Netlify deploy from dist/ works.

     Open items (needed before / during implementation)

     - Google Sheet ID for the live Responses Sheet.
     - Google Sheet ID for the backend Sheet (or permission to create one).
     - OAuth Client ID in Google Cloud project (reuse selection-tool's if same org).
     - Confirm @gazaskygeeks.com is the right domain gate for this tool.
     - Final list of admin-role emails (who can edit Config / Team).
     - Whether to archive the existing HTML in-place (/Advisors/archive/) or move it to a sibling folder.

     Out of scope (Phase 2)

     Companies roster, advisor↔company matching engine, committee voting on matches, Calendly scheduling, interview management, and final-cohort
      workflow. The schema above leaves room to add Companies and Matches tabs in a later migration without disturbing Phase 1 data.