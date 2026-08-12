# n8n-nodes-zohodesk — Agent Guide

This document provides all context needed to work on this repository. It covers tooling, architecture, API quirks, and n8n node conventions.

---

## Tooling

The toolchain is **`@n8n/node-cli`** (`n8n-node build` / `lint` / `release`), which is what n8n's
community-node verification expects. Tests run on **Bun**; CI installs with **npm** (`package-lock.json`
is the committed lockfile — `npm ci` is what the workflows use).

- `npm run build` — `n8n-node build` (clean, `tsc`, copy icons) plus a copy of the `*.node.json` codex files
- `npm run build:watch` — watch mode (`tsc --watch`)
- `npm run lint` / `npm run lint:fix` — the n8n node linter (eslint 9 flat config)
- `bun test` — run tests
- `npm run release` — cut a release (see "Releasing" below)
- Locally, install with `npm install --ignore-scripts`: `@n8n/node-cli` pulls in `isolated-vm`, which has
  no prebuilt binary for Node 26 and fails to compile. Nothing in build/lint/test loads it. CI pins Node 24,
  where the prebuild exists, so plain `npm ci` works there.
- After building, restart n8n with `pm2 restart n8n` (never kill by port — Tailscale funnel shares port 5678)

---

## Architecture Overview

Single-node, resource/operation pattern with 18 resources. The layout follows n8n's convention:
`nodes/` and `credentials/` at the repo root, one directory per node, icons in `icons/`.

```
index.ts                                  # Entry point (exports node classes)
icons/
  zohoDesk.svg / zohoDesk.dark.svg        # Light and dark node/credential icons
credentials/
  ZohoDeskOAuth2Api.credentials.ts        # OAuth2 credential with data center support
nodes/
  helpers.ts                              # API helpers, loadOptions, resourceMapping, utilities
  resources/                               # Per-resource properties + execute handlers
  ZohoDesk/
    ZohoDesk.node.ts                       # Main node: resources, operations, properties, execute()
    ZohoDesk.node.json                     # Codex file (categories)
    ZohoDesk.node.test.ts
  ZohoDeskTrigger/
    ZohoDeskTrigger.node.ts                # Webhook trigger node
    ZohoDeskTrigger.node.json              # Trigger codex file
    ZohoDeskTrigger.node.test.ts
```

The per-node directories are required by the linter (`node-dirname-against-convention`), and the paths in
`package.json`'s `n8n.nodes` array must match the built output (`dist/nodes/ZohoDesk/ZohoDesk.node.js`).

**Key files:**
- `ZohoDesk.node.ts` — All resources, operations, UI properties, and the `execute()` switch statement
- `helpers.ts` — `zohoApiRequest`, `zohoWebhookRequest`, `zohoLoadOptionsRequest`, `sharedLoadOptions` (27 methods), `sharedResourceMapping` (2 methods), body-building utilities, assignment helpers
- The execute handler uses a `resource:operation` string key in a switch statement to dispatch

---

## Zoho Desk API Quirks & Learnings

### Delete Record

Zoho Desk does NOT support direct `DELETE` for most modules. Deletion uses `POST /{module}/moveToTrash` with module-specific ID field:

| Module | ID Field |
|--------|----------|
| `tickets` | `ticketIds` |
| `contacts` | `contactIds` |
| `accounts` | `accountIds` |
| `contracts` | `contractIds` |
| `products` | `productIds` |
| Custom (`cm_*`) | `recordIds` |
| Others (calls, tasks, events) | `entityIds` |

Value is always an array: `{ "ticketIds": ["12345"] }`.

### Field Types & Mapping

- Type matching must be **case-insensitive** — use `.toLowerCase()` and `.includes('picklist')` to catch `ColoredPicklist`, `MultiselectPicklist`, etc.
- `status` field for tickets often comes back as `DateTime` type (wrong) — code force-overrides to `Picklist`
- `allowedValues` come from **layout API by specific ID** (`/layouts/{id}`), NOT from `/fields` or `/organizationFields`
- When field has type `Text` but has `allowedValues` from a layout, override to `Picklist`
- Both `LookUp` and `Lookup` casings appear in the API

### Date/Time Formatting

- Full ISO datetime (`2026-03-27T00:00:00.000Z`): Required for `dueDate`, `startTime`, `endTime`, `completedTime`
- Date-only (`2026-03-27`): Other fields ending in "Date"
- `processFieldValue()` in helpers.ts handles this automatically

### Lookup Fields

Resolved to dropdown options via `LOOKUP_ENDPOINTS` map in helpers.ts:

| Field Pattern | Endpoint |
|--------------|----------|
| `contactId` | `/contacts` |
| `accountId` | `/accounts` |
| `assigneeId`, `ownerId` | `/agents` |
| `ticketId` | `/tickets` |
| `productId` | `/products` |
| Fields matching `/owner/i` | `/agents` (auto) |
| Fields matching `/ticket/i` | `/tickets` (auto for custom modules) |

Custom modules (`cm_*`) wrap owner fields as `{ owner: { id: value } }`.

### Search API

- Module-specific: `GET /{module}/search` with field-specific query params
- `contracts` has NO search endpoint
- Custom modules (`cm_*`) only support time-range filters
- `_all=true` conflicts with field-specific filters
- Returns **204 No Content** when no results — handle gracefully
- Wildcard `*value*` only works for specific fields in tickets/contacts; others only support `value*`

### Custom Modules

Identified by `cm_` prefix:
- Department: `{ department: { id: "..." } }` instead of `{ departmentId: "..." }`
- Layout: `{ layout: { id: "..." } }` instead of `{ layoutId: "..." }`
- Owner: `{ owner: { id: "..." } }`
- Custom fields (`cf_`) grouped under `cf` key in body

### Department & Layout Handling

**Department:** Most modules use `{ departmentId }`, products use `{ departmentIds: [...] }`, custom modules use `{ department: { id } }`, contacts/accounts don't need department.

**Layout:** Tickets/contacts/accounts/tasks/products use `{ layoutId }`, custom modules use `{ layout: { id } }`, other modules don't send layout.

### Module-Specific Quirks

- **Calls/Events:** `direction` field wrongly typed — override to Picklist. `startTime`/`duration` not in layout API but required — inject as extra fields.
- **Tickets:** `entitySkills` excluded from updates; on GET (`include=skills`) it is an array of skill-ID **strings**, not objects. Status fetched dynamically via `/ticketStatuses`.
- **Contracts:** `productId`, `accountId`, `associatedSLAId` excluded from updates (deprecated).
- **Comments:** `isPublic`/`contentType` are tickets-only. Tickets use PATCH, others use PUT.
- **Pins:** create takes `type` in UPPERCASE (`COMMENTS`/`THREADS`); list takes `types` in lowercase (`comments,threads`). Both casings verified against the OAS.
- **Email Templates:** `fromId` is the support email **address** string (OAS pattern is an email regex), not a numeric ID, despite the name.

---

## Resources & Operations

### Record (Generic CRUD)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create | POST | `/{module}` |
| Get | GET | `/{module}/{id}` |
| Update | PATCH | `/{module}/{id}` |
| Delete | POST | `/{module}/moveToTrash` |
| Search | GET | `/{module}/search` |

Uses `resourceMapper` for dynamic field loading from Zoho's layout API.

### Ticket

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Assign | PATCH | `/tickets/{id}` with `assigneeId`/`teamId` in body |
| Round Robin | (custom logic) | `PATCH /tickets/{id}` |
| Shift Based | (custom logic) | `PATCH /tickets/{id}` |
| Skill Based | (custom logic) | `PATCH /tickets/{id}` |
| Get Metrics | GET | `/tickets/{id}/metrics` |
| Mark as Read | POST | `/tickets/{id}/markAsRead` |
| Mark as Unread | POST | `/tickets/{id}/markAsUnRead` |
| Merge | POST | `/tickets/{id}/merge` |
| Move Department | POST | `/tickets/{id}/move` |
| Share | PATCH | `/tickets/{id}` with `sharedDepartments: [{id, type}]` |
| Split | POST | `/tickets/{id}/threads/{threadId}/split` |

There is NO dedicated `/assignee` or `/share` endpoint (verified against the OAS). Assignment and
sharing go through the ticket PATCH: `assigneeId` and `sharedDepartments` (`type` enum:
`READ_ONLY`/`READ_WRITE`/`RESTRICTED_ACCESS`) are writable body fields. Note: the OAS lists
`teamId` only in responses, but ticket update accepts it in practice.

### Comment

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Add | POST | `/{module}/{id}/comments` |
| Get All | GET | `/{module}/{id}/comments` |
| Update | PATCH/PUT | `/{module}/{id}/comments/{commentId}` |
| Delete | DELETE | `/{module}/{id}/comments/{commentId}` |

Supported modules: tickets, tasks, calls, events, contacts, accounts.

### Thread

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get Thread | GET | `/tickets/{id}/threads/{threadId}` |
| List Threads | GET | `/tickets/{id}/threads` |
| List Conversations | GET | `/tickets/{id}/conversations` |
| Get Original Content | GET | `/tickets/{id}/threads/{threadId}/originalContent` |
| Send Reply | POST | `/tickets/{id}/sendReply` |
| Draft Reply | POST | `/tickets/{id}/draftReply` |
| Update Draft | PATCH | `/tickets/{id}/draftReply/{threadId}` |
| Send for Review | POST | `/tickets/{id}/threads/{threadId}/sendForReview` |

### Ticket Follower

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get Followers | GET | `/tickets/{id}/followers` |
| Add Followers | POST | `/tickets/{id}/addFollowers` |
| Remove Followers | POST | `/tickets/{id}/removeFollowers` |

### Ticket Attachment

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List | GET | `/tickets/{id}/attachments` |
| Create | POST | `/tickets/{id}/attachments` |
| Update | PATCH | `/tickets/{id}/attachments/{attachmentId}` |
| Delete | DELETE | `/tickets/{id}/attachments/{attachmentId}` |

Create is a multipart upload (native `FormData` body) — bypasses `zohoApiRequest`, calls `httpRequestWithAuthentication` directly.

### Tag

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List All | GET | `/ticketTags` |
| List Ticket Tags | GET | `/tickets/{id}/tags` |
| Add Tag | POST | `/tickets/{id}/associateTag` |
| Remove Tag | POST | `/tickets/{id}/dissociateTag` |
| List by Tag | GET | `/tags/{tagId}/tickets` |

Tags identified by **name** for add/remove, by **ID** for list-by-tag.

### Ticket Approval

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List | GET | `/tickets/{id}/approvals` |
| Create | POST | `/tickets/{id}/approvals` |
| Get | GET | `/tickets/{id}/approvals/{approvalId}` |
| Approve/Reject | PATCH | `/tickets/{id}/approvals/{approvalId}` |

### Ticket Pin

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get Pins | GET | `/tickets/{id}/pins` |
| Create Pin | POST | `/tickets/{id}/pins` |
| Unpin | POST | `/tickets/{id}/pins/unpin` |

### Time Entry

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List | GET | `/tickets/{id}/timeEntry` |
| Create | POST | `/tickets/{id}/timeEntry` |
| Get | GET | `/tickets/{id}/timeEntry/{entryId}` |
| Update | PATCH | `/tickets/{id}/timeEntry/{entryId}` |
| Delete | DELETE | `/tickets/{id}/timeEntry/{entryId}` |
| Get Summation | GET | `/tickets/{id}/timeEntrySummation` |
| Get by Billing Type | GET | `/tickets/{id}/timeEntryByBillingType` |

### Skill

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List Skill Types | GET | `/skillTypes` |
| Get/Create/Update/Delete Skill Type | GET/POST/PATCH/DELETE | `/skillTypes/{id}` |
| List Skills | GET | `/skills` |
| Get/Create/Update/Delete Skill | GET/POST/PATCH/DELETE | `/skills/{id}` |

### Agent

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List | GET | `/agents` |
| Get | GET | `/agents/{id}` |
| Get by Email | GET | `/agents?searchStr={email}` |
| Get Count | GET | `/agents/count` |
| Get My Info | GET | `/myinfo` |
| Get/Update Preferences | GET/PATCH | `/myPreferences` |
| Add | POST | `/agents` |
| Update | PATCH | `/agents/{id}` |
| Activate | POST | `/agents/activate` |
| Deactivate | POST | `/agents/{id}/deactivate` |
| Delete Unconfirmed | POST | `/agents/deleteUnconfirmed` |
| Get Online/Offline | GET | `/onlineAgents` / `/offlineAgents` |
| Get Availability | GET | `/agentAvailability` |

### Business Hour, Holiday List, Email Template

Standard CRUD (List/Get/Create/Update/Delete) on `/businessHours`, `/holidayList`, `/templates`.

### Organisation

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get | GET | `/organizations/{id}` |
| Get All | GET | `/organizations` |
| Get Accessible | GET | `/accessibleOrganizations` |
| Update | PATCH | `/organizations/{id}` |

Note: UI says "Organisation" but API endpoint uses "organizations" (American spelling).

### Profile

Standard CRUD plus: Clone (`POST /profiles/{id}/clone`), Get Count, List Agents by Profile, Get My Profile/Permissions, Get Light Agent Profile. Delete is `POST /profiles/{id}/delete` with `transferToProfileId`.

### Role

Standard CRUD plus: List Agents by Role, Get by IDs (`/rolesByIds`), Get Personal Role (`/personalRole`), Get Count. Delete is `POST /roles/{id}/delete` with `transferToRoleId`.

### Dashboard (Ticket Metrics)

All use GET on `/ticketsCount`, `/ticketsCountByFieldValues`, or `/dashboards/{metric}`.

---

## n8n Node Development Notes

### Key Conventions

- `displayOptions` with `show`/`hide` controls field visibility
- `noDataExpression: true` prevents expression mode on dropdowns
- `usableAsTool: true` enables AI tool-use workflows
- Department hidden for contacts/accounts and get/delete/search ops
- Layout only shown for create operations
- `collection` type does NOT support `displayOptions` on individual items

### resourceMapper

- `getLayoutFieldMapping` — For create: fields from specific layout, merged with module + org fields
- `getUpdateFieldMapping` — For update: fields from ALL layouts (each by ID for `allowedValues`)
- `mode: 'add'`, `supportAutoMap: false`
- Create: `addAllFields: true`; Update: `addAllFields: false`

### Build Process

```bash
npm run build
# Runs: n8n-node build  (rimraf dist, tsc, copy **/*.{png,svg})
#   &&  rsync -am --include='*/' --include='*.node.json' --exclude='*' nodes/ dist/nodes/
```

`n8n-node build` copies icons but *not* the `*.node.json` codex files, hence the extra rsync step.

### Common Pitfalls

1. Old `.js` files in `dist/` cause duplicate nodes — clean `dist/` when restructuring
2. `.node.json` codex file must be copied to `dist/` (rsync handles this)
3. Most deletes use `POST /moveToTrash`, not `DELETE`
4. Empty API responses (204, undefined) — always provide fallback: `response || { success: true }`
5. Fields can appear in multiple layout sections — deduplicate with a `Set`
6. System fields (`creatorId`, `modifiedBy`, `id`, etc.) must be excluded from create/update forms
7. Attachment create requires multipart/form-data via `formData`, not JSON `body`
8. Watch endpoint casing: `markAsUnRead` (capital R), `ticketsCountByFieldValues`
9. Response wrapping varies: `{ data: [...] }` vs direct array — handle both
10. Comma-separated IDs: split, trim, filter empty, convert to array

### Credentials

- **Grant type:** Authorization Code
- **Auth URI params:** `access_type=offline&prompt=consent`
- **Scopes:** `Desk.tickets.ALL Desk.contacts.ALL Desk.tasks.ALL Desk.events.ALL Desk.calls.ALL Desk.activities.ALL Desk.products.ALL Desk.basic.ALL Desk.settings.ALL Desk.search.READ Desk.custommodule.ALL`
- **Data centers:** US (.com), EU (.eu), IN (.in), AU (.com.au), CN (.com.cn), JP (.jp)
- **orgId** sent as header on every request
- **Credential test:** `GET /tickets?limit=1`

### Error Handling

Zoho errors parsed from: `error.cause.body`, `error.description`, or regex-extracted JSON from `error.message`. Formatted as: `"ERRORCODE: message (fieldName: errorMessage)"`. Node supports `continueOnFail()` mode.

The formatted message is thrown as a `NodeApiError` (required by the linter's `require-node-api-error`;
plain `Error` loses the HTTP context in the n8n UI). In `execute()`, `NodeApiError` instances are passed
back through `new NodeApiError(...)` and everything else through `new NodeOperationError(...)`: both
constructors return the error untouched when given an instance of their own class, so nothing is
double-wrapped and API failures keep their HTTP code.

---

## Releasing

The package is published to npm **only** from CI, via `.github/workflows/publish.yml`, with an npm
provenance statement — n8n requires this for verified community nodes and rejects packages published
from a local machine. `prepublishOnly` (`n8n-node prerelease`) blocks a stray local `npm publish`.

```bash
npm run release   # from a clean `main` with an upstream set
```

This lints, builds, prompts for the version bump, updates the changelog, commits, tags, and pushes. The
tag push triggers `publish.yml`, which runs lint + build again and publishes with `--provenance`.

One-time npm setup (trusted publisher, so no token is stored) is documented at the top of `publish.yml`.

### Verification notes

- `n8n.strict` is `false` in `package.json` because `eslint.config.mjs` adds one deviation from n8n's
  template: test files are excluded, since their mock contexts use `any`. Every n8n rule, including the
  cloud-support set, still applies in full to all shipped code.
- Verified nodes may not have runtime dependencies — keep `dependencies` empty.
- **The test files must not `import` anything from `bun:test`.** The scanner clones this repository and
  lints the source, and the cloud-only `no-restricted-imports` rule fails any `bun:test` import — a local
  eslint ignore does not help. `describe`, `test`, `expect` and `beforeEach` are Bun globals, and `jest.fn`
  covers the mocks, so no import is needed.
- Check a published version with `npx @n8n/scan-community-package @mohanvadivel/n8n-nodes-zoho-desk`. It
  needs a TTY to print anything; if it exits silently, run its CLI directly:
  `node node_modules/@n8n/scan-community-package/scanner/cli.mjs <package>`. It verifies provenance, then
  lints the GitHub source that the published version's provenance points at — so fixing a violation
  requires publishing a new version, not just pushing a commit.
