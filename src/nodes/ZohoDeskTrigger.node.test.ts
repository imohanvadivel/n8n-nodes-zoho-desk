import { test, expect, describe, mock } from 'bun:test';
import { ZohoDeskTrigger } from './ZohoDeskTrigger.node';

// ─── Mock helpers ────────────────────────────────────────────────────────────

function createMockHookFunctions(params: Record<string, unknown> = {}, staticData: Record<string, unknown> = {}) {
	const requestOAuth2 = mock(() => Promise.resolve({ id: 'wh-1' }));

	const ctx: any = {
		getNodeParameter: mock((name: string, fallback?: unknown) => {
			if (name in params) return params[name];
			if (fallback !== undefined) return fallback;
			return '';
		}),
		getNodeWebhookUrl: mock(() => 'https://n8n.example.com/webhook/abc'),
		getWorkflow: mock(() => ({ id: 'wf-1', name: 'My Workflow' })),
		getWorkflowStaticData: mock(() => staticData),
		getNode: mock(() => ({ name: 'Zoho Desk Trigger' })),
		getCredentials: mock(() =>
			Promise.resolve({ orgId: 'test-org-123', baseUrl: 'https://desk.zoho.com/api/v1' }),
		),
		helpers: { requestOAuth2 },
	};
	return ctx;
}

async function createWebhook(params: Record<string, unknown>, staticData: Record<string, unknown> = {}) {
	const ctx = createMockHookFunctions(params, staticData);
	let capturedBody: any;
	ctx.helpers.requestOAuth2.mockImplementation((_cred: string, opts: any) => {
		capturedBody = opts.body;
		return Promise.resolve({ id: 'wh-1' });
	});
	const trigger = new ZohoDeskTrigger();
	await trigger.webhookMethods.default.create.call(ctx);
	return { subscriptions: capturedBody.subscriptions, body: capturedBody, staticData };
}

// ─── Subscription building ───────────────────────────────────────────────────

describe('Trigger subscription building', () => {
	test('single direction variant sets direction filter', async () => {
		const { subscriptions } = await createWebhook({
			module: 'tickets',
			events: ['Ticket_Thread_Add:in'],
		});
		expect(subscriptions.Ticket_Thread_Add).toEqual({ direction: 'in' });
	});

	test('selecting both directions merges to no direction filter', async () => {
		const { subscriptions } = await createWebhook({
			module: 'tickets',
			events: ['Ticket_Thread_Add:in', 'Ticket_Thread_Add:out'],
		});
		expect(subscriptions.Ticket_Thread_Add).toBeNull();
	});

	test('plain variant alongside a direction variant removes the filter', async () => {
		const { subscriptions } = await createWebhook({
			module: 'tickets',
			events: ['Ticket_Thread_Add', 'Ticket_Thread_Add:out'],
		});
		expect(subscriptions.Ticket_Thread_Add).toBeNull();
	});

	test('prevState and fields variants of the same event merge', async () => {
		const { subscriptions } = await createWebhook({
			module: 'tickets',
			events: ['Ticket_Update:prevState', 'Ticket_Update:fields'],
			trackFields: ['status', 'priority'],
		});
		expect(subscriptions.Ticket_Update).toEqual({
			includePrevState: true,
			fields: ['status', 'priority'],
		});
	});

	test('fields variant without selected fields throws', async () => {
		await expect(
			createWebhook({
				module: 'tickets',
				events: ['Ticket_Update:fields'],
				trackFields: [],
			}),
		).rejects.toThrow(/no fields are selected/);
	});

	test('more than 5 track fields throws', async () => {
		await expect(
			createWebhook({
				module: 'tickets',
				events: ['Ticket_Update:fields'],
				trackFields: ['a', 'b', 'c', 'd', 'e', 'f'],
			}),
		).rejects.toThrow(/at most 5 fields/);
	});

	test('stores webhook ID from the create response', async () => {
		const { staticData } = await createWebhook({
			module: 'tickets',
			events: ['Ticket_Add'],
		});
		expect(staticData.webhookId).toBe('wh-1');
	});

	test('throws when Zoho returns no webhook ID', async () => {
		const ctx = createMockHookFunctions({ module: 'tickets', events: ['Ticket_Add'] });
		ctx.helpers.requestOAuth2.mockImplementation(() => Promise.resolve(undefined));
		const trigger = new ZohoDeskTrigger();
		await expect(trigger.webhookMethods.default.create.call(ctx)).rejects.toThrow(/webhook ID/);
	});
});

// ─── checkExists ─────────────────────────────────────────────────────────────

describe('Trigger checkExists', () => {
	test('clears webhookId and returns false on not-found', async () => {
		const staticData: Record<string, unknown> = { webhookId: 'wh-1' };
		const ctx = createMockHookFunctions({}, staticData);
		ctx.helpers.requestOAuth2.mockImplementation(() => {
			throw new Error('404 - NOT_FOUND: The webhook does not exist');
		});
		const trigger = new ZohoDeskTrigger();
		const exists = await trigger.webhookMethods.default.checkExists.call(ctx);
		expect(exists).toBe(false);
		expect(staticData.webhookId).toBeUndefined();
	});

	test('keeps webhookId and returns true on transient errors', async () => {
		const staticData: Record<string, unknown> = { webhookId: 'wh-1' };
		const ctx = createMockHookFunctions({}, staticData);
		ctx.helpers.requestOAuth2.mockImplementation(() => {
			throw new Error('429 - Too many requests');
		});
		const trigger = new ZohoDeskTrigger();
		const exists = await trigger.webhookMethods.default.checkExists.call(ctx);
		expect(exists).toBe(true);
		expect(staticData.webhookId).toBe('wh-1');
	});
});

// ─── webhook() payload handling ──────────────────────────────────────────────

function createMockWebhookFunctions(options: {
	webhookName: string;
	body?: unknown;
	headers?: Record<string, string>;
}) {
	return {
		getWebhookName: mock(() => options.webhookName),
		getBodyData: mock(() => options.body),
		getHeaderData: mock(() => options.headers ?? {}),
	} as any;
}

describe('Trigger webhook()', () => {
	test('setup GET responds without executing the workflow', async () => {
		const ctx = createMockWebhookFunctions({ webhookName: 'setup' });
		const trigger = new ZohoDeskTrigger();
		const result = await trigger.webhook.call(ctx);
		expect(result.webhookResponse).toBe('OK');
		expect(result.workflowData).toBeUndefined();
	});

	test('single event gets eventType from header', async () => {
		const ctx = createMockWebhookFunctions({
			webhookName: 'default',
			body: { ticketId: 't1' },
			headers: { 'x-zoho-event': 'Ticket_Add' },
		});
		const trigger = new ZohoDeskTrigger();
		const result = await trigger.webhook.call(ctx);
		expect(result.workflowData).toEqual([[{ json: { ticketId: 't1', eventType: 'Ticket_Add' } }]]);
	});

	test('batched array delivery also gets eventType applied', async () => {
		const ctx = createMockWebhookFunctions({
			webhookName: 'default',
			body: [{ ticketId: 't1' }, { ticketId: 't2', eventType: 'Own_Event' }],
			headers: { 'x-zoho-event': 'Ticket_Add' },
		});
		const trigger = new ZohoDeskTrigger();
		const result = await trigger.webhook.call(ctx);
		expect(result.workflowData).toEqual([
			[
				{ json: { ticketId: 't1', eventType: 'Ticket_Add' } },
				{ json: { ticketId: 't2', eventType: 'Own_Event' } },
			],
		]);
	});
});
