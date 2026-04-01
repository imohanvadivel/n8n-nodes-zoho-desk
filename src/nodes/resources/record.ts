import type { INodeProperties, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import {
	zohoApiRequest,
	isCustomModule,
	buildDepartmentField,
	buildLayoutField,
	buildFieldsBody,
} from '../helpers';

export const recordProperties: INodeProperties[] = [
	// ─── Operation ────────────────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['record'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create Record', description: 'Create a record in any module (Tickets, Contacts, Accounts, Tasks, etc.)' },
			{ name: 'Get', value: 'get', action: 'Get Record', description: 'Get a single record by ID from any module' },
			{ name: 'Update', value: 'update', action: 'Update Record', description: 'Update a record in any module' },
			{ name: 'Delete', value: 'delete', action: 'Delete Record', description: 'Delete a record from any module' },
			{ name: 'Search', value: 'search', action: 'Search Records', description: 'Search records in any module' },
		],
		default: 'create',
	},
	// ─── Module ───────────────────────────────────────────────────────────────
	{
		displayName: 'Module Name or ID',
		name: 'module',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getModules' },
		default: '',
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
		description: 'The module to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── Department ───────────────────────────────────────────────────────────
	{
		displayName: 'Department Name or ID',
		name: 'departmentId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		displayOptions: {
			show: {
				resource: ['record'],
			},
			hide: {
				module: ['contacts', 'accounts'],
				operation: ['get', 'delete', 'search'],
			},
		},
		description: 'The department for the record. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── Layout (create only) ─────────────────────────────────────────────────
	{
		displayName: 'Layout Name or ID',
		name: 'layoutId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLayoutsByModuleAndDept',
			loadOptionsDependsOn: ['module', 'departmentId'],
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['record'], operation: ['create'],
			},
		},
		description: 'The layout to use for creating the record. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── Create Fields (resourceMapper) ──────────────────────────────────────
	{
		displayName: 'Map Fields',
		name: 'createFields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['record'], operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['module', 'departmentId', 'layoutId'],
			resourceMapper: {
				resourceMapperMethod: 'getLayoutFieldMapping',
				mode: 'add',
				valuesLabel: 'Layout Fields',
				fieldWords: {
					singular: 'additional field',
					plural: 'additional fields',
				},
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
	},
	// ─── Record ID (get/update/delete) ────────────────────────────────────────
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['record'],
			},
			hide: {
				operation: ['create', 'search'],
			},
		},
		description: 'The ID of the record',
	},
	// ─── Update Fields (resourceMapper) ──────────────────────────────────────
	{
		displayName: 'Fields to Update',
		name: 'updateFields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['record'], operation: ['update'],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['module', 'departmentId'],
			resourceMapper: {
				resourceMapperMethod: 'getUpdateFieldMapping',
				mode: 'add',
				valuesLabel: 'Fields to Update',
				fieldWords: {
					singular: 'field',
					plural: 'fields',
				},
				addAllFields: false,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
	},
	// ─── Search Criteria ──────────────────────────────────────────────────────
	{
		displayName: 'Search Criteria',
		name: 'searchCriteria',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		displayOptions: {
			show: {
				resource: ['record'], operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getSearchFields',
							loadOptionsDependsOn: ['module'],
						},
						default: '',
						description: 'The field to search by. Choose from the list, or specify using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						default: 'is',
						options: [
							{ name: 'Contains', value: 'contains', description: 'Field contains the value (wildcard)' },
							{ name: 'Starts With', value: 'startsWith', description: 'Field starts with the value' },
							{ name: 'Is (Exact Match)', value: 'is', description: 'Field exactly matches the value' },
							{ name: 'Is Empty', value: 'isEmpty', description: 'Field has no value' },
							{ name: 'Is Not Empty', value: 'isNotEmpty', description: 'Field has a value' },
						],
						description: 'The match operator',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'The value to search for (not needed for Is Empty / Is Not Empty)',
					},
				],
			},
		],
		description: 'Search filters — each filter maps to a query parameter on the Zoho Desk search API',
	},
	// ─── Search Options ───────────────────────────────────────────────────────
	{
		displayName: 'Options',
		name: 'searchOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['record'], operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 25,
				typeOptions: { minValue: 1, maxValue: 50 },
				description: 'Max number of results to return (max 50)',
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description: 'Index of the first record to return (for pagination)',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'relevance',
				options: [
					{ name: 'Relevance', value: 'relevance' },
					{ name: 'Created Time (Newest)', value: '-createdTime' },
					{ name: 'Created Time (Oldest)', value: 'createdTime' },
					{ name: 'Modified Time (Newest)', value: '-modifiedTime' },
					{ name: 'Modified Time (Oldest)', value: 'modifiedTime' },
				],
				description: 'Sort order for results',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStatusOptions',
					loadOptionsDependsOn: ['module'],
				},
				default: '',
				description: 'Filter by status. Choose from the list, or specify using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPriorityOptions',
				},
				default: '',
				description: 'Filter by priority. Choose from the list, or specify using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannelOptions',
				},
				default: '',
				description: 'Filter by channel. Choose from the list, or specify using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Department Name or ID',
				name: 'departmentId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getDepartments' },
				default: '',
				description: 'Filter by department. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Contact Name or ID',
				name: 'contactId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getContacts' },
				default: '',
				description: 'Filter by contact. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Account Name or ID',
				name: 'accountId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getAccounts' },
				default: '',
				description: 'Filter by account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Assignee Name or ID',
				name: 'assigneeId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getAgents' },
				default: '',
				description: 'Filter by assigned agent. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Product Name or ID',
				name: 'productId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getProducts' },
				default: '',
				description: 'Filter by product. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Created Time Range',
				name: 'createdTimeRange',
				type: 'string',
				default: '',
				placeholder: '2024-01-01T00:00:00.000Z,2024-12-31T23:59:59.000Z',
				description: 'Filter by creation date range (ISO 8601, comma-separated)',
			},
			{
				displayName: 'Modified Time Range',
				name: 'modifiedTimeRange',
				type: 'string',
				default: '',
				placeholder: '2024-01-01T00:00:00.000Z,2024-12-31T23:59:59.000Z',
				description: 'Filter by modification date range (ISO 8601, comma-separated)',
			},
			{
				displayName: 'Include All',
				name: '_all',
				type: 'boolean',
				default: false,
				description: 'Whether to include all records',
			},
		],
	},
];

export const executeRecord: ResourceExecuteHandler = async (context, operation, i): Promise<INodeExecutionData[]> => {
	const returnData: INodeExecutionData[] = [];

	switch (operation) {
		// ─── Create Record ────────────────────────────────────────────────────
		case 'create': {
			const module = context.getNodeParameter('module', i) as string;
			const departmentId = context.getNodeParameter('departmentId', i, '') as string;
			const layoutId = context.getNodeParameter('layoutId', i, '') as string;
			const fieldsData = context.getNodeParameter('createFields', i, {}) as {
				mappingMode: string;
				value: Record<string, unknown>;
			};

			const body: Record<string, unknown> = {
				...buildDepartmentField(module, departmentId),
				...buildLayoutField(module, layoutId),
				...(fieldsData.value ? buildFieldsBody(module, fieldsData.value) : {}),
			};

			const response = await zohoApiRequest(context, 'POST', `/${module}`, body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Record ───────────────────────────────────────────────────────
		case 'get': {
			const module = context.getNodeParameter('module', i) as string;
			const recordId = context.getNodeParameter('recordId', i) as string;

			const response = await zohoApiRequest(context, 'GET', `/${module}/${encodeURIComponent(recordId)}`);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Record ────────────────────────────────────────────────────
		case 'update': {
			const module = context.getNodeParameter('module', i) as string;
			const recordId = context.getNodeParameter('recordId', i) as string;
			const fieldsData = context.getNodeParameter('updateFields', i, {}) as {
				mappingMode: string;
				value: Record<string, unknown>;
			};

			const body: Record<string, unknown> = fieldsData.value
				? buildFieldsBody(module, fieldsData.value)
				: {};

			const response = await zohoApiRequest(context, 'PATCH', `/${module}/${encodeURIComponent(recordId)}`, body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Delete Record ────────────────────────────────────────────────────
		case 'delete': {
			const module = context.getNodeParameter('module', i) as string;
			const recordId = context.getNodeParameter('recordId', i) as string;

			const idFieldMap: Record<string, string> = {
				tickets: 'ticketIds',
				contacts: 'contactIds',
				accounts: 'accountIds',
				contracts: 'contractIds',
				products: 'productIds',
			};
			const idField = idFieldMap[module] || (isCustomModule(module) ? 'recordIds' : 'entityIds');
			const response = await zohoApiRequest(context, 'POST', `/${module}/moveToTrash`, {
				[idField]: [recordId],
			}) as IDataObject;

			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Search Records ───────────────────────────────────────────────────
		case 'search': {
			const module = context.getNodeParameter('module', i) as string;

			// Modules without a search endpoint
			const noSearchModules = new Set(['contracts']);
			if (noSearchModules.has(module)) {
				throw new NodeOperationError(
					context.getNode(),
					`Search is not supported for the "${module}" module. Use Get Record with a specific ID instead.`,
					{ itemIndex: i },
				);
			}

			const criteria = context.getNodeParameter('searchCriteria', i, {}) as IDataObject;
			const options = context.getNodeParameter('searchOptions', i, {}) as IDataObject;

			const qs: Record<string, unknown> = {
				limit: options.limit ?? 25,
				from: options.from ?? 0,
			};
			if (options.sortBy && options.sortBy !== 'relevance') qs.sortBy = options.sortBy;

			// Module-specific valid search query params from Zoho OAS
			const VALID_SEARCH_PARAMS: Record<string, string[]> = {
				tickets: ['status', 'priority', 'channel', 'departmentId', 'contactId', 'accountId', 'assigneeId', 'productId', 'createdTimeRange', 'modifiedTimeRange'],
				contacts: ['status', 'createdTimeRange', 'modifiedTimeRange'],
				accounts: ['createdTimeRange', 'modifiedTimeRange'],
				tasks: ['status', 'priority', 'departmentId', 'createdTimeRange', 'modifiedTimeRange'],
				calls: ['status', 'priority', 'departmentId', 'createdTimeRange', 'modifiedTimeRange'],
				events: ['status', 'priority', 'departmentId', 'createdTimeRange', 'modifiedTimeRange'],
				products: ['contactId', 'accountId', 'departmentId', 'createdTimeRange', 'modifiedTimeRange'],
			};
			const validParams = VALID_SEARCH_PARAMS[module] ?? ['createdTimeRange', 'modifiedTimeRange'];
			for (const key of validParams) {
				if (options[key]) qs[key] = options[key];
			}
			if (options._all) qs._all = true;

			// Modules/fields that support wildcard contains (*value*)
			const WILDCARD_SUPPORT: Record<string, Set<string>> = {
				tickets: new Set(['subject', 'description', 'contactName', 'tag', 'category', 'channel', 'classification', 'productName']),
				contacts: new Set(['firstName', 'fullName']),
			};
			const wildcardFields = WILDCARD_SUPPORT[module] ?? new Set<string>();

			// Build search filters from criteria
			const filters = (criteria.filter as IDataObject[] | undefined) || [];
			for (const f of filters) {
				const field = f.field as string;
				if (!field || field === '_unsupported') continue;
				const operator = f.operator as string;
				const value = f.value as string;
				if (!field) continue;

				switch (operator) {
					case 'contains':
						// Use *value* for fields that support it, otherwise fall back to value* (startsWith)
						qs[field] = wildcardFields.has(field) ? `*${value}*` : `${value}*`;
						break;
					case 'startsWith':
						qs[field] = `${value}*`;
						break;
					case 'is':
						qs[field] = value;
						break;
					case 'isEmpty':
						qs[field] = '';
						break;
					case 'isNotEmpty':
						qs[field] = '~';
						break;
					default:
						qs[field] = value;
				}
			}

			const response = await zohoApiRequest(
				context,
				'GET',
				`/${module}/search`,
				{},
				qs,
			);
			const records = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(records as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}
	}

	return returnData;
};
