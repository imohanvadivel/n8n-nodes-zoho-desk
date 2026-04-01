import type { INodeProperties, IDataObject } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import { zohoApiRequest } from '../helpers';

export const agentProperties: INodeProperties[] = [
	// ─── Operation ────────────────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['agent'] } },
		options: [
			{ name: 'List', value: 'list', action: 'List Agents', description: 'List all agents' },
			{ name: 'Get', value: 'get', action: 'Get Agent', description: 'Get agent details by ID' },
			{ name: 'Get by Email', value: 'getByEmail', action: 'Get by Email', description: 'Get agent by email address' },
			{ name: 'Get Count', value: 'getCount', action: 'Get Agent Count', description: 'Get total agent count' },
			{ name: 'Get My Info', value: 'getMyInfo', action: 'Get My Info', description: 'Get current agent information' },
			{ name: 'Get My Preferences', value: 'getPreferences', action: 'Get My Preferences', description: 'Get current agent preferences' },
			{ name: 'Update My Preferences', value: 'updatePreferences', action: 'Update My Preferences', description: 'Update current agent preferences' },
			{ name: 'Add', value: 'add', action: 'Add Agent', description: 'Invite a new agent to your organization' },
			{ name: 'Update', value: 'update', action: 'Update Agent', description: 'Update an existing agent' },
			{ name: 'Activate', value: 'activate', action: 'Activate Agents', description: 'Activate one or more agents' },
			{ name: 'Deactivate', value: 'deactivate', action: 'Deactivate Agent', description: 'Deactivate an agent' },
			{ name: 'Delete Unconfirmed', value: 'deleteUnconfirmed', action: 'Delete Unconfirmed', description: 'Delete unconfirmed agents' },
			{ name: 'Get Online Agents', value: 'getOnline', action: 'Get Online Agents', description: 'Get list of online agents' },
			{ name: 'Get Offline Agents', value: 'getOffline', action: 'Get Offline Agents', description: 'Get list of offline agents' },
			{ name: 'Get Availability', value: 'getAvailability', action: 'Get Availability', description: 'Get current agent availability' },
		],
		default: 'list',
	},
	// ─── Agent fields ─────────────────────────────────────────────────────────
	{
		displayName: 'Department Name or ID',
		name: 'agentDepartmentId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['getOnline', 'getOffline', 'getAvailability'],
			},
		},
		description: 'The department to check agent availability for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['get', 'update', 'deactivate'],
			},
		},
		description: 'The ID of the agent',
	},
	{
		displayName: 'Email',
		name: 'agentEmail',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'agent@example.com',
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['getByEmail'],
			},
		},
		description: 'The email address of the agent',
	},
	{
		displayName: 'Agent IDs',
		name: 'agentIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: '12345,67890',
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['activate', 'deleteUnconfirmed'],
			},
		},
		description: 'Comma-separated IDs of agents',
	},
	{
		displayName: 'List Agent Options',
		name: 'listAgentOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 200 },
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
			},
			{
				displayName: 'Search',
				name: 'searchStr',
				type: 'string',
				default: '',
				description: 'Search agents by name or email',
			},
			{
				displayName: 'Department IDs',
				name: 'departmentIds',
				type: 'string',
				default: '',
				description: 'Comma-separated department IDs to filter by',
			},
			{
				displayName: 'Role Permission Type',
				name: 'rolePermissionType',
				type: 'string',
				default: '',
				description: 'Filter by role permission type',
			},
		],
	},
	{
		displayName: 'Update Agent Fields',
		name: 'updateAgentFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile',
				name: 'mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Extension',
				name: 'extn',
				type: 'string',
				default: '',
			},
			{
				displayName: 'About',
				name: 'aboutInfo',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'ACTIVE',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Disabled', value: 'DISABLED' },
				],
			},
		],
	},
	{
		displayName: 'Preferences',
		name: 'preferencesFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['updatePreferences'],
			},
		},
		options: [
			{
				displayName: 'Current Department ID',
				name: 'currentDepartment',
				type: 'string',
				default: '',
			},
		],
	},
	// ─── Add Agent fields ──────────────────────────────────────────────────────
	{
		displayName: 'Email',
		name: 'emailId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'agent@example.com',
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['add'],
			},
		},
		description: 'The email address of the agent to invite',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['add'],
			},
		},
		description: 'The last name of the agent',
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['add'],
			},
		},
		description: 'The first name of the agent',
	},
	{
		displayName: 'Role Permission Type',
		name: 'rolePermissionType',
		type: 'options',
		required: true,
		options: [
			{ name: 'Admin', value: 'Admin' },
			{ name: 'Agent (Personal)', value: 'AgentPersonal' },
			{ name: 'Agent (Public)', value: 'AgentPublic' },
			{ name: 'Agent (Team Personal)', value: 'AgentTeamPersonal' },
			{ name: 'Custom', value: 'Custom' },
			{ name: 'Light', value: 'Light' },
		],
		default: 'AgentPublic',
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['add'],
			},
		},
		description: 'The role and permission type for the agent',
	},
	{
		displayName: 'Department Names or IDs',
		name: 'associatedDepartmentIds',
		type: 'multiOptions',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: [],
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['add'],
			},
		},
		description: 'Departments to associate the agent with. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Additional Fields',
		name: 'agentAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'], operation: ['add'],
			},
		},
		options: [
			{
				displayName: 'About',
				name: 'about',
				type: 'string',
				default: '',
				description: 'A short bio or description of the agent',
			},
			{
				displayName: 'Country Code',
				name: 'countryCode',
				type: 'string',
				default: '',
				placeholder: 'en_US',
				description: 'Country code of the agent (e.g. en_US)',
			},
			{
				displayName: 'Extension',
				name: 'extn',
				type: 'string',
				default: '',
				description: 'Phone extension of the agent',
			},
			{
				displayName: 'Language Code',
				name: 'langCode',
				type: 'string',
				default: '',
				placeholder: 'en_US',
				description: 'Language code of the agent (e.g. en_US)',
			},
			{
				displayName: 'Mobile',
				name: 'mobile',
				type: 'string',
				default: '',
				description: 'Mobile phone number of the agent',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the agent',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Disabled', value: 'DISABLED' },
				],
				default: 'ACTIVE',
				description: 'The status of the agent',
			},
		],
	},
];

export const executeAgent: ResourceExecuteHandler = async (context, operation, i) => {
	const returnData: import('n8n-workflow').INodeExecutionData[] = [];

	switch (`agent:${operation}`) {
		// ─── List Agents ──────────────────────────────────────────
		case 'agent:list': {
			const options = context.getNodeParameter('listAgentOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			if (options.searchStr) qs.searchStr = options.searchStr;
			if (options.departmentIds) qs.departmentIds = options.departmentIds;
			if (options.rolePermissionType) qs.rolePermissionType = options.rolePermissionType;
			const response = await zohoApiRequest(context, 'GET', '/agents', {}, qs);
			const agents = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(agents as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Agent ────────────────────────────────────────────
		case 'agent:get': {
			const agentId = context.getNodeParameter('agentId', i) as string;
			const response = await zohoApiRequest(context, 'GET', `/agents/${encodeURIComponent(agentId)}`);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Agent by Email ───────────────────────────────────
		case 'agent:getByEmail': {
			const email = context.getNodeParameter('agentEmail', i) as string;
			const response = await zohoApiRequest(context, 'GET', '/agents', {}, { searchStr: email, limit: 1 });
			const agents = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(Array.isArray(agents) ? agents as IDataObject[] : [agents as IDataObject]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Agent Count ──────────────────────────────────────
		case 'agent:getCount': {
			const response = await zohoApiRequest(context, 'GET', '/agents/count');
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get My Info ──────────────────────────────────────────
		case 'agent:getMyInfo': {
			const response = await zohoApiRequest(context, 'GET', '/myinfo');
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get My Preferences ───────────────────────────────────
		case 'agent:getPreferences': {
			const response = await zohoApiRequest(context, 'GET', '/myPreferences');
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update My Preferences ────────────────────────────────
		case 'agent:updatePreferences': {
			const prefs = context.getNodeParameter('preferencesFields', i, {}) as IDataObject;
			const body: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(prefs)) {
				if (val !== null && val !== undefined && val !== '') body[key] = val;
			}
			const response = await zohoApiRequest(context, 'PATCH', '/myPreferences', body);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Add Agent ────────────────────────────────────────────
		case 'agent:add': {
			const emailId = context.getNodeParameter('emailId', i) as string;
			const lastName = context.getNodeParameter('lastName', i) as string;
			const firstName = context.getNodeParameter('firstName', i, '') as string;
			const rolePermissionType = context.getNodeParameter('rolePermissionType', i) as string;
			const associatedDepartmentIds = context.getNodeParameter('associatedDepartmentIds', i) as string[];
			const additionalFields = context.getNodeParameter('agentAdditionalFields', i, {}) as IDataObject;

			const body: Record<string, unknown> = {
				emailId,
				lastName,
				rolePermissionType,
				associatedDepartmentIds,
			};

			if (firstName) body.firstName = firstName;

			for (const [key, val] of Object.entries(additionalFields)) {
				if (val !== null && val !== undefined && val !== '') {
					body[key] = val;
				}
			}

			const response = await zohoApiRequest(context, 'POST', '/agents', body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Online Agents ────────────────────────────────────
		case 'agent:getOnline': {
			const deptId = context.getNodeParameter('agentDepartmentId', i) as string;
			const response = await zohoApiRequest(context, 'GET', '/onlineAgents', {}, {
				departmentId: deptId,
				include: 'mailStatus,phoneStatus,chatStatus,phoneMode,presenceStatus',
				limit: 6000,
			});
			const agents = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(agents as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Offline Agents ───────────────────────────────────
		case 'agent:getOffline': {
			const deptId = context.getNodeParameter('agentDepartmentId', i) as string;
			const response = await zohoApiRequest(context, 'GET', '/offlineAgents', {}, {
				departmentId: deptId,
				include: 'mailStatus,phoneStatus,chatStatus,phoneMode,presenceStatus',
				limit: 6000,
			});
			const agents = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(agents as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Availability ─────────────────────────────────────
		case 'agent:getAvailability': {
			const deptId = context.getNodeParameter('agentDepartmentId', i) as string;
			const response = await zohoApiRequest(context, 'GET', '/agentAvailability', {}, {
				departmentId: deptId,
				include: 'mailStatus,phoneStatus,chatStatus,phoneMode,presenceStatus',
				limit: 50,
				from: 0,
			});
			const agents = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(agents as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Agent ─────────────────────────────────────────
		case 'agent:update': {
			const agentId = context.getNodeParameter('agentId', i) as string;
			const updateFields = context.getNodeParameter('updateAgentFields', i, {}) as IDataObject;
			const body: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(updateFields)) {
				if (val !== null && val !== undefined && val !== '') body[key] = val;
			}
			const response = await zohoApiRequest(context, 'PATCH', `/agents/${encodeURIComponent(agentId)}`, body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Activate Agents ──────────────────────────────────────
		case 'agent:activate': {
			const idsStr = context.getNodeParameter('agentIds', i) as string;
			const agentIds = idsStr.split(',').map((id) => id.trim()).filter(Boolean);
			const response = await zohoApiRequest(context, 'POST', '/agents/activate', { agentIds });
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Deactivate Agent ─────────────────────────────────────
		case 'agent:deactivate': {
			const agentId = context.getNodeParameter('agentId', i) as string;
			const response = await zohoApiRequest(context, 'POST', `/agents/${encodeURIComponent(agentId)}/deactivate`);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Delete Unconfirmed Agents ────────────────────────────
		case 'agent:deleteUnconfirmed': {
			const idsStr = context.getNodeParameter('agentIds', i) as string;
			const agentIds = idsStr.split(',').map((id) => id.trim()).filter(Boolean);
			const response = await zohoApiRequest(context, 'POST', '/agents/deleteUnconfirmed', { agentIds });
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
