import type { INodeProperties, IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import { zohoApiRequest } from '../helpers';

export const ticketMetricsProperties: INodeProperties[] = [
	// ─── Operation ────────────────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['ticketMetrics'] } },
		options: [
			{ name: 'Get Tickets Count', value: 'getTicketsCount', action: 'Get Tickets Count', description: 'Get total ticket count' },
			{ name: 'Get Count by Field', value: 'getCountByField', action: 'Get Count by Field', description: 'Get ticket count grouped by field' },
			{ name: 'Get Unresolved Count', value: 'getBacklog', action: 'Get Unresolved Count', description: 'Get unresolved/backlog tickets count' },
			{ name: 'Get Created Count', value: 'getCreated', action: 'Get Created Count', description: 'Get created tickets count' },
			{ name: 'Get Closed Count', value: 'getSolved', action: 'Get Closed Count', description: 'Get closed/solved tickets count' },
			{ name: 'Get On Hold Count', value: 'getOnHold', action: 'Get On Hold Count', description: 'Get on-hold tickets count' },
			{ name: 'Get Reopened Count', value: 'getReopened', action: 'Get Reopened Count', description: 'Get reopened tickets count' },
			{ name: 'Get Response Count', value: 'getResponseCount', action: 'Get Response Count', description: 'Get total response count' },
			{ name: 'Get Response Times', value: 'getResponseTimes', action: 'Get Response Times', description: 'Get response time metrics' },
			{ name: 'Get Resolution Times', value: 'getResolutionTimes', action: 'Get Resolution Times', description: 'Get resolution time metrics' },
		],
		default: 'getTicketsCount',
	},
	// ─── Count Field (getCountByField) ────────────────────────────────────────
	{
		displayName: 'Field',
		name: 'countField',
		type: 'options',
		required: true,
		default: 'status',
		options: [
			{ name: 'Status', value: 'status' },
			{ name: 'Status Type', value: 'statusType' },
			{ name: 'Priority', value: 'priority' },
			{ name: 'Channel', value: 'channel' },
			{ name: 'Spam', value: 'spam' },
			{ name: 'Escalated', value: 'escalated' },
			{ name: 'Overdue', value: 'overDue' },
		],
		displayOptions: {
			show: {
				resource: ['ticketMetrics'], operation: ['getCountByField'],
			},
		},
		description: 'The field to group ticket counts by',
	},
	// ─── Group By (dashboard operations) ─────────────────────────────────────
	{
		displayName: 'Group By',
		name: 'dashboardGroupBy',
		type: 'options',
		required: true,
		default: 'date',
		options: [
			{ name: 'Date', value: 'date' },
			{ name: 'Channel', value: 'channel' },
			{ name: 'Agent', value: 'agent' },
			{ name: 'Hour', value: 'hour' },
		],
		displayOptions: {
			show: {
				resource: ['ticketMetrics'],
				operation: ['getBacklog', 'getCreated', 'getSolved', 'getOnHold', 'getReopened', 'getResponseCount', 'getResponseTimes', 'getResolutionTimes'],
			},
		},
		description: 'Group the results by this attribute',
	},
	// ─── Duration (dashboard operations) ─────────────────────────────────────
	{
		displayName: 'Duration',
		name: 'dashboardDuration',
		type: 'options',
		required: true,
		default: 'LAST_7_DAYS',
		options: [
			{ name: 'Today', value: 'TODAY' },
			{ name: 'Last 7 Days', value: 'LAST_7_DAYS' },
			{ name: 'Last 30 Days', value: 'LAST_30_DAYS' },
			{ name: 'This Week', value: 'THIS_WEEK' },
			{ name: 'This Month', value: 'THIS_MONTH' },
			{ name: 'Last Month', value: 'LAST_MONTH' },
			{ name: 'Custom', value: 'CUSTOM_IN_DATE' },
		],
		displayOptions: {
			show: {
				resource: ['ticketMetrics'],
				operation: ['getBacklog', 'getCreated', 'getSolved', 'getOnHold', 'getReopened', 'getResponseCount', 'getResponseTimes', 'getResolutionTimes'],
			},
		},
		description: 'The time range for the metrics',
	},
	// ─── Dashboard Options (dashboard operations) ─────────────────────────────
	{
		displayName: 'Dashboard Options',
		name: 'dashboardOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticketMetrics'],
				operation: ['getBacklog', 'getCreated', 'getSolved', 'getOnHold', 'getReopened', 'getResponseCount', 'getResponseTimes', 'getResolutionTimes'],
			},
		},
		options: [
			{
				displayName: 'Department ID',
				name: 'departmentId',
				type: 'string',
				default: '',
				description: 'Filter by department ID (comma-separated for multiple)',
			},
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				description: 'Filter by agent ID (comma-separated for multiple)',
			},
			{
				displayName: 'Team ID',
				name: 'teamId',
				type: 'string',
				default: '',
				description: 'Filter by team ID (comma-separated for multiple)',
			},
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				default: '',
				description: 'Filter by channel',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'string',
				default: '',
				placeholder: '01-01-2024',
				description: 'Start date for custom duration (dd-MM-yyyy)',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'string',
				default: '',
				placeholder: '31-12-2024',
				description: 'End date for custom duration (dd-MM-yyyy)',
			},
			{
				displayName: 'Is First Response',
				name: 'isFirstResponse',
				type: 'boolean',
				default: true,
				description: 'Whether to filter by first response only (response time metrics only)',
			},
		],
	},
];

export const executeTicketMetrics: ResourceExecuteHandler = async (context, operation, i) => {
	const returnData: INodeExecutionData[] = [];

	switch (`ticketMetrics:${operation}`) {
		// ─── Get Tickets Count ────────────────────────────────────────────────
		case 'ticketMetrics:getTicketsCount': {
			const response = await zohoApiRequest(context, 'GET', '/ticketsCount');
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Count by Field ───────────────────────────────────────────────
		case 'ticketMetrics:getCountByField': {
			const countField = context.getNodeParameter('countField', i) as string;
			const response = await zohoApiRequest(context, 'GET', '/ticketsCountByFieldValues', {}, { field: countField });
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Dashboard Metrics (shared handler) ───────────────────────────────
		case 'ticketMetrics:getBacklog':
		case 'ticketMetrics:getCreated':
		case 'ticketMetrics:getSolved':
		case 'ticketMetrics:getOnHold':
		case 'ticketMetrics:getReopened':
		case 'ticketMetrics:getResponseCount':
		case 'ticketMetrics:getResponseTimes':
		case 'ticketMetrics:getResolutionTimes': {
			const ENDPOINT_MAP: Record<string, string> = {
				'ticketMetrics:getBacklog': '/dashboards/backlogTickets',
				'ticketMetrics:getCreated': '/dashboards/createdTickets',
				'ticketMetrics:getSolved': '/dashboards/solvedTickets',
				'ticketMetrics:getOnHold': '/dashboards/onholdTickets',
				'ticketMetrics:getReopened': '/dashboards/reopenedTickets',
				'ticketMetrics:getResponseCount': '/dashboards/responseCount',
				'ticketMetrics:getResponseTimes': '/dashboards/responseTime',
				'ticketMetrics:getResolutionTimes': '/dashboards/ticketsResolutionTime',
			};
			const actionKey = `ticketMetrics:${operation}`;
			const endpoint = ENDPOINT_MAP[actionKey] as string;
			const groupBy = context.getNodeParameter('dashboardGroupBy', i) as string;
			const duration = context.getNodeParameter('dashboardDuration', i) as string;
			const options = context.getNodeParameter('dashboardOptions', i, {}) as IDataObject;

			const qs: Record<string, unknown> = { groupBy, duration };
			for (const key of ['departmentId', 'agentId', 'teamId', 'channel', 'startDate', 'endDate', 'isFirstResponse']) {
				if (options[key] !== undefined && options[key] !== '') qs[key] = options[key];
			}

			const response = await zohoApiRequest(context, 'GET', endpoint, {}, qs);
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
