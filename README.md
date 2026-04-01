# n8n-nodes-zohodesk

Zoho Desk community nodes for [n8n](https://n8n.io/).

![Agentic Workflow](https://github.com/imohanvadivel/n8n-nodes-zoho-desk/raw/main/asset/img1.png)

Provides 19 resources covering tickets, contacts, agents, threads, tags, skills, approvals, time tracking, and more. Also, a webhook trigger for real-time events.

[Installation](#installation) | [Credentials](#credentials) | [Resources](#resources) | [Trigger](#trigger) | [Compatibility](#compatibility) | [License](#license)

---

## Installation

Follow the [n8n community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

In the n8n UI: **Settings > Community Nodes > Install** and enter:

```
n8n-nodes-zohodesk
```

---

## Credentials

This node uses **OAuth2** to authenticate with Zoho Desk. You need to create a Server-based Application in Zoho's API Console and connect it in n8n.

### Step 1: Create a Zoho OAuth Client

1. Go to the [Zoho API Console](https://api-console.zoho.com/)
2. Click **Add Client** and select **Server-based Applications**
3. Fill in the details:
   - **Client Name**: `n8n` (or any name)
   - **Homepage URL**: Your n8n instance URL (e.g. `https://your-n8n.example.com`)
   - **Authorized Redirect URI**: Copy the **OAuth Callback URL** from n8n's credential page (it looks like `https://your-n8n.example.com/rest/oauth2-credential/callback`)
4. Click **Create**
5. Note down the **Client ID** and **Client Secret**

### Step 2: Find Your Organization ID

1. Log in to [Zoho Desk](https://desk.zoho.com)
2. Go to **Setup** (gear icon) > **Developer Space** > **API**
3. Your **Organization ID** (orgId) is displayed at the top

### Step 3: Configure in n8n

1. In n8n, go to **Credentials** > **New Credential** > search for **Zoho Desk OAuth2 API**
2. Fill in:
   - **Client ID** — from Step 1
   - **Client Secret** — from Step 1
   - **Zoho Data Center** — select the region matching your Zoho account:
     | Region | Domain |
     |--------|--------|
     | US | zoho.com |
     | EU | zoho.eu |
     | India | zoho.in |
     | Australia | zoho.com.au |
     | China | zoho.com.cn |
     | Japan | zoho.jp |
   - **Organization ID** — from Step 2
3. Click **Sign in with Zoho** to authorize
4. Click **Save**

The node requests the following scopes automatically:

```
Desk.tickets.ALL    Desk.contacts.ALL     Desk.tasks.ALL
Desk.events.ALL     Desk.calls.ALL        Desk.activities.ALL
Desk.products.ALL   Desk.basic.ALL        Desk.settings.ALL
Desk.search.READ    Desk.custommodule.ALL
```

---

## Resources

### Record

Generic CRUD for any Zoho Desk module (Tickets, Contacts, Accounts, Tasks, Calls, Events, Products, Contracts, and Custom Modules).

| Operation | Description |
|-----------|-------------|
| **Create** | Create a record in any module — fields load dynamically from the module's layout |
| **Get** | Get a single record by ID |
| **Update** | Update a record — fields load dynamically |
| **Delete** | Delete a record (moves to trash) |
| **Search** | Search records with field-level filters, pagination, and sorting |

### Ticket

Ticket-specific operations beyond basic CRUD.

| Operation | Description |
|-----------|-------------|
| **Assign Ticket** | Assign a ticket to an agent or team |
| **Round Robin Assignment** | Assign using round-robin logic (sequential or load-based) |
| **Shift Based Assignment** | Assign based on business hour shifts and agent availability |
| **Skill Based Assignment** | Assign to the best-matching agent based on skills |
| **Get Metrics** | Get response time, resolution time, and other metrics |
| **Mark as Read** | Mark a ticket as read |
| **Mark as Unread** | Mark a ticket as unread |
| **Merge Tickets** | Merge one or more tickets into a target ticket |
| **Move Department** | Move a ticket to a different department |
| **Share Ticket** | Share a ticket with a department |
| **Split Ticket** | Split a thread from a ticket into a new ticket |

### Comment

| Operation | Description |
|-----------|-------------|
| **Add** | Add a comment to a record (Tickets, Tasks, Calls, Events, Contacts, Accounts) |
| **Get All** | Get all comments on a record |
| **Update** | Update an existing comment |
| **Delete** | Delete a comment |

### Thread

Manage ticket conversations (email, social, forum).

| Operation | Description |
|-----------|-------------|
| **Get Thread** | Get a single thread by ID |
| **List Threads** | List all threads on a ticket |
| **List Conversations** | List all conversations (threads + comments) on a ticket |
| **Get Original Content** | Get original mail content with headers |
| **Send Reply** | Send a reply (email, Facebook, Twitter, or forum) |
| **Draft Reply** | Create a draft reply |
| **Update Draft** | Update an existing draft reply |
| **Send for Review** | Send a draft thread for review |

### Ticket Follower

| Operation | Description |
|-----------|-------------|
| **Get Followers** | Get all followers on a ticket |
| **Add Followers** | Add one or more agents as followers |
| **Remove Followers** | Remove one or more followers from a ticket |

### Ticket Attachment

| Operation | Description |
|-----------|-------------|
| **List** | List all attachments on a ticket |
| **Create** | Attach a file to a ticket (from binary input) |
| **Update** | Update attachment visibility |
| **Delete** | Delete an attachment |

### Tag

| Operation | Description |
|-----------|-------------|
| **Add Tag** | Associate one or more tags to a ticket |
| **Remove Tag** | Dissociate one or more tags from a ticket |
| **List All Tags** | List all tags in a department |
| **List Ticket Tags** | List all tags on a ticket |
| **List Tickets by Tag** | List tickets associated with a tag |

### Ticket Approval

| Operation | Description |
|-----------|-------------|
| **List** | List all approvals on a ticket |
| **Create** | Create an approval request on a ticket |
| **Get** | Get details of an approval |
| **Approve/Reject** | Approve or reject a pending approval |

### Ticket Pin

| Operation | Description |
|-----------|-------------|
| **Get Pins** | Get all pinned items on a ticket |
| **Create Pin** | Pin a comment or thread on a ticket |
| **Unpin** | Remove one or more pins from a ticket |

### Time Entry

| Operation | Description |
|-----------|-------------|
| **List** | List all time entries on a ticket |
| **Create** | Create a time entry on a ticket |
| **Get** | Get a time entry by ID |
| **Update** | Update an existing time entry |
| **Delete** | Delete a time entry |
| **Get Summation** | Get total hours/minutes/costs for a ticket |
| **Get by Billing Type** | Get time entries by billing type |

### Email Template

| Operation | Description |
|-----------|-------------|
| **List** | List all email templates |
| **Get** | Get a specific email template |
| **Create** | Create a new email template |
| **Update** | Update an existing email template |
| **Delete** | Delete an email template |

### Skill

Manage skill types and individual skills for skill-based routing.

| Operation | Description |
|-----------|-------------|
| **List Skill Types** | List all skill types in a department |
| **Get Skill Type** | Get details of a skill type |
| **Create Skill Type** | Create a new skill type |
| **Update Skill Type** | Update a skill type |
| **Delete Skill Type** | Delete a skill type |
| **List Skills** | List all skills in a department |
| **Get Skill** | Get details of a skill |
| **Create Skill** | Create a new skill |
| **Update Skill** | Update a skill |
| **Delete Skill** | Delete a skill |

### Agent

| Operation | Description |
|-----------|-------------|
| **List** | List all agents |
| **Get** | Get agent details by ID |
| **Get by Email** | Get agent by email address |
| **Get Count** | Get total agent count |
| **Get My Info** | Get current agent information |
| **Get My Preferences** | Get current agent preferences |
| **Update My Preferences** | Update current agent preferences |
| **Add** | Invite a new agent to your organization |
| **Update** | Update an existing agent |
| **Activate** | Activate one or more agents |
| **Deactivate** | Deactivate an agent |
| **Delete Unconfirmed** | Delete unconfirmed agents |
| **Get Online Agents** | Get list of online agents |
| **Get Offline Agents** | Get list of offline agents |
| **Get Availability** | Get current agent availability |

### Business Hour

| Operation | Description |
|-----------|-------------|
| **List** | List all business hour sets |
| **Get** | Get details of a business hours set |
| **Create** | Create a business hours set (24x7, specific, or custom) |
| **Update** | Update a business hours set |
| **Delete** | Delete a business hours set |

### Holiday List

| Operation | Description |
|-----------|-------------|
| **List** | List all holiday lists |
| **Get** | Get details of a holiday list |
| **Create** | Create a holiday list with month/day picker |
| **Update** | Update a holiday list |
| **Delete** | Delete a holiday list |

### Organisation

| Operation | Description |
|-----------|-------------|
| **Get** | Get details of an organisation |
| **Get All** | List all organisations the current user belongs to |
| **Get Accessible** | List organisations accessible with the current OAuth token |
| **Update** | Update organisation details |

### Profile

| Operation | Description |
|-----------|-------------|
| **List** | List all profiles |
| **Get** | Get details of a specific profile |
| **Clone** | Clone an existing profile |
| **Update** | Update an existing profile |
| **Delete** | Delete a profile |
| **Get Count** | Get the number of profiles configured |
| **List Agents by Profile** | List agents mapped to a profile |
| **Get My Profile** | Get profile details of the current user |
| **Get My Permissions** | Get permissions of the current user's profile |
| **Get Light Agent Profile** | Get permissions configured for the light agent profile |

### Role

| Operation | Description |
|-----------|-------------|
| **List** | List all roles |
| **Get** | Get details of a specific role |
| **Create** | Create a new role |
| **Update** | Update an existing role |
| **Delete** | Delete a role |
| **List Agents by Role** | List agents mapped to a role |
| **Get by IDs** | Get role details by role IDs |
| **Get Personal Role** | Get the personal role configured in your help desk |
| **Get Count** | Get the number of roles configured |

### Dashboard

Analytics and reporting.

| Operation | Description |
|-----------|-------------|
| **Get Tickets Count** | Get total ticket count |
| **Get Count by Field** | Get ticket count grouped by field (status, priority, channel, etc.) |
| **Get Unresolved Count** | Get unresolved/backlog tickets count |
| **Get Created Count** | Get created tickets count |
| **Get Closed Count** | Get closed/solved tickets count |
| **Get On Hold Count** | Get on-hold tickets count |
| **Get Reopened Count** | Get reopened tickets count |
| **Get Response Count** | Get total response count |
| **Get Response Times** | Get response time metrics |
| **Get Resolution Times** | Get resolution time metrics |

---

## Trigger

The **Zoho Desk Trigger** node receives real-time events via webhooks. It supports 11 modules:

| Module | Events |
|--------|--------|
| **Ticket** | Created, Updated, Deleted, Comment/Thread/Attachment/Approval changes |
| **Contact** | Created, Updated, Deleted |
| **Account** | Created, Updated, Deleted |
| **Agent** | Added, Updated, Deleted, Presence/Channel preference changes |
| **Department** | Created, Updated |
| **Task** | Created, Updated, Deleted |
| **Call** | Created, Updated, Deleted |
| **Event** | Created, Updated, Deleted |
| **Time Entry** | Created, Updated, Deleted |
| **Knowledge Base** | Articles, Translations, Feedback, Categories, Sections |
| **Messaging** | Message added, Session/Message status changes |

Features:
- **Previous value tracking** — optionally include field values before the change
- **Specific field tracking** — track changes to up to 5 specific ticket fields
- **Department filtering** — scope events to specific departments
- **Thread direction filtering** — listen for incoming-only or outgoing-only threads

---

## Compatibility

- Tested with n8n version 1.x and above
- Requires Node.js >= 18.10

---

## License

[MIT](LICENSE)
