import type {
	IHookFunctions,
	IWebhookFunctions,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
	IWebhookResponseData,
	IDataObject,
} from 'n8n-workflow';
import { zohoWebhookRequest, zohoLoadOptionsRequest } from './helpers';

// ─── Event definitions per module ────────────────────────────────────────────

const TICKET_EVENTS: INodePropertyOptions[] = [
	{ name: 'Ticket Created', value: 'Ticket_Add' },
	{ name: 'Ticket Updated (With Previous Value)', value: 'Ticket_Update:prevState' },
	{ name: 'Ticket Updated (Without Previous Value)', value: 'Ticket_Update' },
	{ name: 'Ticket Updated - Specific Fields (With Previous Value)', value: 'Ticket_Update:fields:prevState' },
	{ name: 'Ticket Updated - Specific Fields (Without Previous Value)', value: 'Ticket_Update:fields' },
	{ name: 'Ticket Deleted', value: 'Ticket_Delete' },
	{ name: 'Comment Added', value: 'Ticket_Comment_Add' },
	{ name: 'Comment Updated', value: 'Ticket_Comment_Update' },
	{ name: 'Thread Added', value: 'Ticket_Thread_Add' },
	{ name: 'Thread Added (Incoming Only)', value: 'Ticket_Thread_Add:in' },
	{ name: 'Thread Added (Outgoing Only)', value: 'Ticket_Thread_Add:out' },
	{ name: 'Attachment Added', value: 'Ticket_Attachment_Add' },
	{ name: 'Attachment Updated', value: 'Ticket_Attachment_Update' },
	{ name: 'Attachment Deleted', value: 'Ticket_Attachment_Delete' },
	{ name: 'Approval Added', value: 'Ticket_Approval_Add' },
	{ name: 'Approval Updated (With Previous Value)', value: 'Ticket_Approval_Update:prevState' },
	{ name: 'Approval Updated (Without Previous Value)', value: 'Ticket_Approval_Update' },
];

const CONTACT_EVENTS: INodePropertyOptions[] = [
	{ name: 'Contact Created', value: 'Contact_Add' },
	{ name: 'Contact Updated (With Previous Value)', value: 'Contact_Update:prevState' },
	{ name: 'Contact Updated (Without Previous Value)', value: 'Contact_Update' },
	{ name: 'Contact Deleted', value: 'Contact_Delete' },
];

const ACCOUNT_EVENTS: INodePropertyOptions[] = [
	{ name: 'Account Created', value: 'Account_Add' },
	{ name: 'Account Updated (With Previous Value)', value: 'Account_Update:prevState' },
	{ name: 'Account Updated (Without Previous Value)', value: 'Account_Update' },
	{ name: 'Account Deleted', value: 'Account_Delete' },
];

const AGENT_EVENTS: INodePropertyOptions[] = [
	{ name: 'Agent Added', value: 'Agent_Add' },
	{ name: 'Agent Updated', value: 'Agent_Update' },
	{ name: 'Agent Deleted', value: 'Agent_Delete' },
	{ name: 'Presence Updated', value: 'Agent_Presence_Update' },
	{ name: 'Channel Preference Updated', value: 'Agent_Channel_Preference_Update' },
];

const DEPARTMENT_EVENTS: INodePropertyOptions[] = [
	{ name: 'Department Created', value: 'Department_Add' },
	{ name: 'Department Updated', value: 'Department_Update' },
];

const TASK_EVENTS: INodePropertyOptions[] = [
	{ name: 'Task Created', value: 'Task_Add' },
	{ name: 'Task Updated (With Previous Value)', value: 'Task_Update:prevState' },
	{ name: 'Task Updated (Without Previous Value)', value: 'Task_Update' },
	{ name: 'Task Deleted', value: 'Task_Delete' },
];

const CALL_EVENTS: INodePropertyOptions[] = [
	{ name: 'Call Created', value: 'Call_Add' },
	{ name: 'Call Updated (With Previous Value)', value: 'Call_Update:prevState' },
	{ name: 'Call Updated (Without Previous Value)', value: 'Call_Update' },
	{ name: 'Call Deleted', value: 'Call_Delete' },
];

const EVENT_EVENTS: INodePropertyOptions[] = [
	{ name: 'Event Created', value: 'Event_Add' },
	{ name: 'Event Updated (With Previous Value)', value: 'Event_Update:prevState' },
	{ name: 'Event Updated (Without Previous Value)', value: 'Event_Update' },
	{ name: 'Event Deleted', value: 'Event_Delete' },
];

const TIME_ENTRY_EVENTS: INodePropertyOptions[] = [
	{ name: 'Time Entry Created', value: 'TimeEntry_Add' },
	{ name: 'Time Entry Updated (With Previous Value)', value: 'TimeEntry_Update:prevState' },
	{ name: 'Time Entry Updated (Without Previous Value)', value: 'TimeEntry_Update' },
	{ name: 'Time Entry Deleted', value: 'TimeEntry_Delete' },
];

const KB_EVENTS: INodePropertyOptions[] = [
	{ name: 'Article Created', value: 'Article_Add' },
	{ name: 'Article Updated (With Previous Value)', value: 'Article_Update:prevState' },
	{ name: 'Article Updated (Without Previous Value)', value: 'Article_Update' },
	{ name: 'Article Deleted', value: 'Article_Delete' },
	{ name: 'Translation Added', value: 'Article_Translation_Add' },
	{ name: 'Translation Updated (With Previous Value)', value: 'Article_Translation_Update:prevState' },
	{ name: 'Translation Updated (Without Previous Value)', value: 'Article_Translation_Update' },
	{ name: 'Translation Deleted', value: 'Article_Translation_Delete' },
	{ name: 'Feedback Added', value: 'Article_Feedback_Add' },
	{ name: 'Root Category Created', value: 'KBRootCategory_Add' },
	{ name: 'Root Category Updated (With Previous Value)', value: 'KBRootCategory_Update:prevState' },
	{ name: 'Root Category Updated (Without Previous Value)', value: 'KBRootCategory_Update' },
	{ name: 'Root Category Deleted', value: 'KBRootCategory_Delete' },
	{ name: 'Section Created', value: 'KBSection_Add' },
	{ name: 'Section Updated (With Previous Value)', value: 'KBSection_Update:prevState' },
	{ name: 'Section Updated (Without Previous Value)', value: 'KBSection_Update' },
	{ name: 'Section Deleted', value: 'KBSection_Delete' },
];

const MESSAGING_EVENTS: INodePropertyOptions[] = [
	{ name: 'Message Added', value: 'IM_Message_Add' },
	{ name: 'Session Status Changed', value: 'IM_Session_Status' },
	{ name: 'Message Status Changed', value: 'IM_Message_Status' },
];


// Events that support departmentIds filtering
const DEPT_FILTER_EVENTS = new Set([
	'Ticket_Add', 'Ticket_Update', 'Ticket_Comment_Add', 'Ticket_Comment_Update',
	'Ticket_Thread_Add', 'Ticket_Attachment_Add', 'Ticket_Attachment_Update',
	'Task_Add', 'Task_Update', 'Call_Add', 'Call_Update', 'Event_Add', 'Event_Update',
	'IM_Message_Add', 'IM_Session_Status', 'IM_Message_Status',
]);

// Modules whose events support department filtering
const MODULES_WITH_DEPT_FILTER = ['ticket', 'task', 'call', 'event', 'messaging'];

export class ZohoDeskTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoho Desk Trigger',
		name: 'zohoDeskTrigger',
		icon: 'file:zohoDesk.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["module"]}}',
		description: 'Receive real-time events from Zoho Desk via webhooks',
		defaults: { name: 'Zoho Desk Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'zohoDeskOAuth2Api', required: true }],
		webhooks: [
			// Zoho sends a GET validation request when creating a webhook
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'webhook',
			},
			// Actual event data arrives via POST
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Each active workflow registers a separate webhook in Zoho Desk.<br/><br/><b>Tip:</b> To conserve webhooks, use a single trigger workflow with all needed events, then route to sub-workflows using a Switch node and Execute Workflow nodes.',
				name: 'webhookNotice',
				type: 'notice',
				default: '',
			},
			// ─── Module ──────────────────────────────────────────────────────
			{
				displayName: 'Module',
				name: 'module',
				type: 'options',
				noDataExpression: true,
				required: true,
				default: 'ticket',
				options: [
					{ name: 'Ticket', value: 'ticket' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Account', value: 'account' },
					{ name: 'Agent', value: 'agent' },
					{ name: 'Department', value: 'department' },
					{ name: 'Task', value: 'task' },
					{ name: 'Call', value: 'call' },
					{ name: 'Event', value: 'event' },
					{ name: 'Time Entry', value: 'timeEntry' },
					{ name: 'Knowledge Base', value: 'knowledgeBase' },
					{ name: 'Messaging', value: 'messaging' },
					],
				description: 'The module to listen for events on',
			},

// ─── Events (dynamically loaded based on module) ────────────────
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getEvents',
					loadOptionsDependsOn: ['module'],
				},
				description: 'The events to listen for',
			},

			// ─── Department Filter ───────────────────────────────────────────
			{
				displayName: 'Department Names or IDs',
				name: 'departmentIds',
				type: 'multiOptions',
				default: [],
				typeOptions: { loadOptionsMethod: 'getDepartments' },
				displayOptions: { show: { module: MODULES_WITH_DEPT_FILTER } },
				description: 'Filter events by department. Leave empty for all departments. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// ─── Track Fields (auto-shown when Specific Fields events selected)
			{
				displayName: 'Fields to Track',
				name: 'trackFields',
				type: 'multiOptions',
				default: [],
				typeOptions: { loadOptionsMethod: 'getTicketFields' },
				displayOptions: {
					show: {
						events: ['Ticket_Update:fields', 'Ticket_Update:fields:prevState'],
					},
				},
				description: 'Select up to 5 ticket fields to track for the "Specific Fields" update events',
			},

			// ─── Options ─────────────────────────────────────────────────────
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Include Events From Supervisor Rules',
						name: 'includeFromAutomation',
						type: 'boolean',
						default: false,
						description: 'Whether to include events triggered by supervisor rules. Supervisor rules will bulk update ticket events which may slow down your webhook callback URL.',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						placeholder: 'e.g. This webhook listens to ticket events',
						description: 'A description for this webhook subscription',
					},
					{
						displayName: 'Ignore Source ID',
						name: 'ignoreSourceId',
						type: 'string',
						default: '',
						placeholder: 'e.g. 49ad222a-f812-11e7-8c3f-9a214cf093ae',
						description: 'Specify the source ID (in UUID format) to be used by the listener when performing other API related actions in Zoho Desk. Events from this source will be ignored to prevent recursive loops.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const module = this.getCurrentNodeParameter('module') as string;
				const eventMap: Record<string, INodePropertyOptions[]> = {
					ticket: TICKET_EVENTS,
					contact: CONTACT_EVENTS,
					account: ACCOUNT_EVENTS,
					agent: AGENT_EVENTS,
					department: DEPARTMENT_EVENTS,
					task: TASK_EVENTS,
					call: CALL_EVENTS,
					event: EVENT_EVENTS,
					timeEntry: TIME_ENTRY_EVENTS,
					knowledgeBase: KB_EVENTS,
					messaging: MESSAGING_EVENTS,
					};
				return eventMap[module] ?? [];
			},

			async getDepartments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await zohoLoadOptionsRequest(this, '/departments', { isEnabled: true });
				return (response.data as Array<{ name: string; id: string }>).map((d) => ({
					name: d.name,
					value: d.id,
				}));
			},

			async getTicketFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const response = await zohoLoadOptionsRequest(this, '/fields', { module: 'tickets' });
					const fields = (response?.data ?? response ?? []) as Array<{ displayLabel: string; apiName: string }>;
					if (!Array.isArray(fields)) return [];
					return fields.map((f) => ({
						name: f.displayLabel || f.apiName,
						value: f.apiName,
					}));
				} catch {
					return [];
				}
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (!staticData.webhookId) return false;

				try {
					await zohoWebhookRequest(
						this,
						'GET',
						`/webhooks/${staticData.webhookId as string}`,
					);
					return true;
				} catch {
					delete staticData.webhookId;
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const module = this.getNodeParameter('module') as string;
				const events = this.getNodeParameter('events', []) as string[];
				const departmentIds = this.getNodeParameter('departmentIds', []) as string[];
				const options = this.getNodeParameter('options', {}) as IDataObject;

				// Parse track fields for "Specific Fields" events (max 5)
				const trackFields = (this.getNodeParameter('trackFields', []) as string[]).slice(0, 5);

				// Build subscriptions object
				const subscriptions: Record<string, unknown> = {};

				for (const event of events) {
					// Parse variant suffixes (e.g. "Ticket_Update:prevState", "Ticket_Thread_Add:in")
					const colonIdx = event.indexOf(':');
					let baseEvent = colonIdx === -1 ? event : event.substring(0, colonIdx);
					const modifiers = new Set(colonIdx === -1 ? [] : event.substring(colonIdx + 1).split(':'));

					const eventConfig: Record<string, unknown> = {};

					// Add department filter for supported events
					if (DEPT_FILTER_EVENTS.has(baseEvent) && departmentIds.length > 0) {
						eventConfig.departmentIds = departmentIds;
					}

					// Add includePrevState if variant includes :prevState
					if (modifiers.has('prevState')) {
						eventConfig.includePrevState = true;
					}

					// Add fields tracking if variant includes :fields
					if (modifiers.has('fields') && trackFields.length > 0) {
						eventConfig.fields = trackFields;
					}

					// Add direction filter for thread events (e.g. :in, :out)
					if (modifiers.has('in')) {
						eventConfig.direction = 'in';
					} else if (modifiers.has('out')) {
						eventConfig.direction = 'out';
					}

					subscriptions[baseEvent] = Object.keys(eventConfig).length > 0 ? eventConfig : null;
				}

				const body: Record<string, unknown> = {
					name: `n8n - ${this.getWorkflow().name || this.getWorkflow().id}`,
					url: webhookUrl,
					subscriptions,
				};

				// Include events from supervisor/automation rules
				if (options.includeFromAutomation) {
					body.includeEventsFrom = ['AUTOMATION'];
				}

				// Optional description
				if (options.description) {
					body.description = options.description;
				}

				// Ignore source ID to prevent recursive loops
				if (options.ignoreSourceId) {
					body.ignoreSourceId = options.ignoreSourceId;
				}

				const response = await zohoWebhookRequest(this, 'POST', '/webhooks', body) as IDataObject;

				const staticData = this.getWorkflowStaticData('node');
				staticData.webhookId = response.id;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (!staticData.webhookId) return true;

				try {
					await zohoWebhookRequest(
						this,
						'DELETE',
						`/webhooks/${staticData.webhookId as string}`,
					);
				} catch {
					// Webhook may already be deleted — ignore
				}

				delete staticData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookName = this.getWebhookName();

		// Handle Zoho's validation GET request
		if (webhookName === 'setup') {
			return {
				webhookResponse: 'OK',
				workflowData: [[{ json: { setup: true } }]],
			};
		}

		// Handle actual event data (POST)
		const body = this.getBodyData();
		const headers = this.getHeaderData();

		const output: IDataObject = { ...body };

		// Include Zoho event header if present
		if (headers['x-zoho-event']) {
			output.eventType = headers['x-zoho-event'] as string;
		}

		// Zoho may send events as an array
		if (Array.isArray(body)) {
			return {
				workflowData: [
					body.map((item: IDataObject) => ({ json: item })),
				],
			};
		}

		return {
			workflowData: [[{ json: output }]],
		};
	}
}
