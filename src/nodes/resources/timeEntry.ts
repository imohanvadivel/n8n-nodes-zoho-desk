import type { INodeProperties, IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import { zohoApiRequest } from '../helpers';

export const timeEntryProperties: INodeProperties[] = [
	// ─── Operation ────────────────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['timeEntry'] } },
		options: [
			{ name: 'List', value: 'list', action: 'List Time Entries', description: 'List all time entries on a ticket' },
			{ name: 'Create', value: 'create', action: 'Create Time Entry', description: 'Create a time entry on a ticket' },
			{ name: 'Get', value: 'get', action: 'Get Time Entry', description: 'Get a time entry by ID' },
			{ name: 'Update', value: 'update', action: 'Update Time Entry', description: 'Update an existing time entry' },
			{ name: 'Delete', value: 'delete', action: 'Delete Time Entry', description: 'Delete a time entry' },
			{ name: 'Get Summation', value: 'getSummation', action: 'Get Summation', description: 'Get total hours/minutes/costs for a ticket' },
			{ name: 'Get by Billing Type', value: 'getByBillingType', action: 'Get by Billing Type', description: 'Get time entries by billing type' },
		],
		default: 'create',
	},
	// ─── Time Entry ID ────────────────────────────────────────────────────────
	{
		displayName: 'Time Entry ID',
		name: 'timeEntryId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'], operation: ['get', 'update', 'delete'],
			},
		},
		description: 'The ID of the time entry',
	},
	// ─── Executed Time (create) ───────────────────────────────────────────────
	{
		displayName: 'Executed Time',
		name: 'executedTime',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'], operation: ['create'],
			},
		},
		description: 'The date and time the work was performed',
	},
	// ─── Additional Fields (create) ───────────────────────────────────────────
	{
		displayName: 'Additional Fields',
		name: 'timeEntryAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['timeEntry'], operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Hours Spent',
				name: 'hoursSpent',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 999 },
			},
			{
				displayName: 'Minutes Spent',
				name: 'minutesSpent',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 59 },
			},
			{
				displayName: 'Seconds Spent',
				name: 'secondsSpent',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 59 },
			},
			{
				displayName: 'Is Billable',
				name: 'isBillable',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Request Charge Type',
				name: 'requestChargeType',
				type: 'options',
				default: '',
				options: [
					{ name: 'Customer Service', value: 'Customer Service' },
					{ name: 'Upgrade Request', value: 'Upgrade Request' },
					{ name: 'Product Consultation', value: 'Product Consultation' },
					{ name: 'Support and Maintenance', value: 'Support and Maintenance' },
				],
			},
			{
				displayName: 'Agent Cost Per Hour',
				name: 'agentCostPerHour',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 2 },
			},
			{
				displayName: 'Additional Cost',
				name: 'additionalCost',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 2 },
			},
			{
				displayName: 'Fixed Cost',
				name: 'fixedCost',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 2 },
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				default: 'Manual',
				options: [
					{ name: 'Manual', value: 'Manual' },
					{ name: 'Auto', value: 'Auto' },
				],
			},
			{
				displayName: 'Owner ID',
				name: 'ownerId',
				type: 'string',
				default: '',
				description: 'ID of the agent associated with the time entry',
			},
			{
				displayName: 'Invoice ID',
				name: 'invoiceId',
				type: 'string',
				default: '',
			},
		],
	},
	// ─── Update Fields (update) ───────────────────────────────────────────────
	{
		displayName: 'Update Fields',
		name: 'timeEntryUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['timeEntry'], operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Executed Time',
				name: 'executedTime',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Hours Spent',
				name: 'hoursSpent',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 999 },
			},
			{
				displayName: 'Minutes Spent',
				name: 'minutesSpent',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 59 },
			},
			{
				displayName: 'Seconds Spent',
				name: 'secondsSpent',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 59 },
			},
			{
				displayName: 'Is Billable',
				name: 'isBillable',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Request Charge Type',
				name: 'requestChargeType',
				type: 'options',
				default: '',
				options: [
					{ name: 'Customer Service', value: 'Customer Service' },
					{ name: 'Upgrade Request', value: 'Upgrade Request' },
					{ name: 'Product Consultation', value: 'Product Consultation' },
					{ name: 'Support and Maintenance', value: 'Support and Maintenance' },
				],
			},
			{
				displayName: 'Agent Cost Per Hour',
				name: 'agentCostPerHour',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 2 },
			},
			{
				displayName: 'Additional Cost',
				name: 'additionalCost',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 2 },
			},
			{
				displayName: 'Fixed Cost',
				name: 'fixedCost',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 2 },
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				default: 'Manual',
				options: [
					{ name: 'Manual', value: 'Manual' },
					{ name: 'Auto', value: 'Auto' },
				],
			},
			{
				displayName: 'Owner ID',
				name: 'ownerId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Invoice ID',
				name: 'invoiceId',
				type: 'string',
				default: '',
			},
		],
	},
	// ─── List Options (list) ──────────────────────────────────────────────────
	{
		displayName: 'List Options',
		name: 'timeEntryListOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['timeEntry'], operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Module',
				name: 'module',
				type: 'options',
				default: 'tickets',
				options: [
					{ name: 'Tickets', value: 'tickets' },
					{ name: 'Tasks', value: 'tasks' },
				],
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 25,
				typeOptions: { minValue: 1, maxValue: 100 },
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				default: 'DESC',
				options: [
					{ name: 'Ascending', value: 'ASC' },
					{ name: 'Descending', value: 'DESC' },
				],
			},
			{
				displayName: 'Bill Status',
				name: 'billStatus',
				type: 'options',
				default: '',
				options: [
					{ name: 'All', value: '' },
					{ name: 'Non-Billable', value: 'nonBillable' },
					{ name: 'Billable', value: 'billable' },
					{ name: 'Billed', value: 'billed' },
				],
			},
			{
				displayName: 'Created Time Range',
				name: 'createdTimeRange',
				type: 'string',
				default: '',
				placeholder: '2024-01-01T00:00:00.000Z,2024-12-31T23:59:59.000Z',
			},
			{
				displayName: 'Modified Time Range',
				name: 'modifiedTimeRange',
				type: 'string',
				default: '',
				placeholder: '2024-01-01T00:00:00.000Z,2024-12-31T23:59:59.000Z',
			},
		],
	},
	// ─── Summation Options (getSummation) ─────────────────────────────────────
	{
		displayName: 'Summation Options',
		name: 'summationOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['timeEntry'], operation: ['getSummation'],
			},
		},
		options: [
			{
				displayName: 'Module',
				name: 'module',
				type: 'options',
				default: 'tickets',
				options: [
					{ name: 'Tickets', value: 'tickets' },
					{ name: 'Tasks', value: 'tasks' },
				],
			},
			{
				displayName: 'Bill Status',
				name: 'billStatus',
				type: 'options',
				default: '',
				options: [
					{ name: 'All', value: '' },
					{ name: 'Non-Billable', value: 'nonBillable' },
					{ name: 'Billable', value: 'billable' },
					{ name: 'Billed', value: 'billed' },
				],
			},
		],
	},
	// ─── Billing Type (getByBillingType) ──────────────────────────────────────
	{
		displayName: 'Billing Type',
		name: 'billingType',
		type: 'options',
		required: true,
		default: 'FIXED_COST_FOR_TICKETS',
		options: [
			{ name: 'Fixed Cost for Tickets', value: 'FIXED_COST_FOR_TICKETS' },
			{ name: 'Fixed Cost for Agents', value: 'FIXED_COST_FOR_AGENTS' },
			{ name: 'Specific Cost per Agent', value: 'SPECIFIC_COST_PER_AGENT' },
			{ name: 'Specific Cost per Profile', value: 'SPECIFIC_COST_PER_PROFILE' },
		],
		displayOptions: {
			show: {
				resource: ['timeEntry'], operation: ['getByBillingType'],
			},
		},
		description: 'The billing type to filter time entries by',
	},
	// ─── Billing Type Options (getByBillingType) ──────────────────────────────
	{
		displayName: 'Billing Type Options',
		name: 'billingTypeOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['timeEntry'], operation: ['getByBillingType'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 25,
				typeOptions: { minValue: 1, maxValue: 100 },
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
			},
		],
	},
];

export const executeTimeEntry: ResourceExecuteHandler = async (context, operation, i) => {
	const returnData: INodeExecutionData[] = [];

	switch (`timeEntry:${operation}`) {
		// ─── List Time Entries ────────────────────────────────────────────────
		case 'timeEntry:list': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const options = context.getNodeParameter('timeEntryListOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = { include: 'owner' };
			for (const key of ['module', 'limit', 'from', 'orderBy', 'billStatus', 'createdTimeRange', 'modifiedTimeRange']) {
				if (options[key]) qs[key] = options[key];
			}
			const response = await zohoApiRequest(context, 'GET', `/tickets/${encodeURIComponent(ticketId)}/timeEntry`, {}, qs);
			const entries = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(entries as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Create Time Entry ────────────────────────────────────────────────
		case 'timeEntry:create': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			let executedTime = context.getNodeParameter('executedTime', i) as string;
			// Format to ISO 8601: 2016-06-22T20:30:00.000Z
			if (executedTime && /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/.test(executedTime)) {
				executedTime = executedTime.replace(' ', 'T').replace(/(\d{2}:\d{2}:\d{2})$/, '$1.000Z');
			}
			const additionalFields = context.getNodeParameter('timeEntryAdditionalFields', i, {}) as IDataObject;

			const body: Record<string, unknown> = { executedTime };
			for (const [key, val] of Object.entries(additionalFields)) {
				if (val !== null && val !== undefined && val !== '') {
					body[key] = val;
				}
			}

			const response = await zohoApiRequest(context, 'POST', `/tickets/${encodeURIComponent(ticketId)}/timeEntry`, body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Time Entry ───────────────────────────────────────────────────
		case 'timeEntry:get': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const timeEntryId = context.getNodeParameter('timeEntryId', i) as string;

			const response = await zohoApiRequest(
				context,
				'GET',
				`/tickets/${encodeURIComponent(ticketId)}/timeEntry/${encodeURIComponent(timeEntryId)}`,
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Time Entry ────────────────────────────────────────────────
		case 'timeEntry:update': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const timeEntryId = context.getNodeParameter('timeEntryId', i) as string;
			const updateFields = context.getNodeParameter('timeEntryUpdateFields', i, {}) as IDataObject;

			const body: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(updateFields)) {
				if (val !== null && val !== undefined && val !== '') {
					if (key === 'executedTime' && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/.test(val)) {
						body[key] = val.replace(' ', 'T').replace(/(\d{2}:\d{2}:\d{2})$/, '$1.000Z');
					} else {
						body[key] = val;
					}
				}
			}

			const response = await zohoApiRequest(
				context,
				'PATCH',
				`/tickets/${encodeURIComponent(ticketId)}/timeEntry/${encodeURIComponent(timeEntryId)}`,
				body,
			);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Delete Time Entry ────────────────────────────────────────────────
		case 'timeEntry:delete': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const timeEntryId = context.getNodeParameter('timeEntryId', i) as string;

			const response = await zohoApiRequest(
				context,
				'DELETE',
				`/tickets/${encodeURIComponent(ticketId)}/timeEntry/${encodeURIComponent(timeEntryId)}`,
			);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Summation ────────────────────────────────────────────────────
		case 'timeEntry:getSummation': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const options = context.getNodeParameter('summationOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			if (options.module) qs.module = options.module;
			if (options.billStatus) qs.billStatus = options.billStatus;
			const response = await zohoApiRequest(context, 'GET', `/tickets/${encodeURIComponent(ticketId)}/timeEntrySummation`, {}, qs);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get by Billing Type ──────────────────────────────────────────────
		case 'timeEntry:getByBillingType': {
			const ticketId = context.getNodeParameter('ticketId', i) as string;
			const billingType = context.getNodeParameter('billingType', i) as string;
			const options = context.getNodeParameter('billingTypeOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = { billingType, include: 'owner' };
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			const response = await zohoApiRequest(context, 'GET', `/tickets/${encodeURIComponent(ticketId)}/timeEntryByBillingType`, {}, qs);
			const entries = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(entries as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}
	}

	return returnData;
};
