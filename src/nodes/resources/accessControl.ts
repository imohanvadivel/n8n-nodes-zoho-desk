import type { INodeProperties, IDataObject } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import { zohoApiRequest } from '../helpers';

export const accessControlProperties: INodeProperties[] = [
	// ─── Role: Operation ──────────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['role'] } },
		options: [
			{ name: 'List', value: 'list', action: 'List Roles', description: 'List all roles' },
			{ name: 'Get', value: 'get', action: 'Get Role', description: 'Get details of a specific role' },
			{ name: 'Create', value: 'create', action: 'Create Role', description: 'Create a new role' },
			{ name: 'Update', value: 'update', action: 'Update Role', description: 'Update an existing role' },
			{ name: 'Delete', value: 'delete', action: 'Delete Role', description: 'Delete a role' },
			{ name: 'List Agents by Role', value: 'listAgents', action: 'List Agents by Role', description: 'List agents mapped to a role' },
			{ name: 'Get by IDs', value: 'getByIds', action: 'Get Roles by IDs', description: 'Get role details by role IDs' },
			{ name: 'Get Personal Role', value: 'getPersonal', action: 'Get Personal Role', description: 'Get the personal role configured in your help desk' },
			{ name: 'Get Count', value: 'getCount', action: 'Get Role Count', description: 'Get the number of roles configured' },
		],
		default: 'list',
	},
	// ─── Profile: Operation ───────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['profile'] } },
		options: [
			{ name: 'List', value: 'list', action: 'List Profiles', description: 'List all profiles' },
			{ name: 'Get', value: 'get', action: 'Get Profile', description: 'Get details of a specific profile' },
			{ name: 'Clone', value: 'clone', action: 'Clone Profile', description: 'Clone an existing profile' },
			{ name: 'Update', value: 'update', action: 'Update Profile', description: 'Update an existing profile' },
			{ name: 'Delete', value: 'delete', action: 'Delete Profile', description: 'Delete a profile' },
			{ name: 'Get Count', value: 'getCount', action: 'Get Profile Count', description: 'Get the number of profiles configured' },
			{ name: 'List Agents by Profile', value: 'listAgents', action: 'List Agents by Profile', description: 'List agents mapped to a profile' },
			{ name: 'Get My Profile', value: 'getMyProfile', action: 'Get My Profile', description: 'Get profile details of the current user' },
			{ name: 'Get My Permissions', value: 'getMyPermissions', action: 'Get My Permissions', description: "Get permissions of the current user's profile" },
			{ name: 'Get Light Agent Profile', value: 'getLightAgent', action: 'Get Light Agent Profile', description: 'Get permissions configured for the light agent profile' },
		],
		default: 'list',
	},
	// ─── Organisation: Operation ──────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['organisation'] } },
		options: [
			{ name: 'Get', value: 'get', action: 'Get Organisation', description: 'Get details of an organisation' },
			{ name: 'Get All', value: 'getAll', action: 'Get All Organisations', description: 'List all organisations the current user belongs to' },
			{ name: 'Get Accessible', value: 'getAccessible', action: 'Get Accessible Organisations', description: 'List organisations accessible with the current OAuth token' },
			{ name: 'Update', value: 'update', action: 'Update Organisation', description: 'Update organisation details' },
		],
		default: 'get',
	},

	// ─── Role fields ──────────────────────────────────────────────────────────
	{
		displayName: 'Role IDs',
		name: 'roleIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: '12345,67890',
		displayOptions: {
			show: {
				resource: ['role'], operation: ['getByIds'],
			},
		},
		description: 'Comma-separated role IDs (max 50)',
	},
	{
		displayName: 'Role ID',
		name: 'roleId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['role'], operation: ['get', 'update', 'delete', 'listAgents'],
			},
		},
		description: 'The ID of the role',
	},
	{
		displayName: 'Name',
		name: 'roleName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['role'], operation: ['create'],
			},
		},
		description: 'Name of the role (max 50 chars)',
	},
	{
		displayName: 'Share Data With Peers',
		name: 'shareDataWithPeers',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: ['role'], operation: ['create'],
			},
		},
		description: 'Whether the role shares data with its peer roles',
	},
	{
		displayName: 'Create Options',
		name: 'roleCreateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['role'], operation: ['create'],
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
				displayName: 'Reports To (Role ID)',
				name: 'reportsTo',
				type: 'string',
				default: '',
				description: 'ID of the parent role this role reports to',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'roleUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['role'], operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Share Data With Peers',
				name: 'shareDataWithPeers',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Reports To (Role ID)',
				name: 'reportsTo',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Transfer To Role ID',
		name: 'transferToRoleId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['role'], operation: ['delete'],
			},
		},
		description: 'ID of the role to transfer child-roles to',
	},
	{
		displayName: 'List Options',
		name: 'roleListOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['role'], operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 15,
				typeOptions: { minValue: 1, maxValue: 500 },
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
				description: 'Search by name or description (supports *wildcards*)',
			},
			{
				displayName: 'Is Visible',
				name: 'isVisible',
				type: 'boolean',
				default: true,
				description: 'Whether to filter by visibility',
			},
			{
				displayName: 'Is Default',
				name: 'isDefault',
				type: 'boolean',
				default: false,
				description: 'Whether to filter by default roles only',
			},
		],
	},

	// ─── Profile fields ───────────────────────────────────────────────────────
	{
		displayName: 'Profile ID',
		name: 'profileId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['profile'], operation: ['get', 'clone', 'update', 'delete', 'listAgents'],
			},
		},
		description: 'The ID of the profile',
	},
	{
		displayName: 'Name',
		name: 'cloneProfileName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['profile'], operation: ['clone'],
			},
		},
		description: 'Name of the cloned profile (max 50 chars)',
	},
	{
		displayName: 'Options',
		name: 'cloneProfileOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['profile'], operation: ['clone'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Description of the cloned profile',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'profileUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['profile'], operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the profile (max 50 chars)',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Description of the profile (max 3200 chars)',
			},
			{
				displayName: 'Permissions (JSON)',
				name: 'permissions',
				type: 'json',
				default: '{}',
				description: 'Permissions object for the profile. See Zoho Desk API docs for the full permissions schema.',
			},
		],
	},
	{
		displayName: 'Transfer To Profile ID',
		name: 'transferToProfileId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['profile'], operation: ['delete'],
			},
		},
		description: 'ID of the profile to transfer agents to before deletion',
	},
	{
		displayName: 'List Profile Options',
		name: 'profileListOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['profile'], operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Is Visible',
				name: 'visible',
				type: 'boolean',
				default: true,
				description: 'Whether to filter by visibility in the UI',
			},
			{
				displayName: 'Is Default',
				name: 'default',
				type: 'boolean',
				default: false,
				description: 'Whether to filter by default profiles only',
			},
			{
				displayName: 'Search',
				name: 'searchStr',
				type: 'string',
				default: '',
				description: 'Search by name or description. Supports: string* (starts with), *string* (contains), string (exact match).',
			},
		],
	},
	{
		displayName: 'Count Options',
		name: 'profileCountOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['profile'], operation: ['getCount'],
			},
		},
		options: [
			{
				displayName: 'Is Visible',
				name: 'visible',
				type: 'boolean',
				default: true,
				description: 'Whether to filter by visibility',
			},
			{
				displayName: 'Is Default',
				name: 'default',
				type: 'boolean',
				default: false,
				description: 'Whether to filter by default profiles only',
			},
		],
	},
	{
		displayName: 'List Agents Options',
		name: 'profileListAgentsOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['profile'], operation: ['listAgents'],
			},
		},
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
				description: 'Whether to filter by activation status',
			},
			{
				displayName: 'Confirmed',
				name: 'confirmed',
				type: 'boolean',
				default: true,
				description: 'Whether to filter by confirmation status',
			},
		],
	},

	// ─── Organisation fields ──────────────────────────────────────────────────
	{
		displayName: 'Organisation ID',
		name: 'organisationId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['organisation'], operation: ['get', 'update'],
			},
		},
		description: 'The ID of the organisation',
	},
	{
		displayName: 'Get Options',
		name: 'organisationGetOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['organisation'], operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Include Custom Domain',
				name: 'includeCustomDomain',
				type: 'boolean',
				default: false,
				description: 'Whether to include the customDomain field in the response',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'organisationUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['organisation'], operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				description: 'Actual name of the organisation/business (max 50 chars)',
			},
			{
				displayName: 'Portal Name',
				name: 'portalName',
				type: 'string',
				default: '',
				description: 'Unique name for the help desk portal. Only lower-case letters and numbers.',
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Edition',
				name: 'edition',
				type: 'options',
				default: '',
				options: [
					{ name: 'Free', value: 'FREE' },
					{ name: 'Standard', value: 'STANDARD' },
					{ name: 'Express', value: 'EXPRESS' },
					{ name: 'Professional', value: 'PROFESSIONAL' },
					{ name: 'Enterprise', value: 'ENTERPRISE' },
				],
			},
			{
				displayName: 'Alias',
				name: 'alias',
				type: 'string',
				default: '',
				description: 'Alternative name for the help desk portal (max 50 chars)',
			},
			{
				displayName: 'Employee Count',
				name: 'employeeCount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Brief description of the organisation (max 250 chars)',
			},
			{
				displayName: 'Mobile',
				name: 'mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Primary Contact',
				name: 'primaryContact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Zip',
				name: 'zip',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency Locale',
				name: 'currencyLocale',
				type: 'string',
				default: '',
			},
		],
	},
];

export const executeAccessControl: ResourceExecuteHandler = async (context, operation, i) => {
	const returnData: import('n8n-workflow').INodeExecutionData[] = [];
	const resource = context.getNodeParameter('resource', i) as string;
	const actionKey = `${resource}:${operation}`;

	switch (actionKey) {
		// ─── List Roles ───────────────────────────────────────────────
		case 'role:list': {
			const options = context.getNodeParameter('roleListOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			for (const key of ['limit', 'from', 'searchStr', 'isVisible', 'isDefault']) {
				if (options[key] !== undefined && options[key] !== '') qs[key] = options[key];
			}
			const response = await zohoApiRequest(context, 'GET', '/roles', {}, qs);
			const roles = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(roles as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Role ─────────────────────────────────────────────────
		case 'role:get': {
			const roleId = context.getNodeParameter('roleId', i) as string;
			const response = await zohoApiRequest(context, 'GET', `/roles/${encodeURIComponent(roleId)}`);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Create Role ──────────────────────────────────────────────
		case 'role:create': {
			const name = context.getNodeParameter('roleName', i) as string;
			const shareDataWithPeers = context.getNodeParameter('shareDataWithPeers', i) as boolean;
			const options = context.getNodeParameter('roleCreateOptions', i, {}) as IDataObject;
			const body: Record<string, unknown> = { name, shareDataWithPeers };
			if (options.description) body.description = options.description;
			if (options.reportsTo) body.reportsTo = options.reportsTo;
			const response = await zohoApiRequest(context, 'POST', '/roles', body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Role ──────────────────────────────────────────────
		case 'role:update': {
			const roleId = context.getNodeParameter('roleId', i) as string;
			const updateFields = context.getNodeParameter('roleUpdateFields', i, {}) as IDataObject;
			const body: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(updateFields)) {
				if (val !== null && val !== undefined && val !== '') body[key] = val;
			}
			const response = await zohoApiRequest(context, 'PATCH', `/roles/${encodeURIComponent(roleId)}`, body);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Delete Role ──────────────────────────────────────────────
		case 'role:delete': {
			const roleId = context.getNodeParameter('roleId', i) as string;
			const transferToRoleId = context.getNodeParameter('transferToRoleId', i) as string;
			const response = await zohoApiRequest(context, 'POST', `/roles/${encodeURIComponent(roleId)}/delete`, { transferToRoleId });
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── List Agents by Role ──────────────────────────────────────
		case 'role:listAgents': {
			const roleId = context.getNodeParameter('roleId', i) as string;
			const response = await zohoApiRequest(context, 'GET', `/roles/${encodeURIComponent(roleId)}/agents`);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Role Count ───────────────────────────────────────────
		case 'role:getCount': {
			const response = await zohoApiRequest(context, 'GET', '/roles/count');
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Personal Role ────────────────────────────────────────
		case 'role:getPersonal': {
			const response = await zohoApiRequest(context, 'GET', '/personalRole');
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Roles by IDs ─────────────────────────────────────────
		case 'role:getByIds': {
			const roleIdsStr = context.getNodeParameter('roleIds', i) as string;
			const roleIds = roleIdsStr.split(',').map((id) => id.trim()).filter(Boolean).join(',');
			const response = await zohoApiRequest(context, 'GET', '/rolesByIds', {}, { roleIds });
			const roles = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(roles as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── List Profiles ────────────────────────────────────────────
		case 'profile:list': {
			const options = context.getNodeParameter('profileListOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			if (options.visible !== undefined) qs.visible = options.visible;
			if (options.default !== undefined) qs.default = options.default;
			if (options.searchStr) qs.searchStr = options.searchStr;
			const response = await zohoApiRequest(context, 'GET', '/profiles', {}, qs);
			const profiles = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(profiles as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Profile ──────────────────────────────────────────────
		case 'profile:get': {
			const profileId = context.getNodeParameter('profileId', i) as string;
			const response = await zohoApiRequest(context, 'GET', `/profiles/${encodeURIComponent(profileId)}`);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Clone Profile ────────────────────────────────────────────
		case 'profile:clone': {
			const profileId = context.getNodeParameter('profileId', i) as string;
			const name = context.getNodeParameter('cloneProfileName', i) as string;
			const options = context.getNodeParameter('cloneProfileOptions', i, {}) as IDataObject;
			const body: Record<string, unknown> = { name };
			if (options.description) body.description = options.description;
			const response = await zohoApiRequest(context, 'POST', `/profiles/${encodeURIComponent(profileId)}/clone`, body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Profile ───────────────────────────────────────────
		case 'profile:update': {
			const profileId = context.getNodeParameter('profileId', i) as string;
			const updateFields = context.getNodeParameter('profileUpdateFields', i, {}) as IDataObject;
			const body: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(updateFields)) {
				if (val !== null && val !== undefined && val !== '') {
					if (key === 'permissions' && typeof val === 'string') {
						try { body[key] = JSON.parse(val); } catch { body[key] = val; }
					} else {
						body[key] = val;
					}
				}
			}
			const response = await zohoApiRequest(context, 'PATCH', `/profiles/${encodeURIComponent(profileId)}`, body);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Delete Profile ───────────────────────────────────────────
		case 'profile:delete': {
			const profileId = context.getNodeParameter('profileId', i) as string;
			const transferToProfileId = context.getNodeParameter('transferToProfileId', i) as string;
			const response = await zohoApiRequest(context, 'POST', `/profiles/${encodeURIComponent(profileId)}/delete`, { transferToProfileId });
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Profile Count ────────────────────────────────────────
		case 'profile:getCount': {
			const options = context.getNodeParameter('profileCountOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			if (options.visible !== undefined) qs.visible = options.visible;
			if (options.default !== undefined) qs.default = options.default;
			const response = await zohoApiRequest(context, 'GET', '/profiles/count', {}, qs);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── List Agents by Profile ───────────────────────────────────
		case 'profile:listAgents': {
			const profileId = context.getNodeParameter('profileId', i) as string;
			const options = context.getNodeParameter('profileListAgentsOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			if (options.active !== undefined) qs.active = options.active;
			if (options.confirmed !== undefined) qs.confirmed = options.confirmed;
			const response = await zohoApiRequest(context, 'GET', `/profiles/${encodeURIComponent(profileId)}/agents`, {}, qs);
			const agents = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(agents as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get My Profile ───────────────────────────────────────────
		case 'profile:getMyProfile': {
			const response = await zohoApiRequest(context, 'GET', '/myProfile');
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get My Profile Permissions ───────────────────────────────
		case 'profile:getMyPermissions': {
			const response = await zohoApiRequest(context, 'GET', '/myProfilePermissions');
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Light Agent Profile ──────────────────────────────────
		case 'profile:getLightAgent': {
			const response = await zohoApiRequest(context, 'GET', '/lightAgentProfile');
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Organisation ─────────────────────────────────────────
		case 'organisation:get': {
			const organisationId = context.getNodeParameter('organisationId', i) as string;
			const options = context.getNodeParameter('organisationGetOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			if (options.includeCustomDomain) qs.includeCustomDomain = true;
			const response = await zohoApiRequest(context, 'GET', `/organizations/${encodeURIComponent(organisationId)}`, {}, qs);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get All Organisations ────────────────────────────────────
		case 'organisation:getAll': {
			const response = await zohoApiRequest(context, 'GET', '/organizations');
			const orgs = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(orgs as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Accessible Organisations ─────────────────────────────
		case 'organisation:getAccessible': {
			const response = await zohoApiRequest(context, 'GET', '/accessibleOrganizations');
			const orgs = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(orgs as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Organisation ──────────────────────────────────────
		case 'organisation:update': {
			const organisationId = context.getNodeParameter('organisationId', i) as string;
			const updateFields = context.getNodeParameter('organisationUpdateFields', i, {}) as IDataObject;
			const body: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(updateFields)) {
				if (val !== null && val !== undefined && val !== '') body[key] = val;
			}
			const response = await zohoApiRequest(context, 'PATCH', `/organizations/${encodeURIComponent(organisationId)}`, body);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
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
