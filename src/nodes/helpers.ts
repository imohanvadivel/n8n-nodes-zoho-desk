import type {
	IExecuteFunctions,
	IHookFunctions,
	IWebhookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IDataObject,
	FieldType,
	ResourceMapperFields,
} from 'n8n-workflow';

// ─── Base URL Resolution ────────────────────────────────────────────────────
// The ZohoDeskOAuth2Api credential computes baseUrl from the datacenter field
// (e.g., "com" → "https://desk.zoho.com/api/v1"). We just read it directly.

const DEFAULT_BASE_URL = 'https://desk.zoho.com/api/v1';

function resolveBaseUrl(credentials: IDataObject): string {
	return (credentials.baseUrl as string) || DEFAULT_BASE_URL;
}

// ─── Execute-context API request ────────────────────────────────────────────

export async function zohoApiRequest(
	context: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: Record<string, unknown> = {},
	qs: Record<string, unknown> = {},
) {
	const credentials = await context.getCredentials('zohoDeskOAuth2Api');
	const orgId = credentials.orgId as string;
	const baseUrl = resolveBaseUrl(credentials);

	const options: Record<string, unknown> = {
		method,
		headers: { orgId, 'Content-Type': 'application/json' },
		uri: `${baseUrl}${endpoint}`,
		body,
		json: true,
	};

	if (Object.keys(qs).length) options.qs = qs;
	if (!Object.keys(body).length) {
		delete options.body;
	}

	try {
		return await context.helpers.requestOAuth2.call(context, 'zohoDeskOAuth2Api', options);
	} catch (error: unknown) {
		// Extract Zoho API error details from the response
		const err = error as { message?: string; description?: string; cause?: { body?: unknown } };
		let message = err.message ?? 'Unknown error';

		// Helper to format a parsed Zoho error object
		const formatZohoError = (parsed: Record<string, unknown>): string | null => {
			if (!parsed.message) return null;
			let msg = `${parsed.errorCode ?? 'ERROR'}: ${parsed.message}`;
			if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
				const details = (parsed.errors as Array<Record<string, string>>)
					.map((e) => `${e.fieldName}: ${e.errorMessage || e.errorType}`)
					.join('; ');
				msg += ` (${details})`;
			}
			return msg;
		};

		// Try to parse the error response body for Zoho-specific error details
		try {
			const responseBody = err.cause?.body ?? err.description;
			if (typeof responseBody === 'string') {
				const parsed = JSON.parse(responseBody) as Record<string, unknown>;
				const formatted = formatZohoError(parsed);
				if (formatted) message = formatted;
			} else if (typeof responseBody === 'object' && responseBody !== null) {
				const formatted = formatZohoError(responseBody as Record<string, unknown>);
				if (formatted) message = formatted;
			} else if (typeof message === 'string') {
				// n8n may embed the JSON in the error message like "422 - {...}"
				const jsonMatch = message.match(/\{[\s\S]*"errorCode"[\s\S]*\}/);
				if (jsonMatch) {
					const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
					const formatted = formatZohoError(parsed);
					if (formatted) message = formatted;
				}
			}
		} catch {
			// Could not parse error body — use original message
		}

		throw new Error(message);
	}
}

// ─── LoadOptions-context API request ────────────────────────────────────────

export async function zohoLoadOptionsRequest(
	context: ILoadOptionsFunctions,
	endpoint: string,
	qs: Record<string, unknown> = {},
) {
	const credentials = await context.getCredentials('zohoDeskOAuth2Api');
	const orgId = credentials.orgId as string;
	const baseUrl = resolveBaseUrl(credentials);

	const options: Record<string, unknown> = {
		method: 'GET',
		headers: { orgId },
		uri: `${baseUrl}${endpoint}`,
		json: true,
	};
	if (Object.keys(qs).length) options.qs = qs;

	return context.helpers.requestOAuth2.call(context, 'zohoDeskOAuth2Api', options);
}

// ─── Webhook-context API request (for IHookFunctions / IWebhookFunctions) ───

export async function zohoWebhookRequest(
	context: IHookFunctions | IWebhookFunctions,
	method: string,
	endpoint: string,
	body: Record<string, unknown> = {},
) {
	const credentials = await context.getCredentials('zohoDeskOAuth2Api');
	const orgId = credentials.orgId as string;
	const baseUrl = resolveBaseUrl(credentials);

	const options: Record<string, unknown> = {
		method,
		headers: { orgId, 'Content-Type': 'application/json' },
		uri: `${baseUrl}${endpoint}`,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	try {
		return await context.helpers.requestOAuth2.call(context, 'zohoDeskOAuth2Api', options);
	} catch (error: unknown) {
		const err = error as { message?: string; description?: string; cause?: { body?: unknown } };
		let message = err.message ?? 'Unknown error';

		try {
			const responseBody = err.cause?.body ?? err.description;
			if (typeof responseBody === 'string') {
				const parsed = JSON.parse(responseBody) as Record<string, unknown>;
				if (parsed.message) message = `${parsed.errorCode ?? 'ERROR'}: ${parsed.message}`;
			} else if (typeof responseBody === 'object' && responseBody !== null) {
				const parsed = responseBody as Record<string, unknown>;
				if (parsed.message) message = `${parsed.errorCode ?? 'ERROR'}: ${parsed.message}`;
			} else if (typeof message === 'string') {
				const jsonMatch = message.match(/\{[\s\S]*"errorCode"[\s\S]*\}/);
				if (jsonMatch) {
					const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
					if (parsed.message) message = `${parsed.errorCode ?? 'ERROR'}: ${parsed.message}`;
				}
			}
		} catch {
			// Could not parse — use original message
		}

		// Add helpful hint for common errors
		if (message.includes('INTERNAL_SERVER_ERROR') && method === 'POST' && endpoint === '/webhooks') {
			message += '. Note: Zoho validates the webhook URL by sending a GET request. Ensure your n8n instance is publicly accessible (not localhost).';
		}

		throw new Error(message);
	}
}

// ─── Reusable loadOptions methods ───────────────────────────────────────────

// Factory for department-scoped agent dropdowns (avoids duplicating the same method for each param name)
function agentsByDepartmentLoader(paramName: string) {
	return async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const departmentId = this.getCurrentNodeParameter(paramName) as string | undefined;
		if (!departmentId) return [];
		const response = await zohoLoadOptionsRequest(this, `/departments/${encodeURIComponent(departmentId)}/agents`);
		return (response.data as Array<{ name: string; id: string }>).map((a) => ({
			name: a.name,
			value: a.id,
		}));
	};
}

export const sharedLoadOptions = {
	async getModules(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const response = await zohoLoadOptionsRequest(this, '/organizationModules');
		const modules = (response.data as Array<{ pluralLabel: string; displayLabel: string; apiName: string }>).map((m) => ({
			name: m.pluralLabel || m.displayLabel || m.apiName,
			value: m.apiName,
		}));
		// Exclude modules handled by dedicated resource actions
		return modules.filter((m) => m.value !== 'agents' && m.value !== 'timeEntry');
	},

	async getDepartments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const response = await zohoLoadOptionsRequest(this, '/departments', { isEnabled: true });
		return (response.data as Array<{ name: string; id: string }>).map((d) => ({
			name: d.name,
			value: d.id,
		}));
	},

	async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const response = await zohoLoadOptionsRequest(this, '/agents', { limit: 200 });
		return (response.data as Array<{ name: string; id: string }>).map((a) => ({
			name: a.name,
			value: a.id,
		}));
	},

	async getLayouts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const module = this.getCurrentNodeParameter('module') as string | undefined;
		const qs: Record<string, unknown> = {};
		if (module) qs.module = module;
		const response = await zohoLoadOptionsRequest(this, '/layouts', qs);
		return (response.data as Array<{ layoutName: string; id: string }>).map((l) => ({
			name: l.layoutName,
			value: l.id,
		}));
	},

	async getBusinessHours(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const response = await zohoLoadOptionsRequest(this, '/businessHours', { status: 'ACTIVE', limit: 50 });
		const hours = (response.data ?? response) as Array<{ name: string; id: string }>;
		if (!Array.isArray(hours)) return [];
		return hours.map((h) => ({
			name: h.name,
			value: h.id,
		}));
	},

	getAgentsByDepartmentForShiftAssign: agentsByDepartmentLoader('shiftDepartmentId'),

	async getSkills(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const response = await zohoLoadOptionsRequest(this, '/skills');
		return (response.data as Array<{ name: string; id: string }>).map((s) => ({
			name: s.name,
			value: s.id,
		}));
	},

	async getSupportEmailAddresses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const departmentId = this.getCurrentNodeParameter('templateDepartmentId') as string | undefined;
		if (!departmentId) return [];
		const response = await zohoLoadOptionsRequest(this, '/supportEmailAddress', { departmentId, limit: 100 });
		return (response.data as Array<{ address: string; id: string }>).map((e) => ({
			name: e.address,
			value: e.address,
		}));
	},

	async getTemplateFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const departmentId = this.getCurrentNodeParameter('templateDepartmentId') as string | undefined;
		if (!departmentId) return [];
		try {
			const response = await zohoLoadOptionsRequest(this, '/templates', { departmentId, from: 1, limit: 1000 });
			const templates = ((response.data ?? response ?? []) as Array<{ folder?: { folderName: string; folderId: string } }>);
			if (!Array.isArray(templates)) return [];
			const seen = new Set<string>();
			const folders: INodePropertyOptions[] = [];
			for (const t of templates) {
				if (t.folder && t.folder.folderId && !seen.has(t.folder.folderId)) {
					seen.add(t.folder.folderId);
					folders.push({ name: t.folder.folderName, value: t.folder.folderId });
				}
			}
			return folders;
		} catch {
			return [];
		}
	},

	async getLayoutsByModuleAndDept(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const module = this.getCurrentNodeParameter('module') as string | undefined;
		const departmentId = this.getCurrentNodeParameter('departmentId') as string | undefined;
		const qs: Record<string, unknown> = {};
		if (module) qs.module = module;
		if (departmentId) qs.departmentId = departmentId;
		const response = await zohoLoadOptionsRequest(this, '/layouts', qs);
		return (response.data as Array<{ layoutName: string; id: string }>).map((l) => ({
			name: l.layoutName,
			value: l.id,
		}));
	},

	async getLayoutFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const layoutId = this.getCurrentNodeParameter('layoutId') as string | undefined;
		if (!layoutId) return [];
		const response = await zohoLoadOptionsRequest(this, `/layouts/${encodeURIComponent(layoutId)}`);
		const sections = (response.sections ?? []) as Array<{
			fields: Array<{
				displayLabel: string;
				apiName: string;
				isMandatory?: boolean;
				isCustomField?: boolean;
			}>;
		}>;
		const fields = sections.flatMap((s) => s.fields ?? []);
		// Sort: mandatory fields first, then alphabetical
		const sorted = [...fields].sort((a, b) => {
			if (a.isMandatory && !b.isMandatory) return -1;
			if (!a.isMandatory && b.isMandatory) return 1;
			return (a.displayLabel || a.apiName).localeCompare(b.displayLabel || b.apiName);
		});
		return sorted.map((f) => ({
			name: f.isMandatory
				? `* ${f.displayLabel || f.apiName} (required)`
				: f.displayLabel || f.apiName,
			value: f.apiName,
		}));
	},

	getAgentsByDepartment: agentsByDepartmentLoader('departmentId'),

	async getTeamsByDepartment(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const departmentId = this.getCurrentNodeParameter('assignDepartmentId') as string | undefined;
		if (!departmentId) return [];
		const response = await zohoLoadOptionsRequest(this, `/departments/${encodeURIComponent(departmentId)}/teams`);
		const teams = (response.teams ?? response.data ?? response) as Array<{ name: string; id: string }>;
		if (!Array.isArray(teams)) return [];
		return teams.map((t) => ({
			name: t.name,
			value: t.id,
		}));
	},

	getAgentsByDepartmentForAssign: agentsByDepartmentLoader('assignDepartmentId'),
	getAgentsByDepartmentForRoundRobin: agentsByDepartmentLoader('rrDepartmentId'),
	getAgentsByDepartmentForSkillAssign: agentsByDepartmentLoader('sbaDepartmentId'),

	async getAgentsByTeam(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const teamId = this.getCurrentNodeParameter('assignTeamId') as string | undefined;
		if (!teamId) return [];
		const response = await zohoLoadOptionsRequest(this, `/teams/${encodeURIComponent(teamId)}/members`);
		const members = (response.members ?? response.data ?? response) as Array<{ firstName?: string; lastName?: string; id: string }>;
		if (!Array.isArray(members)) return [];
		return members.map((m) => ({
			name: [m.firstName, m.lastName].filter(Boolean).join(' ') || String(m.id),
			value: m.id,
		}));
	},

	async getModuleFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const module = this.getCurrentNodeParameter('module') as string | undefined;
		if (!module) return [];
		const response = await zohoLoadOptionsRequest(this, '/fields', { module });
		const fields = (response.data ?? response) as Array<{ displayLabel: string; apiName: string }>;
		return fields.map((f) => ({
			name: f.displayLabel || f.apiName,
			value: f.apiName,
		}));
	},

	async getContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const response = await zohoLoadOptionsRequest(this, '/contacts', { limit: 100 });
			const records = (response?.data ?? response ?? []) as Array<Record<string, unknown>>;
			if (!Array.isArray(records)) return [];
			return records.map((r) => ({
				name: [r.firstName, r.lastName].filter(Boolean).join(' ') || String(r.id),
				value: String(r.id),
			}));
		} catch { return []; }
	},

	async getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const response = await zohoLoadOptionsRequest(this, '/accounts', { limit: 100 });
			const records = (response?.data ?? response ?? []) as Array<Record<string, unknown>>;
			if (!Array.isArray(records)) return [];
			return records.map((r) => ({
				name: (r.accountName as string) || String(r.id),
				value: String(r.id),
			}));
		} catch { return []; }
	},

	async getProducts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const response = await zohoLoadOptionsRequest(this, '/products', { limit: 100 });
			const records = (response?.data ?? response ?? []) as Array<Record<string, unknown>>;
			if (!Array.isArray(records)) return [];
			return records.map((r) => ({
				name: (r.productName as string) || String(r.id),
				value: String(r.id),
			}));
		} catch { return []; }
	},

	async getStatusOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const module = this.getCurrentNodeParameter('module') as string | undefined;
		if (!module) return [];
		// Try to get statuses from ticketStatuses API
		if (module === 'tickets') {
			try {
				const departmentId = this.getCurrentNodeParameter('departmentId') as string | undefined;
				const qs: Record<string, unknown> = {};
				if (departmentId) qs.departmentId = departmentId;
				const response = await zohoLoadOptionsRequest(this, '/ticketStatuses', qs);
				const statuses = (response?.data ?? response ?? []) as Array<{ name: string }>;
				if (Array.isArray(statuses) && statuses.length > 0) {
					return statuses.map((s) => ({ name: s.name, value: s.name }));
				}
			} catch { /* fall through */ }
		}
		// Fallback: hardcoded statuses per module
		const STATUS_OPTIONS: Record<string, string[]> = {
			tickets: ['Open', 'On Hold', 'Escalated', 'Closed'],
			tasks: ['Not Started', 'In Progress', 'Completed', 'Deferred', 'Waiting for someone'],
			calls: ['Completed', 'Scheduled', 'Current call'],
			events: ['Planned', 'Held', 'Not Held', 'Completed'],
		};
		const vals = STATUS_OPTIONS[module] ?? [];
		return vals.map((v) => ({ name: v, value: v }));
	},

	async getPriorityOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		// Priorities are generally the same across modules
		const priorities = ['Low', 'Medium', 'High', 'Urgent'];
		return priorities.map((v) => ({ name: v, value: v }));
	},

	async getChannelOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const channels = ['Phone', 'Email', 'Chat', 'Forums', 'Feedback Widget', 'Twitter', 'Facebook', 'Web'];
		return channels.map((v) => ({ name: v, value: v }));
	},

	async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			// Fetch tags from all departments
			const deptResponse = await zohoLoadOptionsRequest(this, '/departments');
			const departments = (deptResponse?.data ?? deptResponse ?? []) as Array<Record<string, unknown>>;
			if (!Array.isArray(departments)) return [];

			const allTags: INodePropertyOptions[] = [];
			const seen = new Set<string>();

			for (const dept of departments) {
				try {
					const response = await zohoLoadOptionsRequest(this, '/ticketTags', {
						departmentId: dept.id,
						limit: 100,
					});
					const tags = (response?.data ?? response ?? []) as Array<Record<string, unknown>>;
					if (!Array.isArray(tags)) continue;
					for (const t of tags) {
						const name = t.name as string;
						if (name && !seen.has(name)) {
							seen.add(name);
							allTags.push({ name, value: name });
						}
					}
				} catch { continue; }
			}
			return allTags;
		} catch { return []; }
	},

	async getTagsById(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const deptResponse = await zohoLoadOptionsRequest(this, '/departments');
			const departments = (deptResponse?.data ?? deptResponse ?? []) as Array<Record<string, unknown>>;
			if (!Array.isArray(departments)) return [];

			const allTags: INodePropertyOptions[] = [];
			const seen = new Set<string>();

			for (const dept of departments) {
				try {
					const response = await zohoLoadOptionsRequest(this, '/ticketTags', {
						departmentId: dept.id,
						limit: 100,
					});
					const tags = (response?.data ?? response ?? []) as Array<Record<string, unknown>>;
					if (!Array.isArray(tags)) continue;
					for (const t of tags) {
						const id = String(t.id);
						if (id && !seen.has(id)) {
							seen.add(id);
							allTags.push({
								name: (t.name as string) || id,
								value: id,
							});
						}
					}
				} catch { continue; }
			}
			return allTags;
		} catch { return []; }
	},

	async getSupportEmails(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			// Fetch all departments first, then get support emails for each
			const deptResponse = await zohoLoadOptionsRequest(this, '/departments');
			const departments = (deptResponse?.data ?? deptResponse ?? []) as Array<Record<string, unknown>>;
			if (!Array.isArray(departments)) return [];

			const allEmails: INodePropertyOptions[] = [];
			const seen = new Set<string>();

			for (const dept of departments) {
				try {
					const emailResponse = await zohoLoadOptionsRequest(this, '/supportEmailAddress', {
						departmentId: dept.id,
						limit: 100,
					});
					const emails = (emailResponse?.data ?? emailResponse ?? []) as Array<Record<string, unknown>>;
					if (!Array.isArray(emails)) continue;
					for (const e of emails) {
						const address = e.address as string;
						if (address && !seen.has(address)) {
							seen.add(address);
							const deptName = dept.name as string || '';
							allEmails.push({
								name: deptName ? `${address} (${deptName})` : address,
								value: address,
							});
						}
					}
				} catch { continue; }
			}
			return allEmails;
		} catch { return []; }
	},

	async getTicketFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const response = await zohoLoadOptionsRequest(this, '/fields', { module: 'tickets' });
			const fields = (response?.data ?? response ?? []) as Array<{ displayLabel: string; apiName: string }>;
			if (!Array.isArray(fields)) return [];
			return fields.map((f) => ({
				name: f.displayLabel || f.apiName,
				value: f.apiName,
			}));
		} catch { return []; }
	},

	async getCommentModules(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		// Only these modules support comments in Zoho Desk
		const COMMENT_MODULES = [
			{ name: 'Tickets', value: 'tickets' },
			{ name: 'Tasks', value: 'tasks' },
			{ name: 'Calls', value: 'calls' },
			{ name: 'Events', value: 'events' },
			{ name: 'Contacts', value: 'contacts' },
			{ name: 'Accounts', value: 'accounts' },
		];
		return COMMENT_MODULES;
	},

	async getSearchFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const module = this.getCurrentNodeParameter('module') as string | undefined;
		if (!module) return [];

		// Module-specific search fields from the Zoho Desk OAS spec
		const SEARCH_FIELDS: Record<string, Array<{ name: string; value: string }>> = {
			tickets: [
				{ name: 'Subject', value: 'subject' },
				{ name: 'Status', value: 'status' },
				{ name: 'Priority', value: 'priority' },
				{ name: 'Channel', value: 'channel' },
				{ name: 'Category', value: 'category' },
				{ name: 'Contact Name', value: 'contactName' },
				{ name: 'Account Name', value: 'accountName' },
				{ name: 'Ticket Number', value: 'ticketNumber' },
				{ name: 'Description', value: 'description' },
				{ name: 'Product Name', value: 'productName' },
				{ name: 'Tag', value: 'tag' },
				{ name: 'Classification', value: 'classification' },
				{ name: 'ID', value: 'id' },
				{ name: 'Due Date Range', value: 'dueDateRange' },
			],
			contacts: [
				{ name: 'First Name', value: 'firstName' },
				{ name: 'Last Name', value: 'lastName' },
				{ name: 'Full Name', value: 'fullName' },
				{ name: 'Account Name', value: 'accountName' },
				{ name: 'Email', value: 'email' },
				{ name: 'Phone', value: 'phone' },
				{ name: 'ID', value: 'id' },
			],
			accounts: [
				{ name: 'Account Name', value: 'accountName' },
				{ name: 'ID', value: 'id' },
			],
			tasks: [
				{ name: 'Subject', value: 'subject' },
				{ name: 'Status', value: 'status' },
				{ name: 'Priority', value: 'priority' },
				{ name: 'Ticket Number', value: 'ticketNumber' },
				{ name: 'ID', value: 'id' },
				{ name: 'Due Date Range', value: 'dueDateRange' },
			],
			calls: [
				{ name: 'Subject', value: 'subject' },
				{ name: 'Status', value: 'status' },
				{ name: 'Priority', value: 'priority' },
				{ name: 'Ticket Number', value: 'ticketNumber' },
				{ name: 'ID', value: 'id' },
				{ name: 'Start Date Range', value: 'startDateRange' },
			],
			events: [
				{ name: 'Subject', value: 'subject' },
				{ name: 'Status', value: 'status' },
				{ name: 'Priority', value: 'priority' },
				{ name: 'Ticket Number', value: 'ticketNumber' },
				{ name: 'ID', value: 'id' },
				{ name: 'Start Date Range', value: 'startDateRange' },
			],
			products: [
				{ name: 'Product Name', value: 'productName' },
				{ name: 'Product Code', value: 'productCode' },
				{ name: 'ID', value: 'id' },
			],
		};

		// Modules that do NOT have a search endpoint
		const NO_SEARCH_MODULES = new Set(['contracts']);
		if (NO_SEARCH_MODULES.has(module)) {
			return [{ name: '⚠ Search not supported for this module', value: '_unsupported' }];
		}

		// For known modules, return specific search fields; for custom modules, return a generic set
		const fields = SEARCH_FIELDS[module];
		if (fields) return fields;

		// Custom modules only support time-range filters, no field-level search
		if (isCustomModule(module)) {
			return [
				{ name: '⚠ Field search not supported — use time range filters in Options', value: '_unsupported' },
			];
		}

		// Other unknown standard modules
		return [
			{ name: 'ID', value: 'id' },
		];
	},
};

// ─── Zoho → n8n field type mapping ──────────────────────────────────────────

function mapZohoFieldType(zohoType?: string): FieldType {
	if (!zohoType) return 'string';
	const t = zohoType.toLowerCase();
	if (['number', 'decimal', 'percent', 'currency', 'integer', 'double'].includes(t)) return 'number';
	if (['boolean', 'checkbox'].includes(t)) return 'boolean';
	if (['date', 'datetime'].includes(t)) return 'dateTime';
	if (t.includes('picklist') || t.includes('multiselect') || t.includes('pick_list')) return 'options';
	if (t === 'url') return 'url';
	return 'string';
}

// ─── Lookup field resolution ────────────────────────────────────────────────

interface LookupConfig {
	endpoint: string;
	nameField: string | string[];
	idField?: string;
	limit?: number;
	needsDepartmentId?: boolean;
}

const LOOKUP_ENDPOINTS: Record<string, LookupConfig> = {
	contactId: { endpoint: '/contacts', nameField: ['firstName', 'lastName'], limit: 100 },
	accountId: { endpoint: '/accounts', nameField: 'accountName', limit: 100 },
	assigneeId: { endpoint: '/agents', nameField: 'name', limit: 100 },
	ownerId: { endpoint: '/agents', nameField: 'name', limit: 100 },
	ticketId: { endpoint: '/tickets', nameField: 'subject', limit: 100, needsDepartmentId: true },
	productId: { endpoint: '/products', nameField: 'productName', limit: 100 },
	associatedSupportPlanId: { endpoint: '/supportPlans', nameField: 'name', limit: 50, needsDepartmentId: true },
	profileId: { endpoint: '/profiles', nameField: 'profileName', limit: 50 },
	roleId: { endpoint: '/profiles', nameField: 'profileName', limit: 50 },
	channelExpert: { endpoint: '/channels', nameField: 'name', idField: 'name' },
	entitySkills: { endpoint: '/skills', nameField: 'name', needsDepartmentId: true },
};

function resolveLookupConfig(apiName: string): LookupConfig | undefined {
	// Direct match first
	if (LOOKUP_ENDPOINTS[apiName]) return LOOKUP_ENDPOINTS[apiName];
	// Owner-type fields (e.g. doctorOwnerId, ticketOwnerId) → agents
	if (/owner/i.test(apiName)) return { endpoint: '/agents', nameField: 'name', limit: 100 };
	// Ticket lookup fields in custom modules
	if (/ticket/i.test(apiName)) return { endpoint: '/tickets', nameField: 'subject', limit: 100, needsDepartmentId: true };
	return undefined;
}

async function fetchLookupOptions(
	context: ILoadOptionsFunctions,
	apiName: string,
): Promise<INodePropertyOptions[] | undefined> {
	const config = resolveLookupConfig(apiName);
	if (!config) return undefined;
	try {
		const qs: Record<string, unknown> = {};
		if (config.limit) qs.limit = config.limit;
		if (config.needsDepartmentId) {
			const deptId = context.getCurrentNodeParameter('departmentId') as string | undefined;
			if (deptId) qs.departmentId = deptId;
		}
		const response = await zohoLoadOptionsRequest(context, config.endpoint, qs);
		const records = (response.data ?? response) as Array<Record<string, unknown>>;
		return records.map((r) => {
			const name = Array.isArray(config.nameField)
				? config.nameField.map((f) => r[f] || '').join(' ').trim()
				: (r[config.nameField] as string) || (r.name as string) || String(r.id);
			const id = config.idField ? r[config.idField] : r.id;
			return { name, value: String(id) };
		});
	} catch {
		return undefined;
	}
}

// ─── Reusable resourceMapping methods ───────────────────────────────────────

export const sharedResourceMapping = {
	async getLayoutFieldMapping(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
		const layoutId = this.getCurrentNodeParameter('layoutId') as string | undefined;
		if (!layoutId) return { fields: [] };
		const response = await zohoLoadOptionsRequest(this, `/layouts/${encodeURIComponent(layoutId)}`);
		const sections = (response.sections ?? []) as Array<{
			fields: Array<{
				displayLabel: string;
				apiName: string;
				isMandatory?: boolean;
				type?: string;
				allowedValues?: unknown[];
			}>;
		}>;
		const rawFields = sections.flatMap((s) => s.fields ?? []);



		// Also fetch module-level fields to include lookup fields not in the layout sections
		const module = this.getCurrentNodeParameter('module') as string | undefined;
		if (module) {
			try {
				const moduleFieldsResponse = await zohoLoadOptionsRequest(this, '/fields', { module });
				const moduleFields = ((moduleFieldsResponse.data ?? moduleFieldsResponse) as Array<{
					displayLabel: string;
					apiName: string;
					isMandatory?: boolean;
					type?: string;
					allowedValues?: unknown[];
				}>);
				const layoutApiNames = new Set(rawFields.map((f) => f.apiName));
				for (const f of moduleFields) {
					if (!layoutApiNames.has(f.apiName)) {
						rawFields.push(f);
					}
				}
			} catch {
				// Module fields not available — continue
			}
			try {
				const orgFieldsResponse = await zohoLoadOptionsRequest(this, '/organizationFields', { module });
				const orgFields = (orgFieldsResponse.data ?? orgFieldsResponse) as Array<{
					displayLabel: string;
					apiName: string;
					isMandatory?: boolean;
					type?: string;
					allowedValues?: unknown[];
				}>;
				const layoutApiNames = new Set(rawFields.map((f) => f.apiName));
				for (const f of orgFields) {
					if (!layoutApiNames.has(f.apiName)) {
						rawFields.push(f);
					}
				}
			} catch {
				// Organization fields not available — continue with layout fields only
			}
		}

		// Override fields with wrong type metadata from Zoho
		const FIELD_OVERRIDES: Record<string, Record<string, { type?: string; allowedValues?: unknown[]; isMandatory?: boolean }>> = {
			calls: {
				direction: { type: 'Picklist', allowedValues: ['inbound', 'outbound'], isMandatory: true },
			},
		};
		const overrides = FIELD_OVERRIDES[module ?? ''] ?? {};
		for (const f of rawFields) {
			const ov = overrides[f.apiName];
			if (ov) {
				if (ov.type) f.type = ov.type;
				if (ov.allowedValues) f.allowedValues = ov.allowedValues;
				if (ov.isMandatory !== undefined) f.isMandatory = ov.isMandatory;
			}
		}

		// Inject core API fields not returned by layout or org fields APIs
		const EXTRA_MODULE_FIELDS: Record<string, Array<{ apiName: string; displayLabel: string; isMandatory: boolean; type: string }>> = {
			calls: [
				{ apiName: 'startTime', displayLabel: 'Start Time', isMandatory: true, type: 'DateTime' },
				{ apiName: 'duration', displayLabel: 'Duration (seconds)', isMandatory: true, type: 'Number' },
			],
			events: [
				{ apiName: 'startTime', displayLabel: 'Start Time', isMandatory: true, type: 'DateTime' },
				{ apiName: 'duration', displayLabel: 'Duration (seconds)', isMandatory: true, type: 'Number' },
			],
		};
		const extraFields = EXTRA_MODULE_FIELDS[module ?? ''] ?? [];
		const existingApiNames = new Set(rawFields.map((f) => f.apiName));
		const toInsert = extraFields.filter((f) => !existingApiNames.has(f.apiName));
		if (toInsert.length) {
			// Insert after 'status' field for natural ordering
			const statusIdx = rawFields.findIndex((f) => f.apiName === 'status');
			const insertAt = statusIdx >= 0 ? statusIdx + 1 : rawFields.length;
			rawFields.splice(insertAt, 0, ...toInsert);
		}

		// Exclude fields already captured by separate dropdowns or system-managed fields
		const excludeFields = new Set([
			'departmentId', 'departmentIds', 'associatedDepartmentIds', 'creatorId', 'modifiedBy', 'createdBy',
			'modifiedTime', 'createdTime', 'id', 'webUrl', 'isDeleted', 'isTrashed',
			'isConfirmed', 'sendNotification', 'layoutId', 'layout',
		]);
		// Deduplicate fields that appear in multiple sections
		const seen = new Set<string>();
		const isLookupType = (t?: string) => t?.toLowerCase() === 'lookup';
		const allFields = rawFields.filter((f) => {
			if (excludeFields.has(f.apiName)) return false;
			// Exclude department and layout fields — already handled by top-level dropdowns
			const apiLower = f.apiName.toLowerCase();
			const labelLower = (f.displayLabel || '').toLowerCase();
			if (apiLower.includes('departmentid') || labelLower === 'department') return false;
			if (apiLower.includes('layoutid') || apiLower === 'layout' || labelLower === 'layout') return false;
			if (seen.has(f.apiName)) return false;
			seen.add(f.apiName);
			return true;
		});

		// Fetch lookup options for known fields (LookUp type or configured in LOOKUP_ENDPOINTS)
		const lookupFields = allFields.filter((f) => resolveLookupConfig(f.apiName));
		const lookupResults = await Promise.all(
			lookupFields.map(async (f) => ({
				apiName: f.apiName,
				options: await fetchLookupOptions(this, f.apiName),
			})),
		);
		const lookupOptionsMap = new Map(
			lookupResults.filter((r) => r.options).map((r) => [r.apiName, r.options!]),
		);

		return {
			fields: allFields.map((f) => {
				const isLookup = f.type === 'LookUp' || f.type === 'Lookup';
				const lookupOptions = lookupOptionsMap.get(f.apiName);
				// Zoho sometimes returns wrong type for status fields (e.g. DateTime instead of Picklist)
				const isStatus = f.apiName === 'status';
				const effectiveType = isStatus ? 'Picklist' : f.type;
				const fieldType = lookupOptions ? 'options' as FieldType : mapZohoFieldType(effectiveType);

				// For status fields without allowedValues, use module-specific fallbacks
				let resolvedOptions = lookupOptions
					?? (fieldType === 'options' && f.allowedValues?.length
						? f.allowedValues.map((v) => {
							const val = typeof v === 'object' && v !== null ? (v as Record<string, string>).value ?? String(v) : String(v);
							return { name: val, value: val };
						})
						: undefined);
				if (isStatus && !resolvedOptions) {
					// Zoho sometimes returns wrong type for status fields; provide module-specific fallbacks
					const mod = this.getCurrentNodeParameter('module') as string | undefined;
					const STATUS_FALLBACKS: Record<string, string[]> = {
						tickets: ['Open', 'On Hold', 'Escalated', 'Closed'],
						calls: ['Completed', 'Scheduled', 'Current call'],
						tasks: ['Not Started', 'In Progress', 'Completed', 'Deferred', 'Waiting for someone'],
						events: ['Planned', 'Held', 'Not Held', 'Completed'],
					};
					const vals = STATUS_FALLBACKS[mod ?? ''];
					if (vals) {
						resolvedOptions = vals.map((v) => ({ name: v, value: v }));
					}
				}
				const options = resolvedOptions;
				const label = f.displayLabel || f.apiName;
				return {
					id: f.apiName,
					displayName: isLookup && !lookupOptions ? `${label} (ID)` : label,
					required: !!f.isMandatory,
					display: true,
					defaultMatch: false,
					type: fieldType,
					...(options ? { options } : {}),
				};
			}),
		};
	},

	async getUpdateFieldMapping(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
		const module = this.getCurrentNodeParameter('module') as string | undefined;
		if (!module) return { fields: [] };

		type FieldDef = {
			displayLabel: string;
			apiName: string;
			isMandatory?: boolean;
			type?: string;
			allowedValues?: unknown[];
		};

		const rawFields: FieldDef[] = [];

		// Collect allowedValues from all layouts (fetched by ID for full detail)
		const layoutAllowedValues = new Map<string, unknown[]>();
		try {
			const departmentId = this.getCurrentNodeParameter('departmentId') as string | undefined;
			const qs: Record<string, unknown> = { module };
			if (departmentId) qs.departmentId = departmentId;
			const layoutsResponse = await zohoLoadOptionsRequest(this, '/layouts', qs);
			const layouts = (layoutsResponse.data ?? layoutsResponse) as Array<{ id: string }>;

			// Fetch each layout by ID in parallel to get full allowedValues
			const layoutDetails = await Promise.all(
				layouts.map(async (l) => {
					try {
						return await zohoLoadOptionsRequest(this, `/layouts/${encodeURIComponent(l.id)}`);
					} catch { return null; }
				}),
			);

			const seenInLayout = new Set<string>();
			for (const layout of layoutDetails) {
				if (!layout) continue;
				const sections = (layout.sections ?? []) as Array<{ fields: FieldDef[] }>;
				for (const section of sections) {
					for (const f of (section.fields ?? [])) {
						if (f.allowedValues?.length) {
							layoutAllowedValues.set(f.apiName, f.allowedValues);
						}
						if (!seenInLayout.has(f.apiName)) {
							seenInLayout.add(f.apiName);
							rawFields.push(f);
						}
					}
				}
			}
		} catch {
			// Layouts not available
		}

		// Fetch module-level fields and merge
		try {
			const moduleFieldsResponse = await zohoLoadOptionsRequest(this, '/fields', { module });
			const moduleFields = (moduleFieldsResponse.data ?? moduleFieldsResponse) as FieldDef[];
			const existingNames = new Set(rawFields.map((f) => f.apiName));
			for (const f of moduleFields) {
				if (!existingNames.has(f.apiName)) {
					rawFields.push(f);
				}
				// Merge allowedValues from module fields if layout didn't have them
				if (f.allowedValues?.length && !layoutAllowedValues.has(f.apiName)) {
					layoutAllowedValues.set(f.apiName, f.allowedValues);
				}
			}
		} catch {
			// Module fields not available
		}

		// Fetch organization fields
		try {
			const orgFieldsResponse = await zohoLoadOptionsRequest(this, '/organizationFields', { module });
			const orgFields = (orgFieldsResponse.data ?? orgFieldsResponse) as FieldDef[];
			const existingNames = new Set(rawFields.map((f) => f.apiName));
			for (const f of orgFields) {
				if (!existingNames.has(f.apiName)) rawFields.push(f);
				if (f.allowedValues?.length && !layoutAllowedValues.has(f.apiName)) {
					layoutAllowedValues.set(f.apiName, f.allowedValues);
				}
			}
		} catch {
			// Organization fields not available
		}

		// Apply collected allowedValues to all rawFields
		for (const f of rawFields) {
			if (!f.allowedValues?.length && layoutAllowedValues.has(f.apiName)) {
				f.allowedValues = layoutAllowedValues.get(f.apiName);
				if (!f.type || f.type === 'Text') f.type = 'Picklist';
			}
		}

		// Apply field overrides
		const FIELD_OVERRIDES: Record<string, Record<string, { type?: string; allowedValues?: unknown[]; isMandatory?: boolean }>> = {
			calls: { direction: { type: 'Picklist', allowedValues: ['inbound', 'outbound'], isMandatory: true } },
		};
		const overrides = FIELD_OVERRIDES[module] ?? {};
		for (const f of rawFields) {
			const ov = overrides[f.apiName];
			if (ov) {
				if (ov.type) f.type = ov.type;
				if (ov.allowedValues) f.allowedValues = ov.allowedValues;
				if (ov.isMandatory !== undefined) f.isMandatory = ov.isMandatory;
			}
		}

		// Inject extra module fields
		const EXTRA_MODULE_FIELDS: Record<string, Array<{ apiName: string; displayLabel: string; isMandatory: boolean; type: string }>> = {
			calls: [
				{ apiName: 'startTime', displayLabel: 'Start Time', isMandatory: false, type: 'DateTime' },
				{ apiName: 'duration', displayLabel: 'Duration (seconds)', isMandatory: false, type: 'Number' },
			],
			events: [
				{ apiName: 'startTime', displayLabel: 'Start Time', isMandatory: false, type: 'DateTime' },
				{ apiName: 'duration', displayLabel: 'Duration (seconds)', isMandatory: false, type: 'Number' },
			],
		};
		const extraFields = EXTRA_MODULE_FIELDS[module] ?? [];
		const existingApiNames = new Set(rawFields.map((f) => f.apiName));
		for (const f of extraFields) {
			if (!existingApiNames.has(f.apiName)) rawFields.push(f);
		}

		// Exclude system/managed fields
		const excludeFields = new Set([
			'departmentId', 'departmentIds', 'associatedDepartmentIds', 'creatorId', 'modifiedBy', 'createdBy',
			'modifiedTime', 'createdTime', 'id', 'webUrl', 'isDeleted', 'isTrashed',
			'isConfirmed', 'sendNotification', 'layoutId', 'layout',
		]);
		const seen = new Set<string>();
		// Module-specific field exclusions
		const MODULE_EXCLUDE_FIELDS: Record<string, string[]> = {
			tickets: ['entitySkills'],
			calls: ['remindMe'],
			contracts: ['productId', 'accountId', 'associatedSLAId', 'customFields'],
		};
		const moduleExcludes = new Set(MODULE_EXCLUDE_FIELDS[module] ?? []);

		const allFields = rawFields.filter((f) => {
			if (excludeFields.has(f.apiName)) return false;
			if (moduleExcludes.has(f.apiName)) return false;
			const apiLower = f.apiName.toLowerCase();
			const labelLower = (f.displayLabel || '').toLowerCase();
			if (apiLower.includes('departmentid') || labelLower === 'department') return false;
			if (apiLower.includes('layoutid') || apiLower === 'layout' || labelLower === 'layout') return false;
			if (seen.has(f.apiName)) return false;
			seen.add(f.apiName);
			return true;
		});

		// Resolve lookup options
		const lookupFields = allFields.filter((f) => resolveLookupConfig(f.apiName));
		const lookupResults = await Promise.all(
			lookupFields.map(async (f) => ({
				apiName: f.apiName,
				options: await fetchLookupOptions(this, f.apiName),
			})),
		);
		const lookupOptionsMap = new Map(
			lookupResults.filter((r) => r.options).map((r) => [r.apiName, r.options!]),
		);

		// Status fallbacks
		const STATUS_FALLBACKS: Record<string, string[]> = {
			tickets: ['Open', 'On Hold', 'Escalated', 'Closed'],
			calls: ['Completed', 'Scheduled', 'Current call'],
			tasks: ['Not Started', 'In Progress', 'Completed', 'Deferred', 'Waiting for someone'],
			events: ['Planned', 'Held', 'Not Held', 'Completed'],
		};

		// Try to fetch ticket statuses dynamically
		let ticketStatuses: string[] | undefined;
		if (module === 'tickets') {
			try {
				const departmentId = this.getCurrentNodeParameter('departmentId') as string | undefined;
				const qs: Record<string, unknown> = {};
				if (departmentId) qs.departmentId = departmentId;
				const statusResponse = await zohoLoadOptionsRequest(this, '/ticketStatuses', qs);
				const statuses = (statusResponse.data ?? statusResponse) as Array<{ name: string }>;
				if (statuses.length > 0) {
					ticketStatuses = statuses.map((s) => s.name);
				}
			} catch {
				// Fall back to hardcoded values
			}
		}

		return {
			fields: allFields.map((f) => {
				const isLookup = f.type === 'LookUp' || f.type === 'Lookup';
				const lookupOptions = lookupOptionsMap.get(f.apiName);
				const isStatus = f.apiName === 'status';
				const effectiveType = isStatus ? 'Picklist' : f.type;
				const fieldType = lookupOptions ? 'options' as FieldType : mapZohoFieldType(effectiveType);

				let resolvedOptions = lookupOptions
					?? (fieldType === 'options' && f.allowedValues?.length
						? f.allowedValues.map((v) => {
							const val = typeof v === 'object' && v !== null ? (v as Record<string, string>).value ?? String(v) : String(v);
							return { name: val, value: val };
						})
						: undefined);
				if (isStatus && !resolvedOptions) {
					const vals = ticketStatuses ?? STATUS_FALLBACKS[module];
					if (vals) resolvedOptions = vals.map((v) => ({ name: v, value: v }));
				}

				const label = f.displayLabel || f.apiName;
				return {
					id: f.apiName,
					displayName: isLookup && !lookupOptions ? `${label} (ID)` : label,
					required: false, // No fields are required for update
					display: true,
					defaultMatch: false,
					type: fieldType,
					...(resolvedOptions ? { options: resolvedOptions } : {}),
				};
			}),
		};
	},
};

// ─── Body-building helpers (moved from CreateRecord) ────────────────────────

export function isCustomModule(module: string): boolean {
	return module.startsWith('cm_');
}

export function buildDepartmentField(module: string, departmentId: string): Record<string, unknown> {
	if (!departmentId) return {};
	if (module === 'products') return { departmentIds: [departmentId] };
	if (isCustomModule(module)) return { department: { id: departmentId } };
	return { departmentId };
}

export function buildLayoutField(module: string, layoutId: string): Record<string, unknown> {
	if (!layoutId) return {};
	if (isCustomModule(module)) return { layout: { id: layoutId } };
	const modulesWithLayout = new Set(['tickets', 'contacts', 'accounts', 'tasks', 'products']);
	if (modulesWithLayout.has(module)) return { layoutId };
	return {};
}

export function processFieldValue(key: string, val: unknown): { key: string; value: unknown } | null {
	if (val === null || val === undefined || val === '' || val === '-None-') return null;
	if (key === 'reminder') return null;

	let processed: unknown = val;
	if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/.test(val)) {
		// Fields that need ISO datetime format (not date-only)
		const datetimeFields = new Set(['dueDate', 'startTime', 'endTime', 'completedTime']);
		if (datetimeFields.has(key)) {
			processed = val.replace(' ', 'T').replace(/(\d{2}:\d{2}:\d{2})$/, '$1.000Z');
		} else if (/Date$/i.test(key)) {
			// Other fields ending in "Date" get date-only format
			processed = val.substring(0, 10);
		} else {
			processed = val.replace(' ', 'T').replace(/(\d{2}:\d{2}:\d{2})$/, '$1.000Z');
		}
	}
	return { key, value: processed };
}

export function buildFieldsBody(
	module: string,
	fieldsValue: Record<string, unknown>,
): Record<string, unknown> {
	const body: Record<string, unknown> = {};
	const cf: Record<string, unknown> = {};
	const custom = isCustomModule(module);

	for (const [key, val] of Object.entries(fieldsValue)) {
		const result = processFieldValue(key, val);
		if (!result) continue;

		if (custom && /owner/i.test(result.key) && typeof result.value === 'string') {
			body.owner = { id: result.value };
		} else if (result.key.startsWith('cf_')) {
			cf[result.key] = result.value;
		} else {
			body[result.key] = result.value;
		}
	}

	if (Object.keys(cf).length) body.cf = cf;
	return body;
}

// ─── Shared assignment helpers ────────────────────────────────────────────────

/**
 * Parse the open (non-closed) ticket count from the /ticketsCountByFieldValues response.
 * Handles multiple response formats: direct keys, nested objects, and array format.
 * Returns 0 if no open tickets or response is empty.
 */
export function parseOpenTicketCount(response: unknown): number {
	if (!response) return 0;
	const data = response as Record<string, unknown>;
	// Direct keys: { Open: N } or { open: N }
	if (typeof data.Open === 'number') return data.Open;
	if (typeof data.open === 'number') return data.open;
	// Nested under a key: { statusType: { Open: N } }
	for (const key of ['statusType', 'counts', 'data']) {
		const nested = data[key] as Record<string, unknown> | undefined;
		if (nested && typeof nested.Open === 'number') return nested.Open;
		if (nested && typeof nested.open === 'number') return nested.open;
	}
	// Array format: [{ value: "Open", count: N }]
	const arr = (data.data ?? data.counts) as Array<{ value?: string; count?: number }> | undefined;
	if (Array.isArray(arr)) {
		const openEntry = arr.find((e) => e.value?.toLowerCase() === 'open');
		if (openEntry && typeof openEntry.count === 'number') return openEntry.count;
	}
	return 0;
}

/**
 * Fetch the set of online agent IDs for a department.
 * Returns null if the API call fails (treat all agents as online).
 */
export async function fetchOnlineAgentIds(
	context: IExecuteFunctions,
	departmentId: string,
): Promise<Set<string> | null> {
	try {
		const response = await zohoApiRequest(context, 'GET', '/onlineAgents', {}, {
			departmentId,
			limit: 6000,
		});
		const agents = response
			? ((response as IDataObject).data || response) as IDataObject[]
			: [];
		return new Set(
			(Array.isArray(agents) ? agents : []).map((a) => String(a.id)),
		);
	} catch {
		return null;
	}
}

/**
 * Get the active (non-closed) ticket count for an agent in a department.
 * Returns -1 on API failure (caller should treat as "at threshold" or skip).
 */
export async function getActiveTicketCount(
	context: IExecuteFunctions,
	agentId: string,
	departmentId: string,
): Promise<number> {
	try {
		const response = await zohoApiRequest(context, 'GET', '/ticketsCountByFieldValues', {}, {
			field: 'statusType',
			assigneeId: agentId,
			departmentId,
		});
		return parseOpenTicketCount(response);
	} catch {
		return -1;
	}
}
