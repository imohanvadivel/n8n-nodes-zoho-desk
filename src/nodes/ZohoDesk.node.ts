import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	sharedLoadOptions,
	sharedResourceMapping,
} from './helpers';
import { resourceProperties, executeHandlers } from './resources';

export class ZohoDesk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoho Desk',
		name: 'zohoDesk',
		icon: 'file:zohoDesk.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with Zoho Desk API',
		defaults: { name: 'Zoho Desk' },
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
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
					{ name: 'Record', value: 'record' },
					{ name: 'Ticket', value: 'ticket' },
					{ name: 'Comment', value: 'comment' },
					{ name: 'Thread', value: 'thread' },
					{ name: 'Ticket Follower', value: 'ticketFollower' },
					{ name: 'Ticket Attachment', value: 'ticketAttachment' },
					{ name: 'Tag', value: 'tag' },
					{ name: 'Ticket Approval', value: 'ticketApproval' },
					{ name: 'Ticket Pin', value: 'ticketPin' },
					{ name: 'Time Entry', value: 'timeEntry' },
					{ name: 'Email Template', value: 'emailTemplate' },
					{ name: 'Skill', value: 'skill' },
					{ name: 'Agent', value: 'agent' },
					{ name: 'Business Hour', value: 'businessHour' },
					{ name: 'Holiday List', value: 'holidayList' },
					{ name: 'Organisation', value: 'organisation' },
					{ name: 'Profile', value: 'profile' },
					{ name: 'Role', value: 'role' },
					{ name: 'Dashboard', value: 'ticketMetrics' },
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
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
