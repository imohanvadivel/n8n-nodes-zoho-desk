import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	sharedLoadOptions,
	sharedResourceMapping,
} from '../helpers';
import { resourceProperties, executeHandlers } from '../resources';

export class ZohoDesk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoho Desk',
		name: 'zohoDesk',
		icon: { light: 'file:../../icons/zohoDesk.svg', dark: 'file:../../icons/zohoDesk.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with Zoho Desk API',
		defaults: { name: 'Zoho Desk' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'zohoDeskOAuth2Api', required: true }],
		properties: [
			// ─── Resource ─────────────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				required: true,
				options: [
					{ name: 'Agent', value: 'agent' },
					{ name: 'Business Hour', value: 'businessHour' },
					{ name: 'Comment', value: 'comment' },
					{ name: 'Dashboard', value: 'ticketMetrics' },
					{ name: 'Email Template', value: 'emailTemplate' },
					{ name: 'Holiday List', value: 'holidayList' },
					{ name: 'Organisation', value: 'organisation' },
					{ name: 'Profile', value: 'profile' },
					{ name: 'Record', value: 'record' },
					{ name: 'Role', value: 'role' },
					{ name: 'Skill', value: 'skill' },
					{ name: 'Tag', value: 'tag' },
					{ name: 'Thread', value: 'thread' },
					{ name: 'Ticket', value: 'ticket' },
					{ name: 'Ticket Approval', value: 'ticketApproval' },
					{ name: 'Ticket Attachment', value: 'ticketAttachment' },
					{ name: 'Ticket Follower', value: 'ticketFollower' },
					{ name: 'Ticket Pin', value: 'ticketPin' },
					{ name: 'Time Entry', value: 'timeEntry' },
				],
				default: 'record',
			},
			// ─── Ticket ID (shared across ticket sub-resources) ──────────────
			{
				displayName: 'Ticket ID',
				name: 'ticketId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['ticket', 'tag', 'ticketApproval', 'ticketAttachment', 'ticketFollower', 'ticketPin', 'thread', 'timeEntry'],
					},
					hide: {
						operation: ['listAll', 'listByTag', 'getCountByField'],
					},
				},
				description: 'The ID of the ticket',
			},
			// ─── All resource-specific properties ────────────────────────────
			...resourceProperties,
		],
	};

	methods = {
		loadOptions: {
			getModules: sharedLoadOptions.getModules,
			getDepartments: sharedLoadOptions.getDepartments,
			getLayoutsByModuleAndDept: sharedLoadOptions.getLayoutsByModuleAndDept,
			getLayoutFields: sharedLoadOptions.getLayoutFields,
			getModuleFields: sharedLoadOptions.getModuleFields,
			getAgentsByDepartment: sharedLoadOptions.getAgentsByDepartment,
			getTeamsByDepartment: sharedLoadOptions.getTeamsByDepartment,
			getAgentsByDepartmentForAssign: sharedLoadOptions.getAgentsByDepartmentForAssign,
			getAgentsByDepartmentForRoundRobin: sharedLoadOptions.getAgentsByDepartmentForRoundRobin,
			getAgentsByDepartmentForSkillAssign: sharedLoadOptions.getAgentsByDepartmentForSkillAssign,
			getAgentsByDepartmentForShiftAssign: sharedLoadOptions.getAgentsByDepartmentForShiftAssign,
			getBusinessHours: sharedLoadOptions.getBusinessHours,
			getAgentsByTeam: sharedLoadOptions.getAgentsByTeam,
			getContacts: sharedLoadOptions.getContacts,
			getAccounts: sharedLoadOptions.getAccounts,
			getAgents: sharedLoadOptions.getAgents,
			getProducts: sharedLoadOptions.getProducts,
			getTags: sharedLoadOptions.getTags,
			getTagsById: sharedLoadOptions.getTagsById,
			getSupportEmails: sharedLoadOptions.getSupportEmails,
			getTicketFields: sharedLoadOptions.getTicketFields,
			getCommentModules: sharedLoadOptions.getCommentModules,
			getStatusOptions: sharedLoadOptions.getStatusOptions,
			getPriorityOptions: sharedLoadOptions.getPriorityOptions,
			getChannelOptions: sharedLoadOptions.getChannelOptions,
			getSearchFields: sharedLoadOptions.getSearchFields,
			getSupportEmailAddresses: sharedLoadOptions.getSupportEmailAddresses,
			getTemplateFolders: sharedLoadOptions.getTemplateFolders,
		},
		resourceMapping: {
			getLayoutFieldMapping: sharedResourceMapping.getLayoutFieldMapping,
			getUpdateFieldMapping: sharedResourceMapping.getUpdateFieldMapping,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				const handler = executeHandlers[resource];
				if (!handler) {
					throw new NodeOperationError(
						this.getNode(),
						`Unknown resource: ${resource}`,
						{ itemIndex: i },
					);
				}

				const executionData = await handler(this, operation, i);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// Both constructors return the error untouched when handed an instance of
				// their own class, so an API failure keeps its HTTP code and Zoho error
				// body instead of being flattened into a generic operation error.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
