import { test, expect, describe, mock, beforeEach } from 'bun:test';
import { ZohoDesk } from './ZohoDesk.node';
import {
	zohoApiRequest,
	isCustomModule,
	buildDepartmentField,
	buildLayoutField,
	processFieldValue,
	buildFieldsBody,
} from './helpers';

// ─── Mock helpers ────────────────────────────────────────────────────────────

function createMockExecuteFunctions(params: Record<string, unknown> = {}) {
	const requestOAuth2 = mock(() => Promise.resolve({}));
	const returnJsonArray = mock((data: unknown) => {
		if (Array.isArray(data)) return data.map((d) => ({ json: d }));
		return [{ json: data }];
	});
	const constructExecutionMetaData = mock((items: unknown[], meta: unknown) => items);
	const getNode = mock(() => ({ name: 'Zoho Desk' }));
	const continueOnFail = mock(() => false);

	const getNodeParameter = mock((name: string, _index: number, fallback?: unknown) => {
		if (name in params) return params[name];
		if (fallback !== undefined) return fallback;
		return '';
	});

	const getCredentials = mock(() =>
		Promise.resolve({
			orgId: 'test-org-123',
			baseUrl: 'https://desk.zoho.com/api/v1',
		}),
	);

	const getInputData = mock(() => [{ json: {} }]);

	const assertBinaryData = mock(() => ({
		fileName: 'test.pdf',
		mimeType: 'application/pdf',
	}));
	const getBinaryDataBuffer = mock(() => Promise.resolve(Buffer.from('test')));

	const ctx: any = {
		getNodeParameter,
		getCredentials,
		getInputData,
		getNode,
		continueOnFail,
		helpers: {
			requestOAuth2,
			returnJsonArray,
			constructExecutionMetaData,
			assertBinaryData,
			getBinaryDataBuffer,
		},
	};

	return ctx;
}

// Helper to capture what zohoApiRequest was called with
let lastApiCall: { method: string; endpoint: string; body: any; qs: any } | null = null;

// We need to mock the module-level zohoApiRequest. Since the execute method
// calls zohoApiRequest(this, ...), we mock helpers.requestOAuth2 and check
// what gets passed through.
function setupApiMock(ctx: any, response: unknown = { id: '1', success: true }) {
	ctx.helpers.requestOAuth2.mockImplementation((_cred: string, opts: any) => {
		lastApiCall = {
			method: opts.method,
			endpoint: opts.uri.replace('https://desk.zoho.com/api/v1', ''),
			body: opts.body,
			qs: opts.qs,
		};
		return Promise.resolve(response);
	});
}

async function executeNode(params: Record<string, unknown>, response?: unknown) {
	const ctx = createMockExecuteFunctions(params);
	setupApiMock(ctx, response);
	const node = new ZohoDesk();
	const result = await node.execute.call(ctx);
	return { result, ctx, lastCall: lastApiCall };
}

// ─── Helper function tests ───────────────────────────────────────────────────

describe('Helper Functions', () => {
	describe('isCustomModule', () => {
		test('returns true for cm_ prefixed modules', () => {
			expect(isCustomModule('cm_mymodule')).toBe(true);
		});

		test('returns false for standard modules', () => {
			expect(isCustomModule('tickets')).toBe(false);
			expect(isCustomModule('contacts')).toBe(false);
		});
	});

	describe('buildDepartmentField', () => {
		test('returns empty object for empty departmentId', () => {
			expect(buildDepartmentField('tickets', '')).toEqual({});
		});

		test('returns departmentIds array for products', () => {
			expect(buildDepartmentField('products', 'dept1')).toEqual({
				departmentIds: ['dept1'],
			});
		});

		test('returns nested department object for custom modules', () => {
			expect(buildDepartmentField('cm_custom', 'dept1')).toEqual({
				department: { id: 'dept1' },
			});
		});

		test('returns departmentId for standard modules', () => {
			expect(buildDepartmentField('tickets', 'dept1')).toEqual({
				departmentId: 'dept1',
			});
		});
	});

	describe('buildLayoutField', () => {
		test('returns empty object for empty layoutId', () => {
			expect(buildLayoutField('tickets', '')).toEqual({});
		});

		test('returns nested layout for custom modules', () => {
			expect(buildLayoutField('cm_custom', 'lay1')).toEqual({
				layout: { id: 'lay1' },
			});
		});

		test('returns layoutId for supported standard modules', () => {
			expect(buildLayoutField('tickets', 'lay1')).toEqual({ layoutId: 'lay1' });
			expect(buildLayoutField('contacts', 'lay1')).toEqual({ layoutId: 'lay1' });
			expect(buildLayoutField('accounts', 'lay1')).toEqual({ layoutId: 'lay1' });
			expect(buildLayoutField('tasks', 'lay1')).toEqual({ layoutId: 'lay1' });
			expect(buildLayoutField('products', 'lay1')).toEqual({ layoutId: 'lay1' });
		});

		test('returns empty object for unsupported modules', () => {
			expect(buildLayoutField('calls', 'lay1')).toEqual({});
		});
	});

	describe('processFieldValue', () => {
		test('returns null for empty/null values', () => {
			expect(processFieldValue('subject', null)).toBeNull();
			expect(processFieldValue('subject', undefined)).toBeNull();
			expect(processFieldValue('subject', '')).toBeNull();
			expect(processFieldValue('subject', '-None-')).toBeNull();
		});

		test('returns null for reminder field', () => {
			expect(processFieldValue('reminder', 'some value')).toBeNull();
		});

		test('formats datetime fields', () => {
			const result = processFieldValue('dueDate', '2024-01-15 10:30:00');
			expect(result).toEqual({ key: 'dueDate', value: '2024-01-15T10:30:00.000Z' });
		});

		test('formats date-only fields ending in Date', () => {
			const result = processFieldValue('someDate', '2024-01-15 10:30:00');
			// someDate doesn't end with Date... it IS "someDate", which ends with "Date"
			// Actually /Date$/i matches "someDate"
			expect(result).toEqual({ key: 'someDate', value: '2024-01-15' });
		});

		test('passes non-date values through', () => {
			const result = processFieldValue('subject', 'Hello World');
			expect(result).toEqual({ key: 'subject', value: 'Hello World' });
		});
	});

	describe('buildFieldsBody', () => {
		test('builds body from fields', () => {
			const result = buildFieldsBody('tickets', { subject: 'Test', priority: 'High' });
			expect(result).toEqual({ subject: 'Test', priority: 'High' });
		});

		test('puts cf_ fields under cf key', () => {
			const result = buildFieldsBody('tickets', { subject: 'Test', cf_myfield: 'value' });
			expect(result).toEqual({ subject: 'Test', cf: { cf_myfield: 'value' } });
		});

		test('wraps owner as object for custom modules', () => {
			const result = buildFieldsBody('cm_custom', { ownerId: 'agent1' });
			expect(result).toEqual({ owner: { id: 'agent1' } });
		});

		test('skips null/empty values', () => {
			const result = buildFieldsBody('tickets', { subject: 'Test', priority: '', status: null });
			expect(result).toEqual({ subject: 'Test' });
		});
	});

	describe('zohoApiRequest error parsing', () => {
		test('parses Zoho error response from cause.body string', async () => {
			const ctx = createMockExecuteFunctions({});
			ctx.helpers.requestOAuth2.mockImplementation(() => {
				const err: any = new Error('Request failed');
				err.cause = {
					body: JSON.stringify({
						errorCode: 'INVALID_DATA',
						message: 'Invalid data',
						errors: [{ fieldName: 'subject', errorMessage: 'Required' }],
					}),
				};
				throw err;
			});

			try {
				await zohoApiRequest(ctx, 'POST', '/tickets', {});
				expect(true).toBe(false); // should not reach here
			} catch (e: any) {
				expect(e.message).toContain('INVALID_DATA');
				expect(e.message).toContain('Invalid data');
				expect(e.message).toContain('subject: Required');
			}
		});

		test('parses Zoho error response from description object', async () => {
			const ctx = createMockExecuteFunctions({});
			ctx.helpers.requestOAuth2.mockImplementation(() => {
				const err: any = new Error('Request failed');
				err.description = { errorCode: 'NOT_FOUND', message: 'Record not found' };
				throw err;
			});

			try {
				await zohoApiRequest(ctx, 'GET', '/tickets/999', {});
				expect(true).toBe(false);
			} catch (e: any) {
				expect(e.message).toContain('NOT_FOUND');
				expect(e.message).toContain('Record not found');
			}
		});

		test('parses embedded JSON in error message', async () => {
			const ctx = createMockExecuteFunctions({});
			ctx.helpers.requestOAuth2.mockImplementation(() => {
				throw new Error('422 - {"errorCode":"UNPROCESSABLE","message":"Cannot process"}');
			});

			try {
				await zohoApiRequest(ctx, 'POST', '/tickets', {});
				expect(true).toBe(false);
			} catch (e: any) {
				expect(e.message).toContain('UNPROCESSABLE');
			}
		});
	});
});

// ─── Record Resource ─────────────────────────────────────────────────────────

describe('Record Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('create - POST /{module} with fields', async () => {
		const { lastCall } = await executeNode({
			resource: 'record',
			operation: 'create',
			module: 'tickets',
			departmentId: 'dept1',
			layoutId: 'lay1',
			createFields: { mappingMode: 'defineBelow', value: { subject: 'Test Ticket', priority: 'High' } },
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets');
		expect(lastCall!.body.subject).toBe('Test Ticket');
		expect(lastCall!.body.priority).toBe('High');
		expect(lastCall!.body.departmentId).toBe('dept1');
		expect(lastCall!.body.layoutId).toBe('lay1');
	});

	test('get - GET /{module}/{recordId}', async () => {
		const { lastCall } = await executeNode({
			resource: 'record',
			operation: 'get',
			module: 'contacts',
			recordId: 'rec123',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/contacts/rec123');
	});

	test('update - PATCH /{module}/{recordId}', async () => {
		const { lastCall } = await executeNode({
			resource: 'record',
			operation: 'update',
			module: 'tickets',
			recordId: 'rec123',
			updateFields: { mappingMode: 'defineBelow', value: { status: 'Closed' } },
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/tickets/rec123');
		expect(lastCall!.body.status).toBe('Closed');
	});

	test('delete - POST /{module}/moveToTrash', async () => {
		const { lastCall } = await executeNode({
			resource: 'record',
			operation: 'delete',
			module: 'tickets',
			recordId: 'rec123',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/moveToTrash');
		expect(lastCall!.body.ticketIds).toEqual(['rec123']);
	});

	test('delete - uses contactIds for contacts module', async () => {
		const { lastCall } = await executeNode({
			resource: 'record',
			operation: 'delete',
			module: 'contacts',
			recordId: 'c1',
		});
		expect(lastCall!.body.contactIds).toEqual(['c1']);
	});

	test('delete - uses recordIds for custom modules', async () => {
		const { lastCall } = await executeNode({
			resource: 'record',
			operation: 'delete',
			module: 'cm_custom',
			recordId: 'r1',
		});
		expect(lastCall!.body.recordIds).toEqual(['r1']);
	});

	test('search - GET /{module}/search with query params', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'record',
				operation: 'search',
				module: 'tickets',
				searchCriteria: {
					filter: [{ field: 'subject', operator: 'contains', value: 'test' }],
				},
				searchOptions: { limit: 10, from: 0, sortBy: '-createdTime' },
			},
			{ data: [{ id: '1', subject: 'test ticket' }] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/search');
		expect(lastCall!.qs.limit).toBe(10);
		expect(lastCall!.qs.sortBy).toBe('-createdTime');
		expect(lastCall!.qs.subject).toBe('*test*');
	});

	test('search - startsWith operator', async () => {
		const { lastCall } = await executeNode({
			resource: 'record',
			operation: 'search',
			module: 'tickets',
			searchCriteria: {
				filter: [{ field: 'subject', operator: 'startsWith', value: 'test' }],
			},
			searchOptions: {},
		});
		expect(lastCall!.qs.subject).toBe('test*');
	});
});

// ─── Ticket Resource ─────────────────────────────────────────────────────────

describe('Ticket Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('getMetrics - GET /tickets/{id}/metrics', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticket',
			operation: 'getMetrics',
			ticketId: 't1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/metrics');
	});

	test('markAsRead - POST /tickets/{id}/markAsRead', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticket',
			operation: 'markAsRead',
			ticketId: 't1',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/markAsRead');
	});

	test('markAsUnread - POST /tickets/{id}/markAsUnRead', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticket',
			operation: 'markAsUnread',
			ticketId: 't1',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/markAsUnRead');
	});

	test('merge - POST /tickets/{id}/merge with ids and source', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticket',
			operation: 'merge',
			ticketId: 't1',
			mergeTicketIds: 't2,t3',
			mergeSource: {
				field: [{ fieldName: 'subject', sourceTicketId: 't2' }],
			},
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/merge');
		expect(lastCall!.body.ids).toEqual(['t2', 't3']);
		expect(lastCall!.body.source).toEqual({ subject: 't2' });
	});

	test('moveDepartment - POST /tickets/{id}/move', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticket',
			operation: 'moveDepartment',
			ticketId: 't1',
			departmentId: 'dept2',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/move');
		expect(lastCall!.body.departmentId).toBe('dept2');
	});

	test('split - POST /tickets/{id}/threads/{threadId}/split', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticket',
			operation: 'split',
			ticketId: 't1',
			threadId: 'th1',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/threads/th1/split');
	});

	test('getCountByField - GET /ticketsCountByFieldValues', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticket',
			operation: 'getCountByField',
			countField: 'status',
			countOptions: {},
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/ticketsCountByFieldValues');
		expect(lastCall!.qs.field).toBe('status');
	});
});

// ─── Comment Resource ────────────────────────────────────────────────────────

describe('Comment Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('add - POST /{module}/{recordId}/comments', async () => {
		const { lastCall } = await executeNode({
			resource: 'comment',
			operation: 'add',
			module: 'tickets',
			recordId: 'rec1',
			content: 'My comment',
			commentOptions: { isPublic: true, contentType: 'html' },
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/rec1/comments');
		expect(lastCall!.body.content).toBe('My comment');
		expect(lastCall!.body.isPublic).toBe(true);
		expect(lastCall!.body.contentType).toBe('html');
	});

	test('add - does not include isPublic for non-ticket modules', async () => {
		const { lastCall } = await executeNode({
			resource: 'comment',
			operation: 'add',
			module: 'tasks',
			recordId: 'rec1',
			content: 'Task comment',
			commentOptions: { isPublic: true },
		});
		expect(lastCall!.body.isPublic).toBeUndefined();
	});

	test('getAll - GET /{module}/{recordId}/comments', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'comment',
				operation: 'getAll',
				module: 'tickets',
				recordId: 'rec1',
				commentGetAllOptions: { limit: 10, from: 5 },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/rec1/comments');
		expect(lastCall!.qs.limit).toBe(10);
		expect(lastCall!.qs.from).toBe(5);
	});

	test('update - PATCH for tickets, PUT for others', async () => {
		// Tickets use PATCH
		let { lastCall } = await executeNode({
			resource: 'comment',
			operation: 'update',
			module: 'tickets',
			recordId: 'rec1',
			commentId: 'c1',
			content: 'Updated',
		});
		expect(lastCall!.method).toBe('PATCH');

		// Tasks use PUT
		({ lastCall } = await executeNode({
			resource: 'comment',
			operation: 'update',
			module: 'tasks',
			recordId: 'rec1',
			commentId: 'c1',
			content: 'Updated',
		}));
		expect(lastCall!.method).toBe('PUT');
	});

	test('delete - DELETE /{module}/{recordId}/comments/{commentId}', async () => {
		const { lastCall } = await executeNode({
			resource: 'comment',
			operation: 'delete',
			module: 'tickets',
			recordId: 'rec1',
			commentId: 'c1',
		});
		expect(lastCall!.method).toBe('DELETE');
		expect(lastCall!.endpoint).toBe('/tickets/rec1/comments/c1');
	});
});

// ─── Thread Resource ─────────────────────────────────────────────────────────

describe('Thread Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('getThread - GET /tickets/{id}/threads/{threadId} with plainText', async () => {
		const { lastCall } = await executeNode({
			resource: 'thread',
			operation: 'getThread',
			ticketId: 't1',
			threadId: 'th1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/threads/th1');
		expect(lastCall!.qs.include).toBe('plainText');
	});

	test('getAll - GET /tickets/{id}/threads', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'thread',
				operation: 'getAll',
				ticketId: 't1',
				threadListOptions: { limit: 50 },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/threads');
		expect(lastCall!.qs.limit).toBe(50);
	});

	test('getConversations - GET /tickets/{id}/conversations', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'thread',
				operation: 'getConversations',
				ticketId: 't1',
				threadListOptions: {},
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/conversations');
	});

	test('getOriginalContent - GET /tickets/{id}/threads/{threadId}/originalContent', async () => {
		const { lastCall } = await executeNode({
			resource: 'thread',
			operation: 'getOriginalContent',
			ticketId: 't1',
			threadId: 'th1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/threads/th1/originalContent');
	});

	test('sendReply - POST /tickets/{id}/sendReply with channel and content', async () => {
		const { lastCall } = await executeNode({
			resource: 'thread',
			operation: 'sendReply',
			ticketId: 't1',
			threadChannel: 'EMAIL',
			threadContent: '<p>Hello</p>',
			fromEmailAddress: 'support@test.com',
			threadTo: 'user@test.com',
			threadOptions: { cc: 'cc@test.com', contentType: 'html' },
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/sendReply');
		expect(lastCall!.body.channel).toBe('EMAIL');
		expect(lastCall!.body.content).toBe('<p>Hello</p>');
		expect(lastCall!.body.fromEmailAddress).toBe('support@test.com');
		expect(lastCall!.body.to).toBe('user@test.com');
		expect(lastCall!.body.cc).toBe('cc@test.com');
	});

	test('draftReply - POST /tickets/{id}/draftReply', async () => {
		const { lastCall } = await executeNode({
			resource: 'thread',
			operation: 'draftReply',
			ticketId: 't1',
			threadChannel: 'EMAIL',
			threadContent: 'Draft content',
			fromEmailAddress: 'support@test.com',
			threadTo: '',
			threadOptions: {},
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/draftReply');
		expect(lastCall!.body.channel).toBe('EMAIL');
	});

	test('updateDraft - PATCH /tickets/{id}/draftReply/{threadId}', async () => {
		const { lastCall } = await executeNode({
			resource: 'thread',
			operation: 'updateDraft',
			ticketId: 't1',
			threadId: 'th1',
			threadChannel: 'EMAIL',
			threadContent: 'Updated draft',
			fromEmailAddress: 'support@test.com',
			threadTo: '',
			threadOptions: {},
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/tickets/t1/draftReply/th1');
	});

	test('sendForReview - POST /tickets/{id}/threads/{threadId}/sendForReview', async () => {
		const { lastCall } = await executeNode({
			resource: 'thread',
			operation: 'sendForReview',
			ticketId: 't1',
			threadId: 'th1',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/threads/th1/sendForReview');
	});
});

// ─── Ticket Follower Resource ────────────────────────────────────────────────

describe('Ticket Follower Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('getFollowers - GET /tickets/{id}/followers', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'ticketFollower',
				operation: 'getFollowers',
				ticketId: 't1',
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/followers');
	});

	test('addFollower - POST /tickets/{id}/addFollowers', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticketFollower',
			operation: 'addFollower',
			ticketId: 't1',
			followers: ['agent1', 'agent2'],
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/addFollowers');
		expect(lastCall!.body.followerIds).toEqual(['agent1', 'agent2']);
	});

	test('removeFollower - POST /tickets/{id}/removeFollowers', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticketFollower',
			operation: 'removeFollower',
			ticketId: 't1',
			followers: ['agent1'],
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/removeFollowers');
		expect(lastCall!.body.followerIds).toEqual(['agent1']);
	});
});

// ─── Ticket Attachment Resource ──────────────────────────────────────────────

describe('Ticket Attachment Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('list - GET /tickets/{id}/attachments', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'ticketAttachment',
				operation: 'list',
				ticketId: 't1',
				listAttachmentOptions: { limit: 10 },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/attachments');
		expect(lastCall!.qs.include).toBe('creator');
	});

	test('create - POST /tickets/{id}/attachments (file upload)', async () => {
		const ctx = createMockExecuteFunctions({
			resource: 'ticketAttachment',
			operation: 'create',
			ticketId: 't1',
			binaryPropertyName: 'data',
			attachmentOptions: {},
		});
		ctx.helpers.requestOAuth2.mockImplementation((_cred: string, opts: any) => {
			lastApiCall = {
				method: opts.method,
				endpoint: opts.uri,
				body: opts.formData,
				qs: null,
			};
			return Promise.resolve({ id: 'att1' });
		});
		const node = new ZohoDesk();
		await node.execute.call(ctx);
		expect(lastApiCall!.method).toBe('POST');
		expect(lastApiCall!.endpoint).toContain('/tickets/t1/attachments');
	});

	test('update - PATCH /tickets/{id}/attachments/{attachmentId}', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticketAttachment',
			operation: 'update',
			ticketId: 't1',
			attachmentId: 'att1',
			attachmentIsPublic: true,
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/tickets/t1/attachments/att1');
		expect(lastCall!.body.isPublic).toBe(true);
	});

	test('delete - DELETE /tickets/{id}/attachments/{attachmentId}', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticketAttachment',
			operation: 'delete',
			ticketId: 't1',
			attachmentId: 'att1',
		});
		expect(lastCall!.method).toBe('DELETE');
		expect(lastCall!.endpoint).toBe('/tickets/t1/attachments/att1');
	});
});

// ─── Tag Resource ────────────────────────────────────────────────────────────

describe('Tag Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('addTag - POST /tickets/{id}/associateTag', async () => {
		const { lastCall } = await executeNode({
			resource: 'tag',
			operation: 'addTag',
			ticketId: 't1',
			tags: ['bug', 'urgent'],
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/associateTag');
		expect(lastCall!.body.tags).toEqual(['bug', 'urgent']);
	});

	test('removeTag - POST /tickets/{id}/dissociateTag', async () => {
		const { lastCall } = await executeNode({
			resource: 'tag',
			operation: 'removeTag',
			ticketId: 't1',
			tags: ['bug'],
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/dissociateTag');
		expect(lastCall!.body.tags).toEqual(['bug']);
	});

	test('listAll - GET /ticketTags with departmentId', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'tag',
				operation: 'listAll',
				tagDepartmentId: 'dept1',
				listAllTagsOptions: { limit: 50 },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/ticketTags');
		expect(lastCall!.qs.departmentId).toBe('dept1');
	});

	test('listTags - GET /tickets/{id}/tags', async () => {
		const { lastCall } = await executeNode(
			{ resource: 'tag', operation: 'listTags', ticketId: 't1' },
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/tags');
	});

	test('listByTag - GET /tags/{tagId}/tickets', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'tag',
				operation: 'listByTag',
				tagId: 'tag1',
				listByTagOptions: { limit: 25 },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tags/tag1/tickets');
	});
});

// ─── Ticket Approval Resource ────────────────────────────────────────────────

describe('Ticket Approval Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('list - GET /tickets/{id}/approvals', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'ticketApproval',
				operation: 'list',
				ticketId: 't1',
				listApprovalOptions: {},
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/approvals');
	});

	test('create - POST /tickets/{id}/approvals', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticketApproval',
			operation: 'create',
			ticketId: 't1',
			approvalSubject: 'Need approval',
			approverIds: ['agent1', 'agent2'],
			createApprovalOptions: { description: 'Please review' },
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/approvals');
		expect(lastCall!.body.subject).toBe('Need approval');
		expect(lastCall!.body.approverIds).toEqual(['agent1', 'agent2']);
		expect(lastCall!.body.description).toBe('Please review');
	});

	test('get - GET /tickets/{id}/approvals/{approvalId}', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticketApproval',
			operation: 'get',
			ticketId: 't1',
			approvalId: 'app1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/approvals/app1');
	});

	test('update - PATCH /tickets/{id}/approvals/{approvalId}', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticketApproval',
			operation: 'update',
			ticketId: 't1',
			approvalId: 'app1',
			approvalStatus: 'Approved',
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/tickets/t1/approvals/app1');
		expect(lastCall!.body.status).toBe('Approved');
	});
});

// ─── Ticket Pin Resource ─────────────────────────────────────────────────────

describe('Ticket Pin Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('getPins - GET /tickets/{id}/pins', async () => {
		const { lastCall } = await executeNode(
			{ resource: 'ticketPin', operation: 'getPins', ticketId: 't1' },
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/pins');
		expect(lastCall!.qs.types).toBe('comments,threads');
	});

	test('createPin - POST /tickets/{id}/pins', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticketPin',
			operation: 'createPin',
			ticketId: 't1',
			pinType: 'COMMENTS',
			pinEntityId: 'c1',
			pinOptions: { isPublic: true },
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/pins');
		expect(lastCall!.body.type).toBe('COMMENTS');
		expect(lastCall!.body.entityId).toBe('c1');
		expect(lastCall!.body.isPublic).toBe(true);
	});

	test('unpin - POST /tickets/{id}/pins/unpin', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticketPin',
			operation: 'unpin',
			ticketId: 't1',
			unpinIds: 'pin1,pin2',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/pins/unpin');
		expect(lastCall!.body.ids).toEqual(['pin1', 'pin2']);
	});
});

// ─── Time Entry Resource ─────────────────────────────────────────────────────

describe('Time Entry Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('list - GET /tickets/{id}/timeEntry', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'timeEntry',
				operation: 'list',
				ticketId: 't1',
				timeEntryListOptions: { limit: 10 },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/timeEntry');
		expect(lastCall!.qs.include).toBe('owner');
	});

	test('create - POST /tickets/{id}/timeEntry', async () => {
		const { lastCall } = await executeNode({
			resource: 'timeEntry',
			operation: 'create',
			ticketId: 't1',
			executedTime: '2024-06-22 10:30:00',
			timeEntryAdditionalFields: { hoursSpent: 2, minutesSpent: 30 },
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/tickets/t1/timeEntry');
		expect(lastCall!.body.executedTime).toBe('2024-06-22T10:30:00.000Z');
		expect(lastCall!.body.hoursSpent).toBe(2);
		expect(lastCall!.body.minutesSpent).toBe(30);
	});

	test('get - GET /tickets/{id}/timeEntry/{timeEntryId}', async () => {
		const { lastCall } = await executeNode({
			resource: 'timeEntry',
			operation: 'get',
			ticketId: 't1',
			timeEntryId: 'te1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/timeEntry/te1');
	});

	test('update - PATCH /tickets/{id}/timeEntry/{timeEntryId}', async () => {
		const { lastCall } = await executeNode({
			resource: 'timeEntry',
			operation: 'update',
			ticketId: 't1',
			timeEntryId: 'te1',
			timeEntryUpdateFields: { description: 'Updated' },
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/tickets/t1/timeEntry/te1');
		expect(lastCall!.body.description).toBe('Updated');
	});

	test('delete - DELETE /tickets/{id}/timeEntry/{timeEntryId}', async () => {
		const { lastCall } = await executeNode({
			resource: 'timeEntry',
			operation: 'delete',
			ticketId: 't1',
			timeEntryId: 'te1',
		});
		expect(lastCall!.method).toBe('DELETE');
		expect(lastCall!.endpoint).toBe('/tickets/t1/timeEntry/te1');
	});

	test('getSummation - GET /tickets/{id}/timeEntrySummation', async () => {
		const { lastCall } = await executeNode({
			resource: 'timeEntry',
			operation: 'getSummation',
			ticketId: 't1',
			summationOptions: { module: 'tickets' },
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/timeEntrySummation');
		expect(lastCall!.qs.module).toBe('tickets');
	});

	test('getByBillingType - GET /tickets/{id}/timeEntryByBillingType', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'timeEntry',
				operation: 'getByBillingType',
				ticketId: 't1',
				billingType: 'FIXED_COST_FOR_TICKETS',
				billingTypeOptions: { limit: 25 },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/tickets/t1/timeEntryByBillingType');
		expect(lastCall!.qs.billingType).toBe('FIXED_COST_FOR_TICKETS');
	});
});

// ─── Skill Resource ──────────────────────────────────────────────────────────

describe('Skill Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('listSkillTypes - GET /skillTypes', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'skill',
				operation: 'listSkillTypes',
				listSkillTypesOptions: { departmentId: 'dept1' },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/skillTypes');
		expect(lastCall!.qs.departmentId).toBe('dept1');
	});

	test('getSkillType - GET /skillTypes/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'skill',
			operation: 'getSkillType',
			skillTypeId: 'st1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/skillTypes/st1');
	});

	test('createSkillType - POST /skillTypes', async () => {
		const { lastCall } = await executeNode({
			resource: 'skill',
			operation: 'createSkillType',
			skillTypeName: 'Language',
			skillTypeDepartmentId: 'dept1',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/skillTypes');
		expect(lastCall!.body.name).toBe('Language');
		expect(lastCall!.body.departmentId).toBe('dept1');
	});

	test('updateSkillType - PATCH /skillTypes/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'skill',
			operation: 'updateSkillType',
			skillTypeId: 'st1',
			skillTypeUpdateFields: { name: 'Updated Type' },
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/skillTypes/st1');
		expect(lastCall!.body.name).toBe('Updated Type');
	});

	test('deleteSkillType - DELETE /skillTypes/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'skill',
			operation: 'deleteSkillType',
			skillTypeId: 'st1',
		});
		expect(lastCall!.method).toBe('DELETE');
		expect(lastCall!.endpoint).toBe('/skillTypes/st1');
	});

	test('listSkills - GET /skills', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'skill',
				operation: 'listSkills',
				listSkillsOptions: { departmentId: 'dept1', status: 'ACTIVE' },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/skills');
		expect(lastCall!.qs.departmentId).toBe('dept1');
		expect(lastCall!.qs.status).toBe('ACTIVE');
	});

	test('getSkill - GET /skills/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'skill',
			operation: 'getSkill',
			skillId: 'sk1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/skills/sk1');
	});

	test('createSkill - POST /skills', async () => {
		const { lastCall } = await executeNode({
			resource: 'skill',
			operation: 'createSkill',
			skillName: 'Spanish',
			createSkillTypeId: 'st1',
			skillStatus: 'ACTIVE',
			skillCriteria: '{"fieldConditions":[]}',
			createSkillOptions: { description: 'Spanish language', agentIds: 'a1,a2' },
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/skills');
		expect(lastCall!.body.name).toBe('Spanish');
		expect(lastCall!.body.skillTypeId).toBe('st1');
		expect(lastCall!.body.status).toBe('ACTIVE');
		expect(lastCall!.body.description).toBe('Spanish language');
		expect(lastCall!.body.agentIds).toEqual(['a1', 'a2']);
	});

	test('updateSkill - PATCH /skills/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'skill',
			operation: 'updateSkill',
			skillId: 'sk1',
			skillUpdateFields: { name: 'French', status: 'INACTIVE' },
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/skills/sk1');
		expect(lastCall!.body.name).toBe('French');
		expect(lastCall!.body.status).toBe('INACTIVE');
	});

	test('deleteSkill - DELETE /skills/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'skill',
			operation: 'deleteSkill',
			skillId: 'sk1',
		});
		expect(lastCall!.method).toBe('DELETE');
		expect(lastCall!.endpoint).toBe('/skills/sk1');
	});
});

// ─── Agent Resource ──────────────────────────────────────────────────────────

describe('Agent Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('list - GET /agents', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'agent',
				operation: 'list',
				listAgentOptions: { limit: 50, searchStr: 'john' },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/agents');
		expect(lastCall!.qs.limit).toBe(50);
		expect(lastCall!.qs.searchStr).toBe('john');
	});

	test('get - GET /agents/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'agent',
			operation: 'get',
			agentId: 'a1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/agents/a1');
	});

	test('getByEmail - GET /agents with searchStr', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'agent',
				operation: 'getByEmail',
				agentEmail: 'agent@test.com',
			},
			{ data: [{ id: 'a1', email: 'agent@test.com' }] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/agents');
		expect(lastCall!.qs.searchStr).toBe('agent@test.com');
		expect(lastCall!.qs.limit).toBe(1);
	});

	test('getCount - GET /agents/count', async () => {
		const { lastCall } = await executeNode({
			resource: 'agent',
			operation: 'getCount',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/agents/count');
	});

	test('getMyInfo - GET /myinfo', async () => {
		const { lastCall } = await executeNode({
			resource: 'agent',
			operation: 'getMyInfo',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/myinfo');
	});

	test('getPreferences - GET /myPreferences', async () => {
		const { lastCall } = await executeNode({
			resource: 'agent',
			operation: 'getPreferences',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/myPreferences');
	});

	test('updatePreferences - PATCH /myPreferences', async () => {
		const { lastCall } = await executeNode({
			resource: 'agent',
			operation: 'updatePreferences',
			preferencesFields: { currentDepartment: 'dept1' },
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/myPreferences');
		expect(lastCall!.body.currentDepartment).toBe('dept1');
	});

	test('add - POST /agents', async () => {
		const { lastCall } = await executeNode({
			resource: 'agent',
			operation: 'add',
			emailId: 'new@test.com',
			lastName: 'Doe',
			firstName: 'John',
			rolePermissionType: 'AgentPublic',
			associatedDepartmentIds: ['dept1', 'dept2'],
			agentAdditionalFields: { phone: '123456' },
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/agents');
		expect(lastCall!.body.emailId).toBe('new@test.com');
		expect(lastCall!.body.lastName).toBe('Doe');
		expect(lastCall!.body.firstName).toBe('John');
		expect(lastCall!.body.rolePermissionType).toBe('AgentPublic');
		expect(lastCall!.body.associatedDepartmentIds).toEqual(['dept1', 'dept2']);
		expect(lastCall!.body.phone).toBe('123456');
	});

	test('update - PATCH /agents/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'agent',
			operation: 'update',
			agentId: 'a1',
			updateAgentFields: { firstName: 'Jane', status: 'ACTIVE' },
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/agents/a1');
		expect(lastCall!.body.firstName).toBe('Jane');
	});

	test('activate - POST /agents/activate', async () => {
		const { lastCall } = await executeNode({
			resource: 'agent',
			operation: 'activate',
			agentIds: 'a1,a2',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/agents/activate');
		expect(lastCall!.body.agentIds).toEqual(['a1', 'a2']);
	});

	test('deactivate - POST /agents/{id}/deactivate', async () => {
		const { lastCall } = await executeNode({
			resource: 'agent',
			operation: 'deactivate',
			agentId: 'a1',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/agents/a1/deactivate');
	});

	test('deleteUnconfirmed - POST /agents/deleteUnconfirmed', async () => {
		const { lastCall } = await executeNode({
			resource: 'agent',
			operation: 'deleteUnconfirmed',
			agentIds: 'a1,a2',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/agents/deleteUnconfirmed');
		expect(lastCall!.body.agentIds).toEqual(['a1', 'a2']);
	});

	test('getOnline - GET /onlineAgents', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'agent',
				operation: 'getOnline',
				agentDepartmentId: 'dept1',
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/onlineAgents');
		expect(lastCall!.qs.departmentId).toBe('dept1');
	});

	test('getOffline - GET /offlineAgents', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'agent',
				operation: 'getOffline',
				agentDepartmentId: 'dept1',
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/offlineAgents');
		expect(lastCall!.qs.departmentId).toBe('dept1');
	});

	test('getAvailability - GET /agentAvailability', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'agent',
				operation: 'getAvailability',
				agentDepartmentId: 'dept1',
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/agentAvailability');
		expect(lastCall!.qs.departmentId).toBe('dept1');
	});
});

// ─── Business Hour Resource ──────────────────────────────────────────────────

describe('Business Hour Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('list - GET /businessHours', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'businessHour',
				operation: 'list',
				businessHourListOptions: { limit: 50, status: 'ACTIVE' },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/businessHours');
		expect(lastCall!.qs.status).toBe('ACTIVE');
	});

	test('get - GET /businessHours/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'businessHour',
			operation: 'get',
			businessHourId: 'bh1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/businessHours/bh1');
	});

	test('create - POST /businessHours', async () => {
		const { lastCall } = await executeNode({
			resource: 'businessHour',
			operation: 'create',
			businessHourName: 'Weekday Hours',
			businessHourStatus: 'ACTIVE',
			businessHourType: 'SPECIFIC',
			businessHourTimeZoneId: 'Asia/Kolkata',
			businessHourCreateOptions: {},
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/businessHours');
		expect(lastCall!.body.name).toBe('Weekday Hours');
		expect(lastCall!.body.status).toBe('ACTIVE');
		expect(lastCall!.body.type).toBe('SPECIFIC');
		expect(lastCall!.body.timeZoneId).toBe('Asia/Kolkata');
	});

	test('update - PATCH /businessHours/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'businessHour',
			operation: 'update',
			businessHourId: 'bh1',
			businessHourUpdateFields: { name: 'Updated Hours', status: 'INACTIVE' },
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/businessHours/bh1');
		expect(lastCall!.body.name).toBe('Updated Hours');
	});

	test('delete - DELETE /businessHours/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'businessHour',
			operation: 'delete',
			businessHourId: 'bh1',
		});
		expect(lastCall!.method).toBe('DELETE');
		expect(lastCall!.endpoint).toBe('/businessHours/bh1');
	});
});

// ─── Holiday List Resource ───────────────────────────────────────────────────

describe('Holiday List Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('list - GET /holidayList', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'holidayList',
				operation: 'list',
				holidayListListOptions: { limit: 25 },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/holidayList');
	});

	test('get - GET /holidayList/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'holidayList',
			operation: 'get',
			holidayListId: 'hl1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/holidayList/hl1');
	});

	test('create - POST /holidayList', async () => {
		const { lastCall } = await executeNode({
			resource: 'holidayList',
			operation: 'create',
			holidayListName: 'US Holidays 2024',
			holidayListStatus: 'ACTIVE',
			holidays: {
				holiday: [
					{ holidayName: 'Christmas', fromMonth: '12', fromDay: 25, toMonth: '12', toDay: 25 },
				],
			},
			holidayListCreateOptions: { holidayListType: 'RECURRING' },
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/holidayList');
		expect(lastCall!.body.name).toBe('US Holidays 2024');
		expect(lastCall!.body.status).toBe('ACTIVE');
		expect(lastCall!.body.holidays).toEqual([
			{ holidayName: 'Christmas', from: '12-25', to: '12-25' },
		]);
	});

	test('update - PATCH /holidayList/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'holidayList',
			operation: 'update',
			holidayListId: 'hl1',
			holidayListUpdateFields: { name: 'Updated List', status: 'INACTIVE' },
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/holidayList/hl1');
		expect(lastCall!.body.name).toBe('Updated List');
	});

	test('delete - DELETE /holidayList/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'holidayList',
			operation: 'delete',
			holidayListId: 'hl1',
		});
		expect(lastCall!.method).toBe('DELETE');
		expect(lastCall!.endpoint).toBe('/holidayList/hl1');
	});
});

// ─── Organisation Resource ───────────────────────────────────────────────────

describe('Organisation Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('get - GET /organizations/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'organisation',
			operation: 'get',
			organisationId: 'org1',
			organisationGetOptions: { includeCustomDomain: true },
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/organizations/org1');
		expect(lastCall!.qs.includeCustomDomain).toBe(true);
	});

	test('getAll - GET /organizations', async () => {
		const { lastCall } = await executeNode(
			{ resource: 'organisation', operation: 'getAll' },
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/organizations');
	});

	test('getAccessible - GET /accessibleOrganizations', async () => {
		const { lastCall } = await executeNode(
			{ resource: 'organisation', operation: 'getAccessible' },
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/accessibleOrganizations');
	});

	test('update - PATCH /organizations/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'organisation',
			operation: 'update',
			organisationId: 'org1',
			organisationUpdateFields: { companyName: 'New Corp' },
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/organizations/org1');
		expect(lastCall!.body.companyName).toBe('New Corp');
	});
});

// ─── Profile Resource ────────────────────────────────────────────────────────

describe('Profile Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('list - GET /profiles', async () => {
		const { lastCall } = await executeNode(
			{ resource: 'profile', operation: 'list', profileListOptions: {} },
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/profiles');
	});

	test('get - GET /profiles/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'profile',
			operation: 'get',
			profileId: 'p1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/profiles/p1');
	});

	test('clone - POST /profiles/{id}/clone', async () => {
		const { lastCall } = await executeNode({
			resource: 'profile',
			operation: 'clone',
			profileId: 'p1',
			cloneProfileName: 'Cloned Profile',
			cloneProfileOptions: { description: 'A copy' },
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/profiles/p1/clone');
		expect(lastCall!.body.name).toBe('Cloned Profile');
		expect(lastCall!.body.description).toBe('A copy');
	});

	test('update - PATCH /profiles/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'profile',
			operation: 'update',
			profileId: 'p1',
			profileUpdateFields: { name: 'Updated', permissions: '{"ticketView":true}' },
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/profiles/p1');
		expect(lastCall!.body.name).toBe('Updated');
		expect(lastCall!.body.permissions).toEqual({ ticketView: true });
	});

	test('delete - POST /profiles/{id}/delete', async () => {
		const { lastCall } = await executeNode({
			resource: 'profile',
			operation: 'delete',
			profileId: 'p1',
			transferToProfileId: 'p2',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/profiles/p1/delete');
		expect(lastCall!.body.transferToProfileId).toBe('p2');
	});

	test('getCount - GET /profiles/count', async () => {
		const { lastCall } = await executeNode({
			resource: 'profile',
			operation: 'getCount',
			profileCountOptions: {},
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/profiles/count');
	});

	test('listAgents - GET /profiles/{id}/agents', async () => {
		const { lastCall } = await executeNode(
			{
				resource: 'profile',
				operation: 'listAgents',
				profileId: 'p1',
				profileListAgentsOptions: { active: true },
			},
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/profiles/p1/agents');
	});

	test('getMyProfile - GET /myProfile', async () => {
		const { lastCall } = await executeNode({
			resource: 'profile',
			operation: 'getMyProfile',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/myProfile');
	});

	test('getMyPermissions - GET /myProfilePermissions', async () => {
		const { lastCall } = await executeNode({
			resource: 'profile',
			operation: 'getMyPermissions',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/myProfilePermissions');
	});

	test('getLightAgent - GET /lightAgentProfile', async () => {
		const { lastCall } = await executeNode({
			resource: 'profile',
			operation: 'getLightAgent',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/lightAgentProfile');
	});
});

// ─── Role Resource ───────────────────────────────────────────────────────────

describe('Role Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('list - GET /roles', async () => {
		const { lastCall } = await executeNode(
			{ resource: 'role', operation: 'list', roleListOptions: {} },
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/roles');
	});

	test('get - GET /roles/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'role',
			operation: 'get',
			roleId: 'r1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/roles/r1');
	});

	test('create - POST /roles', async () => {
		const { lastCall } = await executeNode({
			resource: 'role',
			operation: 'create',
			roleName: 'Support Manager',
			shareDataWithPeers: true,
			roleCreateOptions: { description: 'Manages support team', reportsTo: 'r0' },
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/roles');
		expect(lastCall!.body.name).toBe('Support Manager');
		expect(lastCall!.body.shareDataWithPeers).toBe(true);
		expect(lastCall!.body.description).toBe('Manages support team');
		expect(lastCall!.body.reportsTo).toBe('r0');
	});

	test('update - PATCH /roles/{id}', async () => {
		const { lastCall } = await executeNode({
			resource: 'role',
			operation: 'update',
			roleId: 'r1',
			roleUpdateFields: { name: 'Senior Agent', shareDataWithPeers: false },
		});
		expect(lastCall!.method).toBe('PATCH');
		expect(lastCall!.endpoint).toBe('/roles/r1');
		expect(lastCall!.body.name).toBe('Senior Agent');
	});

	test('delete - POST /roles/{id}/delete', async () => {
		const { lastCall } = await executeNode({
			resource: 'role',
			operation: 'delete',
			roleId: 'r1',
			transferToRoleId: 'r2',
		});
		expect(lastCall!.method).toBe('POST');
		expect(lastCall!.endpoint).toBe('/roles/r1/delete');
		expect(lastCall!.body.transferToRoleId).toBe('r2');
	});

	test('listAgents - GET /roles/{id}/agents', async () => {
		const { lastCall } = await executeNode({
			resource: 'role',
			operation: 'listAgents',
			roleId: 'r1',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/roles/r1/agents');
	});

	test('getByIds - GET /rolesByIds', async () => {
		const { lastCall } = await executeNode(
			{ resource: 'role', operation: 'getByIds', roleIds: 'r1,r2,r3' },
			{ data: [] },
		);
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/rolesByIds');
		expect(lastCall!.qs.roleIds).toBe('r1,r2,r3');
	});

	test('getPersonal - GET /personalRole', async () => {
		const { lastCall } = await executeNode({
			resource: 'role',
			operation: 'getPersonal',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/personalRole');
	});

	test('getCount - GET /roles/count', async () => {
		const { lastCall } = await executeNode({
			resource: 'role',
			operation: 'getCount',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/roles/count');
	});
});

// ─── Dashboard (ticketMetrics) Resource ──────────────────────────────────────

describe('Dashboard (ticketMetrics) Resource', () => {
	beforeEach(() => {
		lastApiCall = null;
	});

	test('getTicketsCount - GET /ticketsCount', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticketMetrics',
			operation: 'getTicketsCount',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/ticketsCount');
	});

	test('getCountByField - GET /ticketsCountByFieldValues', async () => {
		const { lastCall } = await executeNode({
			resource: 'ticketMetrics',
			operation: 'getCountByField',
			countField: 'priority',
		});
		expect(lastCall!.method).toBe('GET');
		expect(lastCall!.endpoint).toBe('/ticketsCountByFieldValues');
		expect(lastCall!.qs.field).toBe('priority');
	});

	const dashboardOps = [
		{ op: 'getBacklog', endpoint: '/dashboards/backlogTickets' },
		{ op: 'getCreated', endpoint: '/dashboards/createdTickets' },
		{ op: 'getSolved', endpoint: '/dashboards/solvedTickets' },
		{ op: 'getOnHold', endpoint: '/dashboards/onholdTickets' },
		{ op: 'getReopened', endpoint: '/dashboards/reopenedTickets' },
		{ op: 'getResponseCount', endpoint: '/dashboards/responseCount' },
		{ op: 'getResponseTimes', endpoint: '/dashboards/responseTime' },
		{ op: 'getResolutionTimes', endpoint: '/dashboards/ticketsResolutionTime' },
	];

	for (const { op, endpoint } of dashboardOps) {
		test(`${op} - GET ${endpoint} with groupBy and duration`, async () => {
			const { lastCall } = await executeNode({
				resource: 'ticketMetrics',
				operation: op,
				dashboardGroupBy: 'date',
				dashboardDuration: 'LAST_7_DAYS',
				dashboardOptions: { departmentId: 'dept1' },
			});
			expect(lastCall!.method).toBe('GET');
			expect(lastCall!.endpoint).toBe(endpoint);
			expect(lastCall!.qs.groupBy).toBe('date');
			expect(lastCall!.qs.duration).toBe('LAST_7_DAYS');
			expect(lastCall!.qs.departmentId).toBe('dept1');
		});
	}
});

// ─── Error Handling (continueOnFail) ─────────────────────────────────────────

describe('Error Handling', () => {
	test('continueOnFail mode captures errors and continues', async () => {
		const ctx = createMockExecuteFunctions({
			resource: 'record',
			operation: 'get',
			module: 'tickets',
			recordId: 'bad-id',
		});
		ctx.continueOnFail.mockReturnValue(true);
		ctx.helpers.requestOAuth2.mockImplementation(() => {
			throw new Error('NOT_FOUND: Record not found');
		});

		const node = new ZohoDesk();
		const result = await node.execute.call(ctx);
		expect(result[0]!.length).toBe(1);
		expect((result[0]![0] as any).json.error).toContain('NOT_FOUND');
	});

	test('throws NodeOperationError when continueOnFail is false', async () => {
		const ctx = createMockExecuteFunctions({
			resource: 'record',
			operation: 'get',
			module: 'tickets',
			recordId: 'bad-id',
		});
		ctx.continueOnFail.mockReturnValue(false);
		ctx.helpers.requestOAuth2.mockImplementation(() => {
			throw new Error('NOT_FOUND: Record not found');
		});

		const node = new ZohoDesk();
		try {
			await node.execute.call(ctx);
			expect(true).toBe(false); // Should not reach
		} catch (e: any) {
			expect(e.message).toContain('NOT_FOUND');
		}
	});

	test('unknown action throws error', async () => {
		const ctx = createMockExecuteFunctions({
			resource: 'nonexistent',
			operation: 'doSomething',
		});
		setupApiMock(ctx);

		const node = new ZohoDesk();
		try {
			await node.execute.call(ctx);
			expect(true).toBe(false);
		} catch (e: any) {
			expect(e.message).toContain('Unknown action');
		}
	});
});

// ─── Node Description ────────────────────────────────────────────────────────

describe('Node Description', () => {
	test('has correct metadata', () => {
		const node = new ZohoDesk();
		expect(node.description.name).toBe('zohoDesk');
		expect(node.description.displayName).toBe('Zoho Desk');
		expect(node.description.version).toBe(1);
		expect(node.description.usableAsTool).toBe(true);
	});

	test('has all 18 resource options', () => {
		const node = new ZohoDesk();
		const resourceProp = node.description.properties.find(
			(p: any) => p.name === 'resource',
		) as any;
		expect(resourceProp).toBeDefined();
		expect(resourceProp.options.length).toBe(18);
		const values = resourceProp.options.map((o: any) => o.value);
		expect(values).toContain('record');
		expect(values).toContain('ticket');
		expect(values).toContain('comment');
		expect(values).toContain('thread');
		expect(values).toContain('ticketFollower');
		expect(values).toContain('ticketAttachment');
		expect(values).toContain('tag');
		expect(values).toContain('ticketApproval');
		expect(values).toContain('ticketPin');
		expect(values).toContain('timeEntry');
		expect(values).toContain('skill');
		expect(values).toContain('agent');
		expect(values).toContain('businessHour');
		expect(values).toContain('holidayList');
		expect(values).toContain('organisation');
		expect(values).toContain('profile');
		expect(values).toContain('role');
		expect(values).toContain('ticketMetrics');
	});
});

// ─── zohoApiRequest function ─────────────────────────────────────────────────

describe('zohoApiRequest', () => {
	test('sends correct headers and URI', async () => {
		const ctx = createMockExecuteFunctions({});
		let capturedOpts: any;
		ctx.helpers.requestOAuth2.mockImplementation((_cred: string, opts: any) => {
			capturedOpts = opts;
			return Promise.resolve({ ok: true });
		});

		await zohoApiRequest(ctx, 'GET', '/tickets');

		expect(capturedOpts.method).toBe('GET');
		expect(capturedOpts.uri).toBe('https://desk.zoho.com/api/v1/tickets');
		expect(capturedOpts.headers.orgId).toBe('test-org-123');
		expect(capturedOpts.headers['Content-Type']).toBe('application/json');
		expect(capturedOpts.json).toBe(true);
	});

	test('includes query string when provided', async () => {
		const ctx = createMockExecuteFunctions({});
		let capturedOpts: any;
		ctx.helpers.requestOAuth2.mockImplementation((_cred: string, opts: any) => {
			capturedOpts = opts;
			return Promise.resolve({ ok: true });
		});

		await zohoApiRequest(ctx, 'GET', '/tickets', {}, { limit: 10 });
		expect(capturedOpts.qs).toEqual({ limit: 10 });
	});

	test('omits body when empty', async () => {
		const ctx = createMockExecuteFunctions({});
		let capturedOpts: any;
		ctx.helpers.requestOAuth2.mockImplementation((_cred: string, opts: any) => {
			capturedOpts = opts;
			return Promise.resolve({ ok: true });
		});

		await zohoApiRequest(ctx, 'GET', '/tickets');
		expect(capturedOpts.body).toBeUndefined();
	});

	test('includes body when provided', async () => {
		const ctx = createMockExecuteFunctions({});
		let capturedOpts: any;
		ctx.helpers.requestOAuth2.mockImplementation((_cred: string, opts: any) => {
			capturedOpts = opts;
			return Promise.resolve({ ok: true });
		});

		await zohoApiRequest(ctx, 'POST', '/tickets', { subject: 'Test' });
		expect(capturedOpts.body).toEqual({ subject: 'Test' });
	});
});
