import type { INodeProperties, IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import { zohoApiRequest } from '../helpers';

export const threadProperties: INodeProperties[] = [
	// ─── Operation ────────────────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['thread'] } },
		options: [
			{ name: 'Get Thread', value: 'getThread', action: 'Get Thread', description: 'Get a single thread by ID' },
			{ name: 'List Threads', value: 'getAll', action: 'List Threads', description: 'List all threads on a ticket' },
			{ name: 'List Conversations', value: 'getConversations', action: 'List Conversations', description: 'List all conversations (threads + comments) on a ticket' },
			{ name: 'Get Original Content', value: 'getOriginalContent', action: 'Get Original Content', description: 'Get original mail content with headers' },
			{ name: 'Send Reply', value: 'sendReply', action: 'Send Reply', description: 'Send a reply (email, facebook, twitter, or forum)' },
			{ name: 'Draft Reply', value: 'draftReply', action: 'Draft Reply', description: 'Create a draft reply (email, facebook, or forum)' },
			{ name: 'Update Draft', value: 'updateDraft', action: 'Update Draft', description: 'Update an existing draft reply' },
			{ name: 'Send for Review', value: 'sendForReview', action: 'Send for Review', description: 'Send a draft thread for review' },
		],
		default: 'getAll',
	},
	// ─── Thread ID ────────────────────────────────────────────────────────────
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['thread'], operation: ['getThread', 'getOriginalContent', 'sendForReview', 'updateDraft'],
			},
		},
		description: 'The ID of the thread',
	},
	// ─── Channel (sendReply) ──────────────────────────────────────────────────
	{
		displayName: 'Channel',
		name: 'threadChannel',
		type: 'options',
		required: true,
		default: 'EMAIL',
		options: [
			{ name: 'Email', value: 'EMAIL' },
			{ name: 'Facebook', value: 'FACEBOOK' },
			{ name: 'Twitter', value: 'TWITTER' },
			{ name: 'Forums', value: 'FORUMS' },
		],
		displayOptions: {
			show: {
				resource: ['thread'], operation: ['sendReply'],
			},
		},
		description: 'The channel to send the reply through',
	},
	// ─── Channel (draftReply / updateDraft) ──────────────────────────────────
	{
		displayName: 'Channel',
		name: 'threadChannel',
		type: 'options',
		required: true,
		default: 'EMAIL',
		options: [
			{ name: 'Email', value: 'EMAIL' },
			{ name: 'Facebook', value: 'FACEBOOK' },
			{ name: 'Forums', value: 'FORUMS' },
		],
		displayOptions: {
			show: {
				resource: ['thread'], operation: ['draftReply', 'updateDraft'],
			},
		},
		description: 'The channel for the draft reply',
	},
	// ─── Content ──────────────────────────────────────────────────────────────
	{
		displayName: 'Content',
		name: 'threadContent',
		type: 'string',
		required: true,
		typeOptions: { rows: 5 },
		default: '',
		displayOptions: {
			show: {
				resource: ['thread'], operation: ['sendReply', 'draftReply', 'updateDraft'],
			},
		},
		description: 'The content of the reply (supports HTML)',
	},
	// ─── From Email Address ───────────────────────────────────────────────────
	{
		displayName: 'From Email Address',
		name: 'fromEmailAddress',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getSupportEmails' },
		default: '',
		displayOptions: {
			show: {
				resource: ['thread'], operation: ['sendReply', 'draftReply', 'updateDraft'],
				threadChannel: ['EMAIL', 'FORUMS'],
			},
		},
		description: 'The support email address to send from (must be configured in your portal). Choose from the list, or specify using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── To ───────────────────────────────────────────────────────────────────
	{
		displayName: 'To',
		name: 'threadTo',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['thread'], operation: ['sendReply', 'draftReply', 'updateDraft'],
				threadChannel: ['EMAIL'],
			},
		},
		description: 'Recipient email address(es), comma-separated',
	},
	// ─── Reply Options ────────────────────────────────────────────────────────
	{
		displayName: 'Reply Options',
		name: 'threadOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['thread'], operation: ['sendReply', 'draftReply', 'updateDraft'],
			},
		},
		options: [
			{
				displayName: 'CC',
				name: 'cc',
				type: 'string',
				default: '',
				description: 'CC email addresses, comma-separated (email only)',
			},
			{
				displayName: 'BCC',
				name: 'bcc',
				type: 'string',
				default: '',
				description: 'BCC email addresses, comma-separated (email only)',
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				default: 'html',
				options: [
					{ name: 'HTML', value: 'html' },
					{ name: 'Plain Text', value: 'plainText' },
				],
				description: 'The format of the content',
			},
			{
				displayName: 'Is Forward',
				name: 'isForward',
				type: 'boolean',
				default: false,
				description: 'Whether this is a forwarded message (email only)',
			},
			{
				displayName: 'Is Private',
				name: 'isPrivate',
				type: 'boolean',
				default: false,
				description: 'Whether the thread is private. Forwarded threads are always private.',
			},
			{
				displayName: 'In Reply To Thread ID',
				name: 'inReplyToThreadId',
				type: 'string',
				default: '',
				description: 'ID of the thread this is a reply to (email only)',
			},
			{
				displayName: 'Attachment IDs',
				name: 'attachmentIds',
				type: 'string',
				default: '',
				placeholder: '12345,67890',
				description: 'Comma-separated attachment IDs to include (email only). Upload attachments first via Ticket Attachment > Create.',
			},
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				default: 'out',
				options: [
					{ name: 'Outgoing', value: 'out' },
					{ name: 'Incoming', value: 'in' },
				],
				description: 'Whether the thread is incoming or outgoing',
			},
			{
				displayName: 'Send Immediately',
				name: 'sendImmediately',
				type: 'boolean',
				default: false,
				description: 'Whether to send the reply immediately',
			},
			{
				displayName: 'Ticket Status',
				name: 'ticketStatus',
				type: 'string',
				default: '',
				description: 'Set ticket status after sending (e.g. Open, Closed). Supports custom statuses.',
			},
		],
	},
	// ─── List Options ─────────────────────────────────────────────────────────
	{
		displayName: 'List Options',
		name: 'threadListOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['thread'], operation: ['getAll', 'getConversations'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 25,
				typeOptions: { minValue: 1, maxValue: 100 },
				description: 'Max number of threads to return',
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description: 'Index of the first thread to return',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: '-sendDateTime',
				options: [
					{ name: 'Newest First', value: '-sendDateTime' },
					{ name: 'Oldest First', value: 'sendDateTime' },
				],
				description: 'Sort order for threads',
			},
		],
	},
];

export const executeThread: ResourceExecuteHandler = async (context, operation, i) => {
	const returnData: INodeExecutionData[] = [];

	switch (`thread:${operation}`) {
		// ─── Get Thread ───────────────────────────────────────────────────────
		case 'thread:getThread': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const threadId = context.getNodeParameter('threadId', i) as string;

			const response = await zohoApiRequest(
				context,
				'GET',
				`/tickets/${encodeURIComponent(ticketId)}/threads/${encodeURIComponent(threadId)}`,
				{},
				{ include: 'plainText' },
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── List All Threads ─────────────────────────────────────────────────
		case 'thread:getAll': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const options = context.getNodeParameter('threadListOptions', i, {}) as IDataObject;

			const qs: Record<string, unknown> = {};
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			if (options.sortBy) qs.sortBy = options.sortBy;

			const response = await zohoApiRequest(
				context,
				'GET',
				`/tickets/${encodeURIComponent(ticketId)}/threads`,
				{},
				qs,
			);
			const threads = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(threads as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── List Conversations ───────────────────────────────────────────────
		case 'thread:getConversations': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const options = context.getNodeParameter('threadListOptions', i, {}) as IDataObject;

			const qs: Record<string, unknown> = {};
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			if (options.sortBy) qs.sortBy = options.sortBy;

			const response = await zohoApiRequest(
				context,
				'GET',
				`/tickets/${encodeURIComponent(ticketId)}/conversations`,
				{},
				qs,
			);
			const conversations = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(conversations as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Send for Review ──────────────────────────────────────────────────
		case 'thread:sendForReview': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const threadId = context.getNodeParameter('threadId', i) as string;

			const response = await zohoApiRequest(
				context,
				'POST',
				`/tickets/${encodeURIComponent(ticketId)}/threads/${encodeURIComponent(threadId)}/sendForReview`,
			);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Original Mail Content ────────────────────────────────────────
		case 'thread:getOriginalContent': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const threadId = context.getNodeParameter('threadId', i) as string;

			const response = await zohoApiRequest(
				context,
				'GET',
				`/tickets/${encodeURIComponent(ticketId)}/threads/${encodeURIComponent(threadId)}/originalContent`,
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Send Reply ───────────────────────────────────────────────────────
		case 'thread:sendReply': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const channel = context.getNodeParameter('threadChannel', i) as string;
			const content = context.getNodeParameter('threadContent', i) as string;
			const options = context.getNodeParameter('threadOptions', i, {}) as IDataObject;

			const body: Record<string, unknown> = { channel, content };

			if (channel === 'EMAIL' || channel === 'FORUMS') {
				body.fromEmailAddress = context.getNodeParameter('fromEmailAddress', i, '') as string;
			}
			if (channel === 'EMAIL') {
				const to = context.getNodeParameter('threadTo', i, '') as string;
				if (to) body.to = to;
			}

			// Add optional fields
			if (options.cc) body.cc = options.cc;
			if (options.bcc) body.bcc = options.bcc;
			if (options.contentType) body.contentType = options.contentType;
			if (options.isForward) body.isForward = options.isForward;
			if (options.isPrivate !== undefined) body.isPrivate = options.isPrivate;
			if (options.inReplyToThreadId) body.inReplyToThreadId = options.inReplyToThreadId;
			if (options.direction) body.direction = options.direction;
			if (options.sendImmediately !== undefined) body.sendImmediately = options.sendImmediately;
			if (options.ticketStatus) body.ticketStatus = options.ticketStatus;
			if (options.attachmentIds) {
				body.attachmentIds = (options.attachmentIds as string).split(',').map((id) => id.trim()).filter(Boolean);
			}

			const response = await zohoApiRequest(
				context,
				'POST',
				`/tickets/${encodeURIComponent(ticketId)}/sendReply`,
				body,
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Draft Reply ──────────────────────────────────────────────────────
		case 'thread:draftReply': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const channel = context.getNodeParameter('threadChannel', i) as string;
			const content = context.getNodeParameter('threadContent', i) as string;
			const options = context.getNodeParameter('threadOptions', i, {}) as IDataObject;

			const body: Record<string, unknown> = { channel, content };

			if (channel === 'EMAIL' || channel === 'FORUMS') {
				body.fromEmailAddress = context.getNodeParameter('fromEmailAddress', i, '') as string;
			}
			if (channel === 'EMAIL') {
				const to = context.getNodeParameter('threadTo', i, '') as string;
				if (to) body.to = to;
			}

			if (options.cc) body.cc = options.cc;
			if (options.bcc) body.bcc = options.bcc;
			if (options.contentType) body.contentType = options.contentType;
			if (options.isPrivate !== undefined) body.isPrivate = options.isPrivate;
			if (options.inReplyToThreadId) body.inReplyToThreadId = options.inReplyToThreadId;
			if (options.direction) body.direction = options.direction;
			if (options.ticketStatus) body.ticketStatus = options.ticketStatus;
			if (options.attachmentIds) {
				body.attachmentIds = (options.attachmentIds as string).split(',').map((id) => id.trim()).filter(Boolean);
			}

			const response = await zohoApiRequest(
				context,
				'POST',
				`/tickets/${encodeURIComponent(ticketId)}/draftReply`,
				body,
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Draft ─────────────────────────────────────────────────────
		case 'thread:updateDraft': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const threadId = context.getNodeParameter('threadId', i) as string;
			const channel = context.getNodeParameter('threadChannel', i) as string;
			const content = context.getNodeParameter('threadContent', i) as string;
			const options = context.getNodeParameter('threadOptions', i, {}) as IDataObject;

			const body: Record<string, unknown> = { channel, content };

			if (channel === 'EMAIL' || channel === 'FORUMS') {
				body.fromEmailAddress = context.getNodeParameter('fromEmailAddress', i, '') as string;
			}
			if (channel === 'EMAIL') {
				const to = context.getNodeParameter('threadTo', i, '') as string;
				if (to) body.to = to;
			}

			if (options.cc) body.cc = options.cc;
			if (options.bcc) body.bcc = options.bcc;
			if (options.contentType) body.contentType = options.contentType;
			if (options.isPrivate !== undefined) body.isPrivate = options.isPrivate;
			if (options.inReplyToThreadId) body.inReplyToThreadId = options.inReplyToThreadId;
			if (options.direction) body.direction = options.direction;
			if (options.ticketStatus) body.ticketStatus = options.ticketStatus;
			if (options.attachmentIds) {
				body.attachmentIds = (options.attachmentIds as string).split(',').map((id) => id.trim()).filter(Boolean);
			}

			const response = await zohoApiRequest(
				context,
				'PATCH',
				`/tickets/${encodeURIComponent(ticketId)}/draftReply/${encodeURIComponent(threadId)}`,
				body,
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}
	}

	return returnData;
};
