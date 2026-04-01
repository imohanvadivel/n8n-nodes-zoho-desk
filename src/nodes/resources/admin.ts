import type { INodeProperties, IDataObject } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import { zohoApiRequest } from '../helpers';

function pad(v: unknown): string {
	return String(v).padStart(2, '0');
}

export const adminProperties: INodeProperties[] = [
	// ─── Skill: Operation ─────────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['skill'] } },
		options: [
			{ name: 'List Skill Types', value: 'listSkillTypes', action: 'List Skill Types', description: 'List all skill types in a department' },
			{ name: 'Get Skill Type', value: 'getSkillType', action: 'Get Skill Type', description: 'Get details of a skill type' },
			{ name: 'Create Skill Type', value: 'createSkillType', action: 'Create Skill Type', description: 'Create a new skill type' },
			{ name: 'Update Skill Type', value: 'updateSkillType', action: 'Update Skill Type', description: 'Update a skill type' },
			{ name: 'Delete Skill Type', value: 'deleteSkillType', action: 'Delete Skill Type', description: 'Delete a skill type' },
			{ name: 'List Skills', value: 'listSkills', action: 'List Skills', description: 'List all skills in a department' },
			{ name: 'Get Skill', value: 'getSkill', action: 'Get Skill', description: 'Get details of a skill' },
			{ name: 'Create Skill', value: 'createSkill', action: 'Create Skill', description: 'Create a new skill' },
			{ name: 'Update Skill', value: 'updateSkill', action: 'Update Skill', description: 'Update a skill' },
			{ name: 'Delete Skill', value: 'deleteSkill', action: 'Delete Skill', description: 'Delete a skill' },
		],
		default: 'listSkillTypes',
	},
	// ─── Business Hour: Operation ─────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['businessHour'] } },
		options: [
			{ name: 'List', value: 'list', action: 'List Business Hours', description: 'List all business hour sets' },
			{ name: 'Get', value: 'get', action: 'Get Business Hours', description: 'Get details of a business hours set' },
			{ name: 'Create', value: 'create', action: 'Create Business Hours', description: 'Create a business hours set' },
			{ name: 'Update', value: 'update', action: 'Update Business Hours', description: 'Update a business hours set' },
			{ name: 'Delete', value: 'delete', action: 'Delete Business Hours', description: 'Delete a business hours set' },
		],
		default: 'list',
	},
	// ─── Holiday List: Operation ──────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['holidayList'] } },
		options: [
			{ name: 'List', value: 'list', action: 'List Holiday Lists', description: 'List all holiday lists' },
			{ name: 'Get', value: 'get', action: 'Get Holiday List', description: 'Get details of a holiday list' },
			{ name: 'Create', value: 'create', action: 'Create Holiday List', description: 'Create a holiday list' },
			{ name: 'Update', value: 'update', action: 'Update Holiday List', description: 'Update a holiday list' },
			{ name: 'Delete', value: 'delete', action: 'Delete Holiday List', description: 'Delete a holiday list' },
		],
		default: 'list',
	},
	// ─── Email Template: Operation ────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { resource: ['emailTemplate'] } },
		options: [
			{ name: 'List', value: 'list', action: 'List Templates', description: 'List all email templates' },
			{ name: 'Get', value: 'get', action: 'Get Template', description: 'Get a specific email template' },
			{ name: 'Create', value: 'create', action: 'Create Template', description: 'Create a new email template' },
			{ name: 'Update', value: 'update', action: 'Update Template', description: 'Update an existing email template' },
			{ name: 'Delete', value: 'delete', action: 'Delete Template', description: 'Delete an email template' },
		],
		default: 'list',
	},

	// ─── Skill fields ─────────────────────────────────────────────────────────
	{
		displayName: 'Skill Type ID',
		name: 'skillTypeId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['getSkillType', 'updateSkillType', 'deleteSkillType'],
			},
		},
		description: 'The ID of the skill type',
	},
	{
		displayName: 'Skill ID',
		name: 'skillId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['getSkill', 'updateSkill', 'deleteSkill'],
			},
		},
		description: 'The ID of the skill',
	},
	// Create Skill Type fields
	{
		displayName: 'Name',
		name: 'skillTypeName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['createSkillType'],
			},
		},
		description: 'Name of the skill type',
	},
	{
		displayName: 'Department Name or ID',
		name: 'skillTypeDepartmentId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['createSkillType'],
			},
		},
		description: 'Department for the skill type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// Update Skill Type fields
	{
		displayName: 'Update Fields',
		name: 'skillTypeUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['updateSkillType'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the skill type',
			},
		],
	},
	// List Skill Types options
	{
		displayName: 'List Skill Types Options',
		name: 'listSkillTypesOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['listSkillTypes'],
			},
		},
		options: [
			{
				displayName: 'Department Name or ID',
				name: 'departmentId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getDepartments' },
				default: '',
				description: 'Filter by department. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
				typeOptions: { minValue: 1, maxValue: 100 },
				description: 'Max number of skill types to return',
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
			},
			{
				displayName: 'Mapped Skills Status',
				name: 'mappedSkillsStatus',
				type: 'options',
				default: '',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Inactive', value: 'INACTIVE' },
				],
				description: 'Filter skill types by associated skills status',
			},
		],
	},
	// Create Skill fields
	{
		displayName: 'Skill Name',
		name: 'skillName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['createSkill'],
			},
		},
		description: 'Name of the skill',
	},
	{
		displayName: 'Skill Type ID',
		name: 'createSkillTypeId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['createSkill'],
			},
		},
		description: 'ID of the skill type this skill belongs to',
	},
	{
		displayName: 'Status',
		name: 'skillStatus',
		type: 'options',
		required: true,
		default: 'ACTIVE',
		options: [
			{ name: 'Active', value: 'ACTIVE' },
			{ name: 'Inactive', value: 'INACTIVE' },
		],
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['createSkill'],
			},
		},
		description: 'Status of the skill',
	},
	{
		displayName: 'Criteria (JSON)',
		name: 'skillCriteria',
		type: 'json',
		required: true,
		default: '{"fieldConditions":[]}',
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['createSkill'],
			},
		},
		description: 'Criteria for the skill. Example: {"fieldConditions":[{"condition":"is","fieldName":"Subject","fieldModule":"tickets","value":["India"]}]}',
	},
	{
		displayName: 'Create Skill Options',
		name: 'createSkillOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['createSkill'],
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
				displayName: 'Agent IDs',
				name: 'agentIds',
				type: 'string',
				default: '',
				placeholder: '12345,67890',
				description: 'Comma-separated IDs of agents to map to the skill',
			},
		],
	},
	// Update Skill fields
	{
		displayName: 'Update Skill Fields',
		name: 'skillUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['updateSkill'],
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
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Inactive', value: 'INACTIVE' },
				],
			},
			{
				displayName: 'Skill Type ID',
				name: 'skillTypeId',
				type: 'string',
				default: '',
				description: 'ID of the skill type to reassign to',
			},
			{
				displayName: 'Criteria (JSON)',
				name: 'criteria',
				type: 'json',
				default: '',
				description: 'Criteria for the skill as JSON',
			},
			{
				displayName: 'Agent IDs',
				name: 'agentIds',
				type: 'string',
				default: '',
				placeholder: '12345,67890',
				description: 'Comma-separated IDs of agents to map to the skill',
			},
		],
	},
	// List Skills options
	{
		displayName: 'List Skills Options',
		name: 'listSkillsOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['skill'], operation: ['listSkills'],
			},
		},
		options: [
			{
				displayName: 'Department Name or ID',
				name: 'departmentId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getDepartments' },
				default: '',
				description: 'Filter by department (required). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
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
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Inactive', value: 'INACTIVE' },
				],
				description: 'Filter by skill status',
			},
			{
				displayName: 'Search',
				name: 'searchString',
				type: 'string',
				default: '',
				description: 'Filter skills by name starting with this string',
			},
			{
				displayName: 'Skill Type ID',
				name: 'skillTypeId',
				type: 'string',
				default: '',
				description: 'Filter skills by skill type ID',
			},
			{
				displayName: 'Skill IDs',
				name: 'skillIds',
				type: 'string',
				default: '',
				placeholder: '12345,67890',
				description: 'Comma-separated skill IDs to fetch (max 50)',
			},
		],
	},

	// ─── Business Hour fields ─────────────────────────────────────────────────
	{
		displayName: 'Business Hour ID',
		name: 'businessHourId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['businessHour'], operation: ['get', 'update', 'delete'],
			},
		},
		description: 'The ID of the business hours set',
	},
	// Create fields
	{
		displayName: 'Name',
		name: 'businessHourName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['businessHour'], operation: ['create'],
			},
		},
		description: 'Name of the business hours set',
	},
	{
		displayName: 'Status',
		name: 'businessHourStatus',
		type: 'options',
		required: true,
		default: 'ACTIVE',
		options: [
			{ name: 'Active', value: 'ACTIVE' },
			{ name: 'Inactive', value: 'INACTIVE' },
		],
		displayOptions: {
			show: {
				resource: ['businessHour'], operation: ['create'],
			},
		},
		description: 'Activation status of the business hours set',
	},
	{
		displayName: 'Type',
		name: 'businessHourType',
		type: 'options',
		required: true,
		default: 'SPECIFIC',
		options: [
			{ name: '24x7 (Available Anytime)', value: '24X7' },
			{ name: 'Specific (Same Hours on Selected Days)', value: 'SPECIFIC' },
			{ name: 'Custom (Different Hours on Different Days)', value: 'CUSTOM' },
		],
		displayOptions: {
			show: {
				resource: ['businessHour'], operation: ['create'],
			},
		},
		description: 'Type of the business hours set',
	},
	{
		displayName: 'Time Zone',
		name: 'businessHourTimeZoneId',
		type: 'options',
		required: true,
		default: 'GMT',
		options: [
			{ name: '(GMT-12:00) Baker Island', value: 'Etc/GMT+12' },
			{ name: '(GMT-11:00) Pago Pago', value: 'Pacific/Pago_Pago' },
			{ name: '(GMT-10:00) Hawaii', value: 'Pacific/Honolulu' },
			{ name: '(GMT-09:00) Alaska', value: 'America/Anchorage' },
			{ name: '(GMT-08:00) Pacific Time (US)', value: 'America/Los_Angeles' },
			{ name: '(GMT-07:00) Mountain Time (US)', value: 'America/Denver' },
			{ name: '(GMT-06:00) Central Time (US)', value: 'America/Chicago' },
			{ name: '(GMT-05:00) Eastern Time (US)', value: 'America/New_York' },
			{ name: '(GMT-04:00) Atlantic Time', value: 'America/Halifax' },
			{ name: '(GMT-03:30) Newfoundland', value: 'America/St_Johns' },
			{ name: '(GMT-03:00) Buenos Aires', value: 'America/Argentina/Buenos_Aires' },
			{ name: '(GMT-03:00) Sao Paulo', value: 'America/Sao_Paulo' },
			{ name: '(GMT-02:00) Mid-Atlantic', value: 'Atlantic/South_Georgia' },
			{ name: '(GMT-01:00) Azores', value: 'Atlantic/Azores' },
			{ name: '(GMT+00:00) GMT / London', value: 'GMT' },
			{ name: '(GMT+01:00) Central Europe (Berlin, Paris)', value: 'Europe/Berlin' },
			{ name: '(GMT+02:00) Eastern Europe (Helsinki, Cairo)', value: 'Europe/Helsinki' },
			{ name: '(GMT+02:00) Israel', value: 'Asia/Jerusalem' },
			{ name: '(GMT+03:00) Moscow / Riyadh', value: 'Europe/Moscow' },
			{ name: '(GMT+03:30) Tehran', value: 'Asia/Tehran' },
			{ name: '(GMT+04:00) Dubai / Baku', value: 'Asia/Dubai' },
			{ name: '(GMT+04:30) Kabul', value: 'Asia/Kabul' },
			{ name: '(GMT+05:00) Karachi / Tashkent', value: 'Asia/Karachi' },
			{ name: '(GMT+05:30) India (Kolkata)', value: 'Asia/Kolkata' },
			{ name: '(GMT+05:45) Kathmandu', value: 'Asia/Kathmandu' },
			{ name: '(GMT+06:00) Dhaka / Almaty', value: 'Asia/Dhaka' },
			{ name: '(GMT+06:30) Yangon', value: 'Asia/Yangon' },
			{ name: '(GMT+07:00) Bangkok / Jakarta', value: 'Asia/Bangkok' },
			{ name: '(GMT+08:00) China / Singapore / Perth', value: 'Asia/Shanghai' },
			{ name: '(GMT+09:00) Tokyo / Seoul', value: 'Asia/Tokyo' },
			{ name: '(GMT+09:30) Adelaide', value: 'Australia/Adelaide' },
			{ name: '(GMT+10:00) Sydney / Melbourne', value: 'Australia/Sydney' },
			{ name: '(GMT+11:00) Solomon Islands', value: 'Pacific/Guadalcanal' },
			{ name: '(GMT+12:00) Auckland', value: 'Pacific/Auckland' },
			{ name: '(GMT+13:00) Samoa', value: 'Pacific/Apia' },
		],
		displayOptions: {
			show: {
				resource: ['businessHour'], operation: ['create'],
			},
		},
		description: 'Time zone for the business hours set',
	},
	{
		displayName: 'Create Options',
		name: 'businessHourCreateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['businessHour'], operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Holiday List IDs',
				name: 'holidayListIds',
				type: 'string',
				default: '',
				placeholder: '12345,67890',
				description: 'Comma-separated holiday list IDs to associate (max 2)',
			},
			{
				displayName: 'Business Times (JSON)',
				name: 'businessTimes',
				type: 'json',
				default: '[]',
				description: 'Business hours for the week. Example: [{"startTime":"10:00","endTime":"16:00","day":"MONDAY"},{"startTime":"10:00","endTime":"16:00","day":"TUESDAY"}]',
			},
		],
	},
	// Update fields
	{
		displayName: 'Update Fields',
		name: 'businessHourUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['businessHour'], operation: ['update'],
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
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Inactive', value: 'INACTIVE' },
				],
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: '',
				options: [
					{ name: '24x7 (Available Anytime)', value: '24X7' },
					{ name: 'Specific (Same Hours on Selected Days)', value: 'SPECIFIC' },
					{ name: 'Custom (Different Hours on Different Days)', value: 'CUSTOM' },
				],
			},
			{
				displayName: 'Time Zone',
				name: 'timeZoneId',
				type: 'options',
				default: '',
				options: [
					{ name: '(GMT-12:00) Baker Island', value: 'Etc/GMT+12' },
					{ name: '(GMT-11:00) Pago Pago', value: 'Pacific/Pago_Pago' },
					{ name: '(GMT-10:00) Hawaii', value: 'Pacific/Honolulu' },
					{ name: '(GMT-09:00) Alaska', value: 'America/Anchorage' },
					{ name: '(GMT-08:00) Pacific Time (US)', value: 'America/Los_Angeles' },
					{ name: '(GMT-07:00) Mountain Time (US)', value: 'America/Denver' },
					{ name: '(GMT-06:00) Central Time (US)', value: 'America/Chicago' },
					{ name: '(GMT-05:00) Eastern Time (US)', value: 'America/New_York' },
					{ name: '(GMT-04:00) Atlantic Time', value: 'America/Halifax' },
					{ name: '(GMT-03:30) Newfoundland', value: 'America/St_Johns' },
					{ name: '(GMT-03:00) Buenos Aires', value: 'America/Argentina/Buenos_Aires' },
					{ name: '(GMT-03:00) Sao Paulo', value: 'America/Sao_Paulo' },
					{ name: '(GMT-02:00) Mid-Atlantic', value: 'Atlantic/South_Georgia' },
					{ name: '(GMT-01:00) Azores', value: 'Atlantic/Azores' },
					{ name: '(GMT+00:00) GMT / London', value: 'GMT' },
					{ name: '(GMT+01:00) Central Europe (Berlin, Paris)', value: 'Europe/Berlin' },
					{ name: '(GMT+02:00) Eastern Europe (Helsinki, Cairo)', value: 'Europe/Helsinki' },
					{ name: '(GMT+02:00) Israel', value: 'Asia/Jerusalem' },
					{ name: '(GMT+03:00) Moscow / Riyadh', value: 'Europe/Moscow' },
					{ name: '(GMT+03:30) Tehran', value: 'Asia/Tehran' },
					{ name: '(GMT+04:00) Dubai / Baku', value: 'Asia/Dubai' },
					{ name: '(GMT+04:30) Kabul', value: 'Asia/Kabul' },
					{ name: '(GMT+05:00) Karachi / Tashkent', value: 'Asia/Karachi' },
					{ name: '(GMT+05:30) India (Kolkata)', value: 'Asia/Kolkata' },
					{ name: '(GMT+05:45) Kathmandu', value: 'Asia/Kathmandu' },
					{ name: '(GMT+06:00) Dhaka / Almaty', value: 'Asia/Dhaka' },
					{ name: '(GMT+06:30) Yangon', value: 'Asia/Yangon' },
					{ name: '(GMT+07:00) Bangkok / Jakarta', value: 'Asia/Bangkok' },
					{ name: '(GMT+08:00) China / Singapore / Perth', value: 'Asia/Shanghai' },
					{ name: '(GMT+09:00) Tokyo / Seoul', value: 'Asia/Tokyo' },
					{ name: '(GMT+09:30) Adelaide', value: 'Australia/Adelaide' },
					{ name: '(GMT+10:00) Sydney / Melbourne', value: 'Australia/Sydney' },
					{ name: '(GMT+11:00) Solomon Islands', value: 'Pacific/Guadalcanal' },
					{ name: '(GMT+12:00) Auckland', value: 'Pacific/Auckland' },
					{ name: '(GMT+13:00) Samoa', value: 'Pacific/Apia' },
				],
			},
			{
				displayName: 'Holiday List IDs',
				name: 'holidayListIds',
				type: 'string',
				default: '',
				placeholder: '12345,67890',
				description: 'Comma-separated holiday list IDs (max 2)',
			},
			{
				displayName: 'Business Times (JSON)',
				name: 'businessTimes',
				type: 'json',
				default: '',
				description: 'Business hours for the week as JSON array',
			},
		],
	},
	// List options
	{
		displayName: 'List Options',
		name: 'businessHourListOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['businessHour'], operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 50 },
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Inactive', value: 'INACTIVE' },
				],
				description: 'Filter by activation status',
			},
			{
				displayName: 'Business Hour IDs',
				name: 'businessHourIds',
				type: 'string',
				default: '',
				placeholder: '12345,67890',
				description: 'Comma-separated IDs to fetch (max 50)',
			},
		],
	},

	// ─── Holiday List fields ──────────────────────────────────────────────────
	{
		displayName: 'Holiday List ID',
		name: 'holidayListId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['holidayList'], operation: ['get', 'update', 'delete'],
			},
		},
		description: 'The ID of the holiday list',
	},
	// Create fields
	{
		displayName: 'Name',
		name: 'holidayListName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['holidayList'], operation: ['create'],
			},
		},
		description: 'Name of the holiday list',
	},
	{
		displayName: 'Status',
		name: 'holidayListStatus',
		type: 'options',
		required: true,
		default: 'ACTIVE',
		options: [
			{ name: 'Active', value: 'ACTIVE' },
			{ name: 'Inactive', value: 'INACTIVE' },
		],
		displayOptions: {
			show: {
				resource: ['holidayList'], operation: ['create'],
			},
		},
		description: 'Activation status of the holiday list',
	},
	{
		displayName: 'Holidays',
		name: 'holidays',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: ['holidayList'], operation: ['create'],
			},
		},
		description: 'Holidays to include in the list',
		options: [
			{
				displayName: 'Holiday',
				name: 'holiday',
				values: [
					{
						displayName: 'Holiday Name',
						name: 'holidayName',
						type: 'string',
						default: '',
						description: 'Name of the holiday',
					},
					{
						displayName: 'From Month',
						name: 'fromMonth',
						type: 'options',
						default: '01',
						options: [
							{ name: 'January', value: '01' }, { name: 'February', value: '02' },
							{ name: 'March', value: '03' }, { name: 'April', value: '04' },
							{ name: 'May', value: '05' }, { name: 'June', value: '06' },
							{ name: 'July', value: '07' }, { name: 'August', value: '08' },
							{ name: 'September', value: '09' }, { name: 'October', value: '10' },
							{ name: 'November', value: '11' }, { name: 'December', value: '12' },
						],
					},
					{
						displayName: 'From Day',
						name: 'fromDay',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1, maxValue: 31 },
					},
					{
						displayName: 'To Month',
						name: 'toMonth',
						type: 'options',
						default: '01',
						options: [
							{ name: 'January', value: '01' }, { name: 'February', value: '02' },
							{ name: 'March', value: '03' }, { name: 'April', value: '04' },
							{ name: 'May', value: '05' }, { name: 'June', value: '06' },
							{ name: 'July', value: '07' }, { name: 'August', value: '08' },
							{ name: 'September', value: '09' }, { name: 'October', value: '10' },
							{ name: 'November', value: '11' }, { name: 'December', value: '12' },
						],
					},
					{
						displayName: 'To Day',
						name: 'toDay',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1, maxValue: 31 },
					},
				],
			},
		],
	},
	{
		displayName: 'Create Options',
		name: 'holidayListCreateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['holidayList'], operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Holiday List Type',
				name: 'holidayListType',
				type: 'options',
				default: 'RECURRING',
				options: [
					{ name: 'Recurring (Fixed Dates Every Year)', value: 'RECURRING' },
					{ name: 'Year Specific (Varies by Year)', value: 'YEAR_SPECIFIC' },
				],
			},
			{
				displayName: 'Year',
				name: 'year',
				type: 'number',
				default: 2026,
				typeOptions: { minValue: 2000, maxValue: 2100 },
				description: 'Required when holidayListType is YEAR_SPECIFIC',
			},
			{
				displayName: 'Associated Business Hour IDs',
				name: 'associatedBusinessHourIds',
				type: 'string',
				default: '',
				placeholder: '12345,67890',
				description: 'Comma-separated business hour IDs to associate',
			},
		],
	},
	// Update fields
	{
		displayName: 'Update Fields',
		name: 'holidayListUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['holidayList'], operation: ['update'],
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
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Inactive', value: 'INACTIVE' },
				],
			},
			{
				displayName: 'Holidays',
				name: 'holidays',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				description: 'Holidays to include in the list',
				options: [
					{
						displayName: 'Holiday',
						name: 'holiday',
						values: [
							{
								displayName: 'Holiday Name',
								name: 'holidayName',
								type: 'string',
								default: '',
							},
							{
								displayName: 'From Month',
								name: 'fromMonth',
								type: 'options',
								default: '01',
								options: [
									{ name: 'January', value: '01' }, { name: 'February', value: '02' },
									{ name: 'March', value: '03' }, { name: 'April', value: '04' },
									{ name: 'May', value: '05' }, { name: 'June', value: '06' },
									{ name: 'July', value: '07' }, { name: 'August', value: '08' },
									{ name: 'September', value: '09' }, { name: 'October', value: '10' },
									{ name: 'November', value: '11' }, { name: 'December', value: '12' },
								],
							},
							{
								displayName: 'From Day',
								name: 'fromDay',
								type: 'number',
								default: 1,
								typeOptions: { minValue: 1, maxValue: 31 },
							},
							{
								displayName: 'To Month',
								name: 'toMonth',
								type: 'options',
								default: '01',
								options: [
									{ name: 'January', value: '01' }, { name: 'February', value: '02' },
									{ name: 'March', value: '03' }, { name: 'April', value: '04' },
									{ name: 'May', value: '05' }, { name: 'June', value: '06' },
									{ name: 'July', value: '07' }, { name: 'August', value: '08' },
									{ name: 'September', value: '09' }, { name: 'October', value: '10' },
									{ name: 'November', value: '11' }, { name: 'December', value: '12' },
								],
							},
							{
								displayName: 'To Day',
								name: 'toDay',
								type: 'number',
								default: 1,
								typeOptions: { minValue: 1, maxValue: 31 },
							},
						],
					},
				],
			},
			{
				displayName: 'Associated Business Hour IDs',
				name: 'associatedBusinessHourIds',
				type: 'string',
				default: '',
				placeholder: '12345,67890',
				description: 'Comma-separated business hour IDs to associate',
			},
		],
	},
	// List options
	{
		displayName: 'List Options',
		name: 'holidayListListOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['holidayList'], operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 50 },
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Inactive', value: 'INACTIVE' },
				],
				description: 'Filter by activation status',
			},
		],
	},

	// ─── Email Template fields ────────────────────────────────────────────────
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['emailTemplate'], operation: ['get', 'update', 'delete'],
			},
		},
		description: 'The ID of the email template',
	},
	// Create (required fields)
	{
		displayName: 'Template Name',
		name: 'templateName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['create'] },
		},
		description: 'The name of the template (max 250 chars)',
	},
	{
		displayName: 'Subject',
		name: 'templateSubject',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['create'] },
		},
		description: 'The subject of the template (max 1000 chars)',
	},
	{
		displayName: 'Record Type',
		name: 'templateRecordType',
		type: 'options',
		required: true,
		default: 'tickets',
		options: [
			{ name: 'Tickets', value: 'tickets' },
			{ name: 'Contacts', value: 'contacts' },
			{ name: 'Accounts', value: 'accounts' },
			{ name: 'Products', value: 'products' },
			{ name: 'Tasks', value: 'tasks' },
		],
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['create'] },
		},
		description: 'The record type for the template',
	},
	{
		displayName: 'Department Name or ID',
		name: 'templateDepartmentId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['create'] },
		},
		description: 'The department for the template. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Folder Name or ID',
		name: 'templateFolderId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getTemplateFolders',
			loadOptionsDependsOn: ['templateDepartmentId'],
		},
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['create'] },
		},
		description: 'The folder for the template (depends on selected department). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'From Email Address or ID',
		name: 'templateFromId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getSupportEmailAddresses',
			loadOptionsDependsOn: ['templateDepartmentId'],
		},
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['create'] },
		},
		description: 'The support email address to send from (depends on selected department). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Content Type',
		name: 'templateContentType',
		type: 'options',
		required: true,
		default: 'richtext',
		options: [
			{ name: 'Rich Text', value: 'richtext' },
			{ name: 'Plain Text', value: 'plaintext' },
		],
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['create'] },
		},
		description: 'The content type of the template',
	},
	{
		displayName: 'Body',
		name: 'templateBody',
		type: 'string',
		default: '',
		typeOptions: { rows: 8 },
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['create'] },
		},
		description: 'The HTML body of the template (max 64000 chars)',
	},
	{
		displayName: 'Additional Fields',
		name: 'templateCreateOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['create'] },
		},
		options: [
			{
				displayName: 'Reply To',
				name: 'replyTo',
				type: 'string',
				default: '',
				description: 'The reply-to email address',
			},
			{
				displayName: 'Attachment IDs',
				name: 'attachmentIds',
				type: 'string',
				default: '',
				placeholder: 'e.g. 12345,67890',
				description: 'Comma-separated list of file attachment IDs',
			},
		],
	},
	// Update fields
	{
		displayName: 'Update Fields',
		name: 'templateUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['update'] },
		},
		options: [
			{
				displayName: 'Template Name',
				name: 'templateName',
				type: 'string',
				default: '',
				description: 'The name of the template (max 250 chars)',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The subject of the template (max 1000 chars)',
			},
			{
				displayName: 'Record Type',
				name: 'recordType',
				type: 'options',
				default: '',
				options: [
					{ name: 'Tickets', value: 'tickets' },
					{ name: 'Contacts', value: 'contacts' },
					{ name: 'Accounts', value: 'accounts' },
					{ name: 'Products', value: 'products' },
					{ name: 'Tasks', value: 'tasks' },
				],
				description: 'The record type for the template',
			},
			{
				displayName: 'Department Name or ID',
				name: 'departmentId',
				type: 'options',
				default: '',
				typeOptions: { loadOptionsMethod: 'getDepartments' },
				description: 'The department for the template. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Folder Name or ID',
				name: 'folderId',
				type: 'options',
				default: '',
				typeOptions: { loadOptionsMethod: 'getTemplateFolders' },
				description: 'The folder for the template. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'From Email Address or ID',
				name: 'fromId',
				type: 'options',
				default: '',
				typeOptions: { loadOptionsMethod: 'getSupportEmailAddresses' },
				description: 'The support email address to send from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				type: 'string',
				default: '',
				description: 'The reply-to email address',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				typeOptions: { rows: 6 },
				description: 'The HTML body of the template (max 64000 chars)',
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				default: '',
				options: [
					{ name: 'Rich Text', value: 'richtext' },
					{ name: 'Plain Text', value: 'plaintext' },
				],
				description: 'The content type of the template',
			},
			{
				displayName: 'Attachment IDs',
				name: 'attachmentIds',
				type: 'string',
				default: '',
				placeholder: 'e.g. 12345,67890',
				description: 'Comma-separated list of file attachment IDs',
			},
		],
	},
	// List (required department)
	{
		displayName: 'Department Name or ID',
		name: 'templateListDepartmentId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['list'] },
		},
		description: 'The department to fetch templates from (required). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Options',
		name: 'templateListOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: ['emailTemplate'], operation: ['list'] },
		},
		options: [
			{
				displayName: 'Module',
				name: 'module',
				type: 'options',
				default: '',
				options: [
					{ name: 'Tickets', value: 'tickets' },
					{ name: 'Contacts', value: 'contacts' },
					{ name: 'Accounts', value: 'accounts' },
					{ name: 'Products', value: 'products' },
					{ name: 'Tasks', value: 'tasks' },
				],
				description: 'Filter by module/record type',
			},
			{
				displayName: 'Search String',
				name: 'searchStr',
				type: 'string',
				default: '',
				description: 'Search templates by name. Use string* (starts with), *string* (contains), or string (exact match).',
			},
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'string',
				default: '',
				description: 'Filter by folder ID',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 1, maxValue: 1000 },
				description: 'Starting index (1-1000)',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 1000,
				typeOptions: { minValue: 1, maxValue: 1000 },
				description: 'Number of templates to retrieve (1-1000)',
			},
		],
	},
];

export const executeAdmin: ResourceExecuteHandler = async (context, operation, i) => {
	const returnData: import('n8n-workflow').INodeExecutionData[] = [];
	const resource = context.getNodeParameter('resource', i) as string;
	const actionKey = `${resource}:${operation}`;

	switch (actionKey) {
		// ─── List Skill Types ─────────────────────────────────────────
		case 'skill:listSkillTypes': {
			const options = context.getNodeParameter('listSkillTypesOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			if (options.departmentId) qs.departmentId = options.departmentId;
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			if (options.mappedSkillsStatus) qs.mappedSkillsStatus = options.mappedSkillsStatus;
			const response = await zohoApiRequest(context, 'GET', '/skillTypes', {}, qs);
			const skillTypes = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(skillTypes as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Skill Type ───────────────────────────────────────────
		case 'skill:getSkillType': {
			const skillTypeId = context.getNodeParameter('skillTypeId', i) as string;
			const response = await zohoApiRequest(context, 'GET', `/skillTypes/${encodeURIComponent(skillTypeId)}`);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Create Skill Type ────────────────────────────────────────
		case 'skill:createSkillType': {
			const name = context.getNodeParameter('skillTypeName', i) as string;
			const departmentId = context.getNodeParameter('skillTypeDepartmentId', i) as string;
			const response = await zohoApiRequest(context, 'POST', '/skillTypes', { name, departmentId });
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Skill Type ────────────────────────────────────────
		case 'skill:updateSkillType': {
			const skillTypeId = context.getNodeParameter('skillTypeId', i) as string;
			const updateFields = context.getNodeParameter('skillTypeUpdateFields', i, {}) as IDataObject;
			const body: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(updateFields)) {
				if (val !== null && val !== undefined && val !== '') body[key] = val;
			}
			const response = await zohoApiRequest(context, 'PATCH', `/skillTypes/${encodeURIComponent(skillTypeId)}`, body);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Delete Skill Type ────────────────────────────────────────
		case 'skill:deleteSkillType': {
			const skillTypeId = context.getNodeParameter('skillTypeId', i) as string;
			const response = await zohoApiRequest(context, 'DELETE', `/skillTypes/${encodeURIComponent(skillTypeId)}`);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── List Skills ──────────────────────────────────────────────
		case 'skill:listSkills': {
			const options = context.getNodeParameter('listSkillsOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			if (options.departmentId) qs.departmentId = options.departmentId;
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			if (options.status) qs.status = options.status;
			if (options.searchString) qs.searchString = options.searchString;
			if (options.skillTypeId) qs.skillTypeId = options.skillTypeId;
			if (options.skillIds) qs.skillIds = options.skillIds;
			const response = await zohoApiRequest(context, 'GET', '/skills', {}, qs);
			const skills = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(skills as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Skill ────────────────────────────────────────────────
		case 'skill:getSkill': {
			const skillId = context.getNodeParameter('skillId', i) as string;
			const response = await zohoApiRequest(context, 'GET', `/skills/${encodeURIComponent(skillId)}`);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Create Skill ─────────────────────────────────────────────
		case 'skill:createSkill': {
			const name = context.getNodeParameter('skillName', i) as string;
			const skillTypeId = context.getNodeParameter('createSkillTypeId', i) as string;
			const status = context.getNodeParameter('skillStatus', i) as string;
			const criteriaJson = context.getNodeParameter('skillCriteria', i) as string;
			const options = context.getNodeParameter('createSkillOptions', i, {}) as IDataObject;

			let criteria: unknown;
			try { criteria = typeof criteriaJson === 'string' ? JSON.parse(criteriaJson) : criteriaJson; } catch { criteria = criteriaJson; }

			const body: Record<string, unknown> = { name, skillTypeId, status, criteria };
			if (options.description) body.description = options.description;
			if (options.agentIds) {
				body.agentIds = (options.agentIds as string).split(',').map((id) => id.trim()).filter(Boolean);
			}

			const response = await zohoApiRequest(context, 'POST', '/skills', body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Skill ─────────────────────────────────────────────
		case 'skill:updateSkill': {
			const skillId = context.getNodeParameter('skillId', i) as string;
			const updateFields = context.getNodeParameter('skillUpdateFields', i, {}) as IDataObject;
			const body: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(updateFields)) {
				if (val !== null && val !== undefined && val !== '') {
					if (key === 'criteria' && typeof val === 'string') {
						try { body[key] = JSON.parse(val); } catch { body[key] = val; }
					} else if (key === 'agentIds' && typeof val === 'string') {
						body[key] = val.split(',').map((id) => id.trim()).filter(Boolean);
					} else {
						body[key] = val;
					}
				}
			}
			const response = await zohoApiRequest(context, 'PATCH', `/skills/${encodeURIComponent(skillId)}`, body);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Delete Skill ─────────────────────────────────────────────
		case 'skill:deleteSkill': {
			const skillId = context.getNodeParameter('skillId', i) as string;
			const response = await zohoApiRequest(context, 'DELETE', `/skills/${encodeURIComponent(skillId)}`);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── List Business Hours ──────────────────────────────────────
		case 'businessHour:list': {
			const options = context.getNodeParameter('businessHourListOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			if (options.status) qs.status = options.status;
			if (options.businessHourIds) qs.businessHourIds = options.businessHourIds;
			const response = await zohoApiRequest(context, 'GET', '/businessHours', {}, qs);
			const hours = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(hours as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Business Hours ───────────────────────────────────────
		case 'businessHour:get': {
			const businessHourId = context.getNodeParameter('businessHourId', i) as string;
			const response = await zohoApiRequest(context, 'GET', `/businessHours/${encodeURIComponent(businessHourId)}`);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Create Business Hours ────────────────────────────────────
		case 'businessHour:create': {
			const name = context.getNodeParameter('businessHourName', i) as string;
			const status = context.getNodeParameter('businessHourStatus', i) as string;
			const type = context.getNodeParameter('businessHourType', i) as string;
			const timeZoneId = context.getNodeParameter('businessHourTimeZoneId', i) as string;
			const options = context.getNodeParameter('businessHourCreateOptions', i, {}) as IDataObject;

			const body: Record<string, unknown> = { name, status, type, timeZoneId };
			if (options.holidayListIds) {
				body.holidayListIds = (options.holidayListIds as string).split(',').map((id) => id.trim()).filter(Boolean);
			}
			if (options.businessTimes) {
				const bt = options.businessTimes;
				try { body.businessTimes = typeof bt === 'string' ? JSON.parse(bt) : bt; } catch { body.businessTimes = bt; }
			}

			const response = await zohoApiRequest(context, 'POST', '/businessHours', body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Business Hours ────────────────────────────────────
		case 'businessHour:update': {
			const businessHourId = context.getNodeParameter('businessHourId', i) as string;
			const updateFields = context.getNodeParameter('businessHourUpdateFields', i, {}) as IDataObject;
			const body: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(updateFields)) {
				if (val !== null && val !== undefined && val !== '') {
					if (key === 'holidayListIds' && typeof val === 'string') {
						body[key] = val.split(',').map((id) => id.trim()).filter(Boolean);
					} else if (key === 'businessTimes' && typeof val === 'string') {
						try { body[key] = JSON.parse(val); } catch { body[key] = val; }
					} else {
						body[key] = val;
					}
				}
			}
			const response = await zohoApiRequest(context, 'PATCH', `/businessHours/${encodeURIComponent(businessHourId)}`, body);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Delete Business Hours ────────────────────────────────────
		case 'businessHour:delete': {
			const businessHourId = context.getNodeParameter('businessHourId', i) as string;
			const response = await zohoApiRequest(context, 'DELETE', `/businessHours/${encodeURIComponent(businessHourId)}`);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── List Holiday Lists ───────────────────────────────────────
		case 'holidayList:list': {
			const options = context.getNodeParameter('holidayListListOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			if (options.limit) qs.limit = options.limit;
			if (options.from) qs.from = options.from;
			if (options.status) qs.status = options.status;
			const response = await zohoApiRequest(context, 'GET', '/holidayList', {}, qs);
			const lists = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(lists as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Holiday List ─────────────────────────────────────────
		case 'holidayList:get': {
			const holidayListId = context.getNodeParameter('holidayListId', i) as string;
			const response = await zohoApiRequest(context, 'GET', `/holidayList/${encodeURIComponent(holidayListId)}`);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Create Holiday List ──────────────────────────────────────
		case 'holidayList:create': {
			const name = context.getNodeParameter('holidayListName', i) as string;
			const status = context.getNodeParameter('holidayListStatus', i) as string;
			const holidaysData = context.getNodeParameter('holidays', i, {}) as IDataObject;
			const options = context.getNodeParameter('holidayListCreateOptions', i, {}) as IDataObject;

			const holidays = ((holidaysData.holiday as IDataObject[]) || []).map((h) => ({
				holidayName: h.holidayName || '',
				from: `${h.fromMonth || '01'}-${pad(h.fromDay || 1)}`,
				to: `${h.toMonth || '01'}-${pad(h.toDay || 1)}`,
			}));

			const body: Record<string, unknown> = { name, status, holidays };
			if (options.holidayListType) body.holidayListType = options.holidayListType;
			if (options.year) body.year = options.year;
			if (options.associatedBusinessHourIds) {
				body.associatedBusinessHourIds = (options.associatedBusinessHourIds as string).split(',').map((id) => id.trim()).filter(Boolean);
			}

			const response = await zohoApiRequest(context, 'POST', '/holidayList', body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Holiday List ──────────────────────────────────────
		case 'holidayList:update': {
			const holidayListId = context.getNodeParameter('holidayListId', i) as string;
			const updateFields = context.getNodeParameter('holidayListUpdateFields', i, {}) as IDataObject;
			const body: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(updateFields)) {
				if (val !== null && val !== undefined && val !== '') {
					if (key === 'holidays' && typeof val === 'object') {
						const holidaysData = val as IDataObject;
						body[key] = ((holidaysData.holiday as IDataObject[]) || []).map((h) => ({
							holidayName: h.holidayName || '',
							from: `${h.fromMonth || '01'}-${pad(h.fromDay || 1)}`,
							to: `${h.toMonth || '01'}-${pad(h.toDay || 1)}`,
						}));
					} else if (key === 'associatedBusinessHourIds' && typeof val === 'string') {
						body[key] = val.split(',').map((id) => id.trim()).filter(Boolean);
					} else {
						body[key] = val;
					}
				}
			}
			const response = await zohoApiRequest(context, 'PATCH', `/holidayList/${encodeURIComponent(holidayListId)}`, body);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Delete Holiday List ──────────────────────────────────────
		case 'holidayList:delete': {
			const holidayListId = context.getNodeParameter('holidayListId', i) as string;
			const response = await zohoApiRequest(context, 'DELETE', `/holidayList/${encodeURIComponent(holidayListId)}`);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── List Email Templates ─────────────────────────────────────
		case 'emailTemplate:list': {
			const options = context.getNodeParameter('templateListOptions', i, {}) as IDataObject;
			const qs: Record<string, unknown> = {};
			qs.departmentId = context.getNodeParameter('templateListDepartmentId', i) as string;
			if (options.module) qs.module = options.module;
			if (options.searchStr) qs.searchStr = options.searchStr;
			if (options.folderId) qs.folderId = options.folderId;
			if (options.from) qs.from = options.from;
			if (options.limit) qs.limit = options.limit;
			const response = await zohoApiRequest(context, 'GET', '/templates', {}, qs);
			const templates = response ? ((response as IDataObject).data || response) : [];
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(templates as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Get Email Template ───────────────────────────────────────
		case 'emailTemplate:get': {
			const templateId = context.getNodeParameter('templateId', i) as string;
			const response = await zohoApiRequest(context, 'GET', `/templates/${encodeURIComponent(templateId)}`);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Create Email Template ────────────────────────────────────
		case 'emailTemplate:create': {
			const templateName = context.getNodeParameter('templateName', i) as string;
			const subject = context.getNodeParameter('templateSubject', i) as string;
			const recordType = context.getNodeParameter('templateRecordType', i) as string;
			const departmentId = context.getNodeParameter('templateDepartmentId', i) as string;
			const folderId = context.getNodeParameter('templateFolderId', i) as string;
			const fromId = context.getNodeParameter('templateFromId', i) as string;
			const contentType = context.getNodeParameter('templateContentType', i) as string;
			const options = context.getNodeParameter('templateCreateOptions', i, {}) as IDataObject;

			const templateBody = context.getNodeParameter('templateBody', i, '') as string;
			const body: Record<string, unknown> = {
				templateName, subject, recordType, departmentId, folderId, fromId, contentType,
			};
			if (templateBody) body.body = templateBody;
			if (options.replyTo) body.replyTo = options.replyTo;
			if (options.attachmentIds) {
				body.attachmentIds = (options.attachmentIds as string).split(',').map((id) => id.trim()).filter(Boolean);
			}

			const response = await zohoApiRequest(context, 'POST', '/templates', body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Update Email Template ────────────────────────────────────
		case 'emailTemplate:update': {
			const templateId = context.getNodeParameter('templateId', i) as string;
			const updateFields = context.getNodeParameter('templateUpdateFields', i, {}) as IDataObject;
			const body: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(updateFields)) {
				if (val !== null && val !== undefined && val !== '') {
					if (key === 'attachmentIds') {
						body.attachmentIds = (val as string).split(',').map((id) => id.trim()).filter(Boolean);
					} else {
						body[key] = val;
					}
				}
			}
			const response = await zohoApiRequest(context, 'PATCH', `/templates/${encodeURIComponent(templateId)}`, body);
			const result = response || { success: true };
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Delete Email Template ────────────────────────────────────
		case 'emailTemplate:delete': {
			const templateId = context.getNodeParameter('templateId', i) as string;
			const response = await zohoApiRequest(context, 'DELETE', `/templates/${encodeURIComponent(templateId)}`);
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
