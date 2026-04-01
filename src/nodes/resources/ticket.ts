import type { INodeProperties, IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import { zohoApiRequest } from '../helpers';

export const ticketProperties: INodeProperties[] = [
	// ─── Operation ────────────────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['ticket'] } },
		options: [
			{ name: 'Assign Ticket', value: 'assign', action: 'Assign Ticket', description: 'Assign a ticket to an agent or team' },
			{ name: 'Round Robin Assignment', value: 'roundRobinAssign', action: 'Round Robin Assignment', description: 'Assign a ticket using round-robin logic across agents' },
			{ name: 'Shift Based Assignment', value: 'shiftBasedAssign', action: 'Shift Based Assignment', description: 'Assign a ticket based on business hour shifts' },
			{ name: 'Skill Based Assignment', value: 'skillBasedAssign', action: 'Skill Based Assignment', description: 'Assign a ticket to the best-matching agent based on skills' },
			{ name: 'Get Metrics', value: 'getMetrics', action: 'Get Metrics', description: 'Get ticket metrics (response time, resolution time, etc.)' },
			{ name: 'Mark as Read', value: 'markAsRead', action: 'Mark as Read', description: 'Mark a ticket as read' },
			{ name: 'Mark as Unread', value: 'markAsUnread', action: 'Mark as Unread', description: 'Mark a ticket as unread' },
			{ name: 'Merge Tickets', value: 'merge', action: 'Merge Tickets', description: 'Merge one or more tickets into a target ticket' },
			{ name: 'Move Department', value: 'moveDepartment', action: 'Move Department', description: 'Move a ticket to a different department' },
			{ name: 'Share Ticket', value: 'share', action: 'Share Ticket', description: 'Share a ticket with a department' },
			{ name: 'Split Ticket', value: 'split', action: 'Split Ticket', description: 'Split a thread from a ticket into a new ticket' },
		],
		default: 'assign',
	},
	// ─── Target Department (moveDepartment) ──────────────────────────────────
	{
		displayName: 'Target Department Name or ID',
		name: 'departmentId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['moveDepartment'],
			},
		},
		description: 'The department to move the ticket to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── Share Ticket fields ─────────────────────────────────────────────────
	{
		displayName: 'Department Name or ID',
		name: 'shareDepartmentId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['share'],
			},
		},
		description: 'The department to share the ticket with. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Permission',
		name: 'sharePermission',
		type: 'options',
		required: true,
		default: 'READ_ONLY',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['share'],
			},
		},
		options: [
			{ name: 'Read Only', value: 'READ_ONLY' },
			{ name: 'Read & Write', value: 'READ_WRITE' },
			{ name: 'Restricted Access', value: 'RESTRICTED_ACCESS' },
		],
		description: 'The access level the shared department has on this ticket',
	},
	// ─── Merge Ticket fields ─────────────────────────────────────────────────
	{
		displayName: 'Ticket IDs to Merge',
		name: 'mergeTicketIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: '12345,67890',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['merge'],
			},
		},
		description: 'Comma-separated IDs of tickets to merge into the target ticket',
	},
	{
		displayName: 'Field Source (Pick Values From)',
		name: 'mergeSource',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['merge'],
			},
		},
		description: 'For each field, specify which ticket ID\'s value to keep. If not set, the target ticket\'s values are used.',
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getTicketFields',
						},
						default: '',
						description: 'The field to pick a value source for. Choose from the list, or specify using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Source Ticket ID',
						name: 'sourceTicketId',
						type: 'string',
						default: '',
						description: 'The ticket ID whose value to use for this field',
					},
				],
			},
		],
	},
	// ─── Split Ticket fields ─────────────────────────────────────────────────
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['split'],
			},
		},
		description: 'The ID of the thread to split into a new ticket',
	},
];

export const executeTicket: ResourceExecuteHandler = async (context, operation, i) => {
	const returnData: INodeExecutionData[] = [];
	const ticketId = context.getNodeParameter('ticketId', i) as string;

	switch (operation) {
		// ─── Get Metrics ─────────────────────────────────────────────────────
		case 'getMetrics': {
			const response = await zohoApiRequest(
				context,
				'GET',
				`/tickets/${encodeURIComponent(ticketId)}/metrics`,
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Mark as Read ─────────────────────────────────────────────────────
		case 'markAsRead': {
			const response = await zohoApiRequest(
				context,
				'POST',
				`/tickets/${encodeURIComponent(ticketId)}/markAsRead`,
			);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Mark as Unread ───────────────────────────────────────────────────
		case 'markAsUnread': {
			const response = await zohoApiRequest(
				context,
				'POST',
				`/tickets/${encodeURIComponent(ticketId)}/markAsUnRead`,
			);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Merge Tickets ────────────────────────────────────────────────────
		case 'merge': {
			const mergeIdsStr = context.getNodeParameter('mergeTicketIds', i) as string;
			const ids = mergeIdsStr.split(',').map((id) => id.trim()).filter(Boolean);
			const mergeSource = context.getNodeParameter('mergeSource', i, {}) as IDataObject;

			const body: Record<string, unknown> = { ids };

			// Build source object from fixedCollection field entries
			const sourceEntries = (mergeSource.field as IDataObject[] | undefined) || [];
			const source: Record<string, string> = {};
			for (const entry of sourceEntries) {
				const fieldName = entry.fieldName as string;
				const sourceTicketId = entry.sourceTicketId as string;
				if (fieldName && sourceTicketId) {
					source[fieldName] = sourceTicketId;
				}
			}
			if (Object.keys(source).length) body.source = source;

			const response = await zohoApiRequest(
				context,
				'POST',
				`/tickets/${encodeURIComponent(ticketId)}/merge`,
				body,
			);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Move Department ──────────────────────────────────────────────────
		case 'moveDepartment': {
			const departmentId = context.getNodeParameter('departmentId', i) as string;
			const response = await zohoApiRequest(context, 'POST', `/tickets/${encodeURIComponent(ticketId)}/move`, { departmentId });
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Share Ticket ─────────────────────────────────────────────────────
		case 'share': {
			const departmentId = context.getNodeParameter('shareDepartmentId', i) as string;
			const permission = context.getNodeParameter('sharePermission', i) as string;
			const response = await zohoApiRequest(
				context, 'PATCH',
				`/tickets/${encodeURIComponent(ticketId)}`,
				{ sharedDepartments: [{ id: departmentId, type: permission }] },
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Split Ticket ─────────────────────────────────────────────────────
		case 'split': {
			const threadId = context.getNodeParameter('threadId', i) as string;
			const response = await zohoApiRequest(
				context,
				'POST',
				`/tickets/${encodeURIComponent(ticketId)}/threads/${encodeURIComponent(threadId)}/split`,
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		default:
			break;
	}

	return returnData;
};
