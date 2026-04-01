import type { INodeProperties, IDataObject } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import { zohoApiRequest } from '../helpers';

export const ticketSubResourcesProperties: INodeProperties[] = [
	// ─── ticketFollower Operation ─────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['ticketFollower'] } },
		options: [
			{ name: 'Get Followers', value: 'getFollowers', action: 'Get Followers', description: 'Get all followers on a ticket' },
			{ name: 'Add Followers', value: 'addFollower', action: 'Add Followers', description: 'Add one or more agents as followers' },
			{ name: 'Remove Followers', value: 'removeFollower', action: 'Remove Followers', description: 'Remove one or more followers from a ticket' },
		],
		default: 'getFollowers',
	},
	// ─── ticketAttachment Operation ───────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['ticketAttachment'] } },
		options: [
			{ name: 'List', value: 'list', action: 'List Attachments', description: 'List all attachments on a ticket' },
			{ name: 'Create', value: 'create', action: 'Create Attachment', description: 'Attach a file to a ticket' },
			{ name: 'Update', value: 'update', action: 'Update Attachment', description: 'Update attachment visibility (only isPublic can be changed)' },
			{ name: 'Delete', value: 'delete', action: 'Delete Attachment', description: 'Delete an attachment from a ticket' },
		],
		default: 'list',
	},
	// ─── ticketApproval Operation ─────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['ticketApproval'] } },
		options: [
			{ name: 'List', value: 'list', action: 'List Approvals', description: 'List all approvals on a ticket' },
			{ name: 'Create', value: 'create', action: 'Create Approval', description: 'Create an approval request on a ticket' },
			{ name: 'Get', value: 'get', action: 'Get Approval', description: 'Get details of an approval' },
			{ name: 'Approve/Reject', value: 'update', action: 'Approve/Reject', description: 'Approve or reject a pending approval' },
		],
		default: 'list',
	},
	// ─── ticketPin Operation ──────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['ticketPin'] } },
		options: [
			{ name: 'Get Pins', value: 'getPins', action: 'Get Pins', description: 'Get all pinned items on a ticket' },
			{ name: 'Create Pin', value: 'createPin', action: 'Create Pin', description: 'Pin a comment or thread on a ticket' },
			{ name: 'Unpin', value: 'unpin', action: 'Unpin', description: 'Remove one or more pins from a ticket' },
		],
		default: 'getPins',
	},
	// ─── ticketFollower fields ────────────────────────────────────────────────
	{
		displayName: 'Follower Names or IDs',
		name: 'followers',
		type: 'multiOptions',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getAgents',
		},
		default: [],
		displayOptions: {
			show: {
				resource: ['ticketFollower'], operation: ['addFollower', 'removeFollower'],
			},
		},
		description: 'Select one or more agents to add/remove as followers. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── ticketApproval fields ────────────────────────────────────────────────
	{
		displayName: 'Approval ID',
		name: 'approvalId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['ticketApproval'], operation: ['get', 'update'],
			},
		},
		description: 'The ID of the approval',
	},
	{
		displayName: 'Subject',
		name: 'approvalSubject',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['ticketApproval'], operation: ['create'],
			},
		},
		description: 'Subject of the approval request',
	},
	{
		displayName: 'Approver Names or IDs',
		name: 'approverIds',
		type: 'multiOptions',
		required: true,
		typeOptions: { loadOptionsMethod: 'getAgents' },
		default: [],
		displayOptions: {
			show: {
				resource: ['ticketApproval'], operation: ['create'],
			},
		},
		description: 'Agents to submit the approval to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Create Approval Options',
		name: 'createApprovalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticketApproval'], operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Description of the approval request',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'Status of the approval',
			},
		],
	},
	{
		displayName: 'Status',
		name: 'approvalStatus',
		type: 'options',
		required: true,
		default: 'Approved',
		options: [
			{ name: 'Approved', value: 'Approved' },
			{ name: 'Rejected', value: 'Rejected' },
		],
		displayOptions: {
			show: {
				resource: ['ticketApproval'], operation: ['update'],
			},
		},
		description: 'Approve or reject the approval',
	},
	{
		displayName: 'List Approval Options',
		name: 'listApprovalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticketApproval'], operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 25,
				typeOptions: { minValue: 1, maxValue: 100 },
				description: 'Max number of approvals to return',
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description: 'Index of the first approval to return',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'Filter by approval status',
			},
		],
	},
	// ─── ticketAttachment fields ──────────────────────────────────────────────
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['ticketAttachment'], operation: ['update', 'delete'],
			},
		},
		description: 'The ID of the attachment',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the input binary field containing the file data',
		displayOptions: {
			show: {
				resource: ['ticketAttachment'], operation: ['create'],
			},
		},
		description: 'Name of the binary property containing the file to upload. Use a previous node (like "Read Binary File" or "HTTP Request") to load the file.',
	},
	{
		displayName: 'Is Public',
		name: 'attachmentIsPublic',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: ['ticketAttachment'], operation: ['update'],
			},
		},
		description: 'Whether the attachment is visible to end users. To replace a file, delete and re-create the attachment.',
	},
	{
		displayName: 'Attachment Options',
		name: 'attachmentOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticketAttachment'], operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Is Public',
				name: 'isPublic',
				type: 'boolean',
				default: false,
				description: 'Whether the attachment is visible to end users',
			},
		],
	},
	{
		displayName: 'List Attachment Options',
		name: 'listAttachmentOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticketAttachment'], operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 25,
				typeOptions: { minValue: 1, maxValue: 100 },
				description: 'Max number of attachments to return',
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description: 'Index of the first attachment to return',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: '-createdTime',
				options: [
					{ name: 'Created Time (Newest)', value: '-createdTime' },
					{ name: 'Created Time (Oldest)', value: 'createdTime' },
				],
				description: 'Sort order',
			},
			{
				displayName: 'Is Public',
				name: 'isPublic',
				type: 'boolean',
				default: false,
				description: 'Whether to filter by public attachments only',
			},
		],
	},
	// ─── ticketPin fields ─────────────────────────────────────────────────────
	{
		displayName: 'Pin Type',
		name: 'pinType',
		type: 'options',
		required: true,
		default: 'COMMENTS',
		options: [
			{ name: 'Comment', value: 'COMMENTS' },
			{ name: 'Thread', value: 'THREADS' },
		],
		displayOptions: {
			show: {
				resource: ['ticketPin'], operation: ['createPin'],
			},
		},
		description: 'The type of entity to pin',
	},
	{
		displayName: 'Entity ID',
		name: 'pinEntityId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['ticketPin'], operation: ['createPin'],
			},
		},
		description: 'The ID of the comment or thread to pin',
	},
	{
		displayName: 'Pin Options',
		name: 'pinOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticketPin'], operation: ['createPin'],
			},
		},
		options: [
			{
				displayName: 'Is Public',
				name: 'isPublic',
				type: 'boolean',
				default: false,
				description: 'Whether the pin is visible to end users',
			},
		],
	},
	{
		displayName: 'Pin IDs to Remove',
		name: 'unpinIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: '12345,67890',
		displayOptions: {
			show: {
				resource: ['ticketPin'], operation: ['unpin'],
			},
		},
		description: 'Comma-separated IDs of pins to remove',
	},
];

export const executeTicketSubResources: ResourceExecuteHandler = async (context, operation, i) => {
	const resource = context.getNodeParameter('resource', i) as string;
	const actionKey = `${resource}:${operation}`;
	switch (actionKey) {
		// ─── Get Followers ────────────────────────────────────────────────────
		case 'ticketFollower:getFollowers': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const response = await zohoApiRequest(context, 'GET', `/tickets/${encodeURIComponent(ticketId)}/followers`);
			const followers = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(followers as IDataObject[]),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── Add Follower ─────────────────────────────────────────────────────
		case 'ticketFollower:addFollower': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const followers = context.getNodeParameter('followers', i) as string[];
			const response = await zohoApiRequest(
				context,
				'POST',
				`/tickets/${encodeURIComponent(ticketId)}/addFollowers`,
				{ followerIds: followers },
			);
			const result = response || { success: true, ticketId, followerIds: followers };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── Remove Follower ──────────────────────────────────────────────────
		case 'ticketFollower:removeFollower': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const followers = context.getNodeParameter('followers', i) as string[];
			const response = await zohoApiRequest(
				context,
				'POST',
				`/tickets/${encodeURIComponent(ticketId)}/removeFollowers`,
				{ followerIds: followers },
			);
			const result = response || { success: true, ticketId, followerIds: followers };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── List Approvals ───────────────────────────────────────────────────
		case 'ticketApproval:list': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const options = context.getNodeParameter('listApprovalOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			if (options.status) qs.status = options.status;

			const response = await zohoApiRequest(
				context, 'GET',
				`/tickets/${encodeURIComponent(ticketId)}/approvals`,
				{}, qs,
			);
			const approvals = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(approvals as IDataObject[]),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── Get Approval ─────────────────────────────────────────────────────
		case 'ticketApproval:get': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const approvalId = context.getNodeParameter('approvalId', i) as string;

			const response = await zohoApiRequest(
				context, 'GET',
				`/tickets/${encodeURIComponent(ticketId)}/approvals/${encodeURIComponent(approvalId)}`,
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── Create Approval ──────────────────────────────────────────────────
		case 'ticketApproval:create': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const subject = context.getNodeParameter('approvalSubject', i) as string;
			const approverIds = context.getNodeParameter('approverIds', i) as string[];
			const options = context.getNodeParameter('createApprovalOptions', i, {}) as IDataObject;

			const body: Record<string, unknown> = { subject, approverIds };
			if (options.description) body.description = options.description;
			if (options.status) body.status = options.status;

			const response = await zohoApiRequest(
				context, 'POST',
				`/tickets/${encodeURIComponent(ticketId)}/approvals`,
				body,
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── Update Approval ──────────────────────────────────────────────────
		case 'ticketApproval:update': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const approvalId = context.getNodeParameter('approvalId', i) as string;
			const status = context.getNodeParameter('approvalStatus', i) as string;

			const body: Record<string, unknown> = { status };

			const response = await zohoApiRequest(
				context, 'PATCH',
				`/tickets/${encodeURIComponent(ticketId)}/approvals/${encodeURIComponent(approvalId)}`,
				body,
			);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── List Attachments ─────────────────────────────────────────────────
		case 'ticketAttachment:list': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const options = context.getNodeParameter('listAttachmentOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = { include: 'creator' };
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			if (options.sortBy) qs.sortBy = options.sortBy;
			if (options.isPublic !== undefined) qs.isPublic = options.isPublic;

			const response = await zohoApiRequest(
				context, 'GET',
				`/tickets/${encodeURIComponent(ticketId)}/attachments`,
				{}, qs,
			);
			const attachments = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(attachments as IDataObject[]),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── Create Attachment ────────────────────────────────────────────────
		case 'ticketAttachment:create': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const binaryPropertyName = context.getNodeParameter('binaryPropertyName', i) as string;
			const attachmentOptions = context.getNodeParameter('attachmentOptions', i, {}) as IDataObject;

			const binaryData = context.helpers.assertBinaryData(i, binaryPropertyName);
			const dataBuffer = await context.helpers.getBinaryDataBuffer(i, binaryPropertyName);

			const credentials = await context.getCredentials('zohoDeskOAuth2Api');
			const orgId = credentials.orgId as string;
			const datacenter = credentials.datacenter as string || 'com';
			const baseUrl = `https://desk.zoho.${datacenter}/api/v1`;

			const qs = new URLSearchParams();
			if (attachmentOptions.isPublic !== undefined) {
				qs.append('isPublic', String(attachmentOptions.isPublic));
			}
			const qsStr = qs.toString() ? `?${qs.toString()}` : '';

			const response = await context.helpers.requestOAuth2.call(
				context,
				'zohoDeskOAuth2Api',
				{
					method: 'POST',
					uri: `${baseUrl}/tickets/${encodeURIComponent(ticketId)}/attachments${qsStr}`,
					headers: { orgId },
					formData: {
						file: {
							value: dataBuffer,
							options: {
								filename: binaryData.fileName || 'file',
								contentType: binaryData.mimeType || 'application/octet-stream',
							},
						},
					},
					json: true,
				},
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── Update Attachment ────────────────────────────────────────────────
		case 'ticketAttachment:update': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const attachmentId = context.getNodeParameter('attachmentId', i) as string;
			const isPublic = context.getNodeParameter('attachmentIsPublic', i) as boolean;

			const body: Record<string, unknown> = { isPublic };

			const response = await zohoApiRequest(
				context, 'PATCH',
				`/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(attachmentId)}`,
				body,
			);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── Delete Attachment ────────────────────────────────────────────────
		case 'ticketAttachment:delete': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const attachmentId = context.getNodeParameter('attachmentId', i) as string;

			const response = await zohoApiRequest(
				context, 'DELETE',
				`/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(attachmentId)}`,
			);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── Create Pin ───────────────────────────────────────────────────────
		case 'ticketPin:createPin': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const type = context.getNodeParameter('pinType', i) as string;
			const entityId = context.getNodeParameter('pinEntityId', i) as string;
			const pinOptions = context.getNodeParameter('pinOptions', i, {}) as IDataObject;

			const body: Record<string, unknown> = { type, entityId };
			if (pinOptions.isPublic !== undefined) body.isPublic = pinOptions.isPublic;

			const response = await zohoApiRequest(
				context,
				'POST',
				`/tickets/${encodeURIComponent(ticketId)}/pins`,
				body,
			);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── Get Pins ─────────────────────────────────────────────────────────
		case 'ticketPin:getPins': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;

			const response = await zohoApiRequest(
				context,
				'GET',
				`/tickets/${encodeURIComponent(ticketId)}/pins`,
				{},
				{ types: 'comments,threads' },
			);
			const pins = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(pins as IDataObject[]),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		// ─── Unpin ────────────────────────────────────────────────────────────
		case 'ticketPin:unpin': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const unpinIdsStr = context.getNodeParameter('unpinIds', i) as string;
			const ids = unpinIdsStr.split(',').map((id) => id.trim()).filter(Boolean);

			const response = await zohoApiRequest(
				context,
				'POST',
				`/tickets/${encodeURIComponent(ticketId)}/pins/unpin`,
				{ ids },
			);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			return executionData;
		}

		default:
			return [];
	}
};
