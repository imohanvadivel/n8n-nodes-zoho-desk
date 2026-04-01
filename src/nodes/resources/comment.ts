import type { INodeProperties, IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import { zohoApiRequest } from '../helpers';

export const commentProperties: INodeProperties[] = [
	// ─── Operation ────────────────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['comment'] } },
		options: [
			{ name: 'Add', value: 'add', action: 'Add Comment', description: 'Add a comment to a record' },
			{ name: 'Get All', value: 'getAll', action: 'Get All Comments', description: 'Get all comments on a record' },
			{ name: 'Update', value: 'update', action: 'Update Comment', description: 'Update an existing comment' },
			{ name: 'Delete', value: 'delete', action: 'Delete Comment', description: 'Delete a comment from a record' },
		],
		default: 'add',
	},
	// ─── Module ───────────────────────────────────────────────────────────────
	{
		displayName: 'Module Name or ID',
		name: 'module',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getCommentModules' },
		default: 'tickets',
		displayOptions: {
			show: {
				resource: ['comment'],
			},
		},
		description: 'The module to add/update/delete comments on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── Department (scoped to comment) ──────────────────────────────────────
	{
		displayName: 'Department Name or ID',
		name: 'departmentId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		displayOptions: {
			show: {
				resource: ['comment'],
			},
			hide: {
				module: ['contacts', 'accounts'],
				operation: ['get', 'delete', 'search'],
			},
		},
		description: 'The department for the record. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── Record ID (scoped to comment) ───────────────────────────────────────
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['comment'],
			},
			hide: {
				operation: ['create', 'search'],
			},
		},
		description: 'The ID of the record',
	},
	// ─── Comment ID ───────────────────────────────────────────────────────────
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['comment'], operation: ['update', 'delete'],
			},
		},
		description: 'The ID of the comment',
	},
	// ─── Comment Content ──────────────────────────────────────────────────────
	{
		displayName: 'Comment',
		name: 'content',
		type: 'string',
		required: true,
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: {
			show: {
				resource: ['comment'], operation: ['add', 'update'],
			},
		},
		description: 'The content of the comment (supports HTML for tickets)',
	},
	// ─── Comment Options (add) ────────────────────────────────────────────────
	{
		displayName: 'Comment Options',
		name: 'commentOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['comment'], operation: ['add'],
			},
		},
		options: [
			{
				displayName: 'Is Public',
				name: 'isPublic',
				type: 'boolean',
				default: false,
				description: 'Whether the comment is visible to end users/customers (tickets only)',
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				default: 'plainText',
				options: [
					{ name: 'Plain Text', value: 'plainText' },
					{ name: 'HTML', value: 'html' },
				],
				description: 'The format of the comment content (tickets only)',
			},
		],
	},
	// ─── Get All Options ──────────────────────────────────────────────────────
	{
		displayName: 'Get All Options',
		name: 'commentGetAllOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['comment'], operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 25,
				typeOptions: { minValue: 1, maxValue: 100 },
				description: 'Max number of comments to return',
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description: 'Index of the first comment to return (for pagination)',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'commentedTime',
				options: [
					{ name: 'Commented Time (Newest)', value: '-commentedTime' },
					{ name: 'Commented Time (Oldest)', value: 'commentedTime' },
				],
				description: 'Sort order for comments',
			},
		],
	},
];

export const executeComment: ResourceExecuteHandler = async (context, operation, i) => {
	const returnData: INodeExecutionData[] = [];

	switch (`comment:${operation}`) {
		// ─── Get All Comments ─────────────────────────────────────────────────
		case 'comment:getAll': {
			const module = context.getNodeParameter('module', i) as string;
			const recordId = context.getNodeParameter('recordId', i) as string;
			const options = context.getNodeParameter('commentGetAllOptions', i, {}) as IDataObject;

			const qs: Record<string, unknown> = {};
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			if (options.sortBy) qs.sortBy = options.sortBy;

			const response = await zohoApiRequest(
				context,
				'GET',
				`/${module}/${encodeURIComponent(recordId)}/comments`,
				{},
				qs,
			);
			const comments = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(comments as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Add Comment ──────────────────────────────────────────────────────
		case 'comment:add': {
			const module = context.getNodeParameter('module', i) as string;
			const recordId = context.getNodeParameter('recordId', i) as string;
			const content = context.getNodeParameter('content', i) as string;
			const commentOptions = context.getNodeParameter('commentOptions', i, {}) as IDataObject;

			const body: Record<string, unknown> = { content };

			// isPublic and contentType only apply to tickets
			if (module === 'tickets') {
				if (commentOptions.isPublic !== undefined) body.isPublic = commentOptions.isPublic;
				if (commentOptions.contentType) body.contentType = commentOptions.contentType;
			}

			const response = await zohoApiRequest(
				context,
				'POST',
				`/${module}/${encodeURIComponent(recordId)}/comments`,
				body,
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Comment ───────────────────────────────────────────────────
		case 'comment:update': {
			const module = context.getNodeParameter('module', i) as string;
			const recordId = context.getNodeParameter('recordId', i) as string;
			const commentId = context.getNodeParameter('commentId', i) as string;
			const content = context.getNodeParameter('content', i) as string;

			// Tickets use PATCH, all other modules use PUT
			const method = module === 'tickets' ? 'PATCH' : 'PUT';
			const response = await zohoApiRequest(
				context,
				method,
				`/${module}/${encodeURIComponent(recordId)}/comments/${encodeURIComponent(commentId)}`,
				{ content },
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Delete Comment ───────────────────────────────────────────────────
		case 'comment:delete': {
			const module = context.getNodeParameter('module', i) as string;
			const recordId = context.getNodeParameter('recordId', i) as string;
			const commentId = context.getNodeParameter('commentId', i) as string;

			const response = await zohoApiRequest(
				context,
				'DELETE',
				`/${module}/${encodeURIComponent(recordId)}/comments/${encodeURIComponent(commentId)}`,
			);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}
	}

	return returnData;
};
