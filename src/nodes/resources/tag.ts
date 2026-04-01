import type { INodeProperties, IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import { zohoApiRequest } from '../helpers';

export const tagProperties: INodeProperties[] = [
	// ─── Operation ────────────────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['tag'] } },
		options: [
			{ name: 'Add Tag', value: 'addTag', action: 'Add Tag', description: 'Associate one or more tags to a ticket' },
			{ name: 'Remove Tag', value: 'removeTag', action: 'Remove Tag', description: 'Dissociate one or more tags from a ticket' },
			{ name: 'List All Tags', value: 'listAll', action: 'List All Tags', description: 'List all tags in a department' },
			{ name: 'List Ticket Tags', value: 'listTags', action: 'List Ticket Tags', description: 'List all tags on a ticket' },
			{ name: 'List Tickets by Tag', value: 'listByTag', action: 'List Tickets by Tag', description: 'List tickets associated with a tag' },
		],
		default: 'addTag',
	},
	// ─── Department (listAll) ─────────────────────────────────────────────────
	{
		displayName: 'Department Name or ID',
		name: 'tagDepartmentId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		displayOptions: {
			show: {
				resource: ['tag'], operation: ['listAll'],
			},
		},
		description: 'The department to list tags from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── List All Tags Options ────────────────────────────────────────────────
	{
		displayName: 'List All Tags Options',
		name: 'listAllTagsOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['tag'], operation: ['listAll'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
				typeOptions: { minValue: 1, maxValue: 100 },
				description: 'Max number of tags to return',
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description: 'Index of the first tag to return',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'count',
				options: [
					{ name: 'Count (Descending)', value: 'count' },
					{ name: 'Created Time (Descending)', value: 'createdTime' },
				],
				description: 'Sort order for tags',
			},
		],
	},
	// ─── Tag Names or IDs (addTag / removeTag) ────────────────────────────────
	{
		displayName: 'Tag Names or IDs',
		name: 'tags',
		type: 'multiOptions',
		required: true,
		typeOptions: { loadOptionsMethod: 'getTags' },
		default: [],
		displayOptions: {
			show: {
				resource: ['tag'], operation: ['addTag', 'removeTag'],
			},
		},
		description: 'Tags to add or remove. Choose from the list, or specify names using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── Tag Name or ID (listByTag) ───────────────────────────────────────────
	{
		displayName: 'Tag Name or ID',
		name: 'tagId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getTagsById' },
		default: '',
		displayOptions: {
			show: {
				resource: ['tag'], operation: ['listByTag'],
			},
		},
		description: 'The tag to list tickets for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── List by Tag Options ──────────────────────────────────────────────────
	{
		displayName: 'List by Tag Options',
		name: 'listByTagOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['tag'], operation: ['listByTag'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 25,
				typeOptions: { minValue: 1, maxValue: 100 },
				description: 'Max number of tickets to return',
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description: 'Index of the first ticket to return',
			},
			{
				displayName: 'Assignee',
				name: 'assignee',
				type: 'string',
				default: '',
				description: 'Filter by assignee ID (or "Unassigned")',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'Filter by status (comma-separated)',
			},
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				default: '',
				description: 'Filter by channel (comma-separated)',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'string',
				default: '',
				description: 'Filter by priority (comma-separated)',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: '-createdTime',
				options: [
					{ name: 'Due Date (Ascending)', value: 'dueDate' },
					{ name: 'Recent Thread', value: 'recentThread' },
					{ name: 'Created Time (Newest)', value: '-createdTime' },
					{ name: 'Created Time (Oldest)', value: 'createdTime' },
					{ name: 'Ticket Number (Ascending)', value: 'ticketNumber' },
					{ name: 'Ticket Number (Descending)', value: '-ticketNumber' },
				],
				description: 'Sort order for results',
			},
		],
	},
];

export const executeTag: ResourceExecuteHandler = async (context, operation, i) => {
	const returnData: INodeExecutionData[] = [];

	switch (`tag:${operation}`) {
		// ─── List All Tags ────────────────────────────────────────────────────
		case 'tag:listAll': {
			const departmentId = context.getNodeParameter('tagDepartmentId', i) as string;
			const options = context.getNodeParameter('listAllTagsOptions', i, {}) as IDataObject;

			const qs: Record<string, unknown> = { departmentId };
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			if (options.sortBy) qs.sortBy = options.sortBy;

			const response = await zohoApiRequest(
				context, 'GET', '/ticketTags', {}, qs,
			);
			const tags = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(tags as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Add Tag ──────────────────────────────────────────────────────────
		case 'tag:addTag': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const tags = context.getNodeParameter('tags', i) as string[];
			const response = await zohoApiRequest(
				context, 'POST',
				`/tickets/${encodeURIComponent(ticketId)}/associateTag`,
				{ tags },
			);
			const result = response || { success: true, tags };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Remove Tag ───────────────────────────────────────────────────────
		case 'tag:removeTag': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const tags = context.getNodeParameter('tags', i) as string[];
			const response = await zohoApiRequest(
				context, 'POST',
				`/tickets/${encodeURIComponent(ticketId)}/dissociateTag`,
				{ tags },
			);
			const result = response || { success: true, tags };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── List Tags ────────────────────────────────────────────────────────
		case 'tag:listTags': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const response = await zohoApiRequest(
				context, 'GET',
				`/tickets/${encodeURIComponent(ticketId)}/tags`,
			);
			const tags = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(tags as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── List by Tag ──────────────────────────────────────────────────────
		case 'tag:listByTag': {
			const tagId = context.getNodeParameter('tagId', i) as string;
			const options = context.getNodeParameter('listByTagOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			for (const key of ['limit', 'from', 'assignee', 'status', 'channel', 'priority', 'sortBy']) {
				if (options[key]) qs[key] = options[key];
			}
			const response = await zohoApiRequest(
				context, 'GET',
				`/tags/${encodeURIComponent(tagId)}/tickets`,
				{}, qs,
			);
			const tickets = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(tickets as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}
	}

	return returnData;
};
