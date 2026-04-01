# n8n-nodes-zohodesk — Agent Guide

This document provides all context needed to work on this repository. It covers tooling, architecture, API quirks, and n8n node conventions.

---

## Tooling

Default to **Bun** instead of Node.js.

- `bun run build` — compile TypeScript and copy static assets to `dist/`
- `bun run dev` — watch mode (`tsc --watch`)
- `bun test` — run tests
- `bun install` — install dependencies
- After building, restart n8n with `pm2 restart n8n` (never kill by port — Tailscale funnel shares port 5678)

---

## Architecture Overview

Single-node, resource/operation pattern with 18 resources:

```
src/
  index.ts                              # Entry point (exports node + credential classes)
  credentials/
    ZohoDeskOAuth2Api.credentials.ts    # OAuth2 credential with data center support
  nodes/
    ZohoDesk.node.ts                    # Main node: resources, operations, properties, execute()
    ZohoDeskTrigger.node.ts             # Webhook trigger node
    helpers.ts                          # API helpers, loadOptions, resourceMapping, utilities
    zohoDesk.svg / zohoDesk.png         # Node icons (lowercase — must match `file:zohoDesk.svg`)
    ZohoDesk.node.json                  # Codex file (categories)
    ZohoDeskTrigger.node.json           # Trigger codex file
```

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
- **Tickets:** `entitySkills` excluded from updates. Status fetched dynamically via `/ticketStatuses`.
- **Contracts:** `productId`, `accountId`, `associatedSLAId` excluded from updates (deprecated).
- **Comments:** `isPublic`/`contentType` are tickets-only. Tickets use PATCH, others use PUT.

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
| Assign | PUT | `/tickets/{id}/assignee` |
| Round Robin | (custom logic) | `/tickets/{id}/assignee` |
| Shift Based | (custom logic) | `/tickets/{id}/assignee` |
| Skill Based | (custom logic) | `/tickets/{id}/assignee` |
| Get Metrics | GET | `/tickets/{id}/metrics` |
| Mark as Read | POST | `/tickets/{id}/markAsRead` |
| Mark as Unread | POST | `/tickets/{id}/markAsUnRead` |
| Merge | POST | `/tickets/{id}/merge` |
| Move Department | POST | `/tickets/{id}/move` |
| Share | POST | `/tickets/{id}/share` |
| Split | POST | `/tickets/{id}/threads/{threadId}/split` |

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

Create uses multipart `formData` — bypasses `zohoApiRequest`, calls `requestOAuth2` directly.

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
bun run build
# Runs: tsc && rsync -a --include='*.png' --include='*.svg' --include='*.json' --exclude='*' src/nodes/ dist/nodes/
```

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
