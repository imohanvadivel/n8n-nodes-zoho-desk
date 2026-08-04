import type { INodeProperties } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';

import { recordProperties, executeRecord } from './record';
import { agentProperties, executeAgent } from './agent';
import { ticketProperties, executeTicket } from './ticket';
import { ticketAssignmentProperties, executeTicketAssignment } from './ticketAssignment';
import { ticketSubResourcesProperties, executeTicketSubResources } from './ticketSubResources';
import { threadProperties, executeThread } from './thread';
import { commentProperties, executeComment } from './comment';
import { tagProperties, executeTag } from './tag';
import { timeEntryProperties, executeTimeEntry } from './timeEntry';
import { ticketMetricsProperties, executeTicketMetrics } from './ticketMetrics';
import { adminProperties, executeAdmin } from './admin';
import { accessControlProperties, executeAccessControl } from './accessControl';

// ─── Combined properties (spread into description.properties) ────────────────

export const resourceProperties: INodeProperties[] = [
	...recordProperties,
	...agentProperties,
	...ticketProperties,
	...ticketAssignmentProperties,
	...accessControlProperties,
	...adminProperties,
	...ticketMetricsProperties,
	...tagProperties,
	...threadProperties,
	...ticketSubResourcesProperties,
	...commentProperties,
	...timeEntryProperties,
];

// ─── Ticket composite handler (dispatches to ticket.ts or ticketAssignment.ts) ─

const ticketAssignmentOps = new Set([
	'assign', 'roundRobinAssign', 'skillBasedAssign', 'shiftBasedAssign',
]);

const compositeTicketHandler: ResourceExecuteHandler = async (context, operation, i) => {
	if (ticketAssignmentOps.has(operation)) {
		return executeTicketAssignment(context, operation, i);
	}
	return executeTicket(context, operation, i);
};

// ─── Execute dispatch map ────────────────────────────────────────────────────

export const executeHandlers: Record<string, ResourceExecuteHandler> = {
	record: executeRecord,
	agent: executeAgent,
	ticket: compositeTicketHandler,
	ticketFollower: executeTicketSubResources,
	ticketAttachment: executeTicketSubResources,
	ticketApproval: executeTicketSubResources,
	ticketPin: executeTicketSubResources,
	thread: executeThread,
	comment: executeComment,
	tag: executeTag,
	timeEntry: executeTimeEntry,
	ticketMetrics: executeTicketMetrics,
	skill: executeAdmin,
	businessHour: executeAdmin,
	holidayList: executeAdmin,
	emailTemplate: executeAdmin,
	role: executeAccessControl,
	profile: executeAccessControl,
	organisation: executeAccessControl,
};
