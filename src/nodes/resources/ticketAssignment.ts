import type { INodeProperties, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ResourceExecuteHandler } from './types';
import { zohoApiRequest, fetchOnlineAgentIds, getActiveTicketCount } from '../helpers';

// ─── Module-level helpers ─────────────────────────────────────────────────────

// Parse GMT offset from timezone name like "( GMT 5:00 ) Pakistan Time( PLT )"
function parseUtcOffset(tzName: string): number {
	const match = tzName.match(/GMT\s*([+-]?\d+):(\d+)/);
	if (!match) return 0;
	const hours = parseInt(match[1]!, 10);
	const minutes = parseInt(match[2]!, 10);
	return (hours >= 0 ? 1 : -1) * (Math.abs(hours) * 60 + minutes);
}

// Parse business time to minutes from midnight (accepts "HH:MM" string or number of minutes)
function parseTime(t: string | number): number {
	if (typeof t === 'number') return (t >= 0 && t <= 1440) ? t : 0;
	const parts = t.split(':');
	if (parts.length < 2) return 0;
	const h = parseInt(parts[0]!, 10);
	const m = parseInt(parts[1]!, 10);
	if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return 0;
	return h * 60 + m;
}

// Check if a date (MM-DD) falls within a holiday range (handles year-crossing)
function isInHolidayRange(monthDay: string, from: string, to: string): boolean {
	if (from <= to) {
		// Normal range within same year (e.g., 03-01 to 03-10)
		return monthDay >= from && monthDay <= to;
	}
	// Range crosses year boundary (e.g., 12-20 to 01-10)
	return monthDay >= from || monthDay <= to;
}

// Attempt load-based assignment within an agent group
async function tryAssignFromGroup(
	context: Parameters<ResourceExecuteHandler>[0],
	groupAgentIds: string[],
	stateKey: string,
	staticData: Record<string, unknown>,
	departmentId: string,
	threshold: number,
	onlineAgentIds: Set<string> | null,
	agentsSkipped: Array<{ agentId: string; reason: string }>,
): Promise<{ agentId: string; ticketCount: number } | null> {
	const eligible: Array<{ agentId: string; ticketCount: number }> = [];

	for (const agentId of groupAgentIds) {
		if (onlineAgentIds && !onlineAgentIds.has(agentId)) {
			agentsSkipped.push({ agentId, reason: 'offline' });
			continue;
		}

		const count = await getActiveTicketCount(context, agentId, departmentId);
		if (count === -1) {
			agentsSkipped.push({ agentId, reason: 'apiError' });
			continue;
		}
		if (threshold > 0 && count >= threshold) {
			agentsSkipped.push({ agentId, reason: 'atThreshold' });
			continue;
		}
		eligible.push({ agentId, ticketCount: count });
	}

	if (eligible.length === 0) return null;

	eligible.sort((a, b) => a.ticketCount - b.ticketCount);
	const minCount = eligible[0]!.ticketCount;
	const tied = eligible.filter((a) => a.ticketCount === minCount);

	const lastAgentId = (staticData[stateKey] as string | undefined) ?? '';
	let selected: { agentId: string; ticketCount: number };

	if (tied.length > 1 && lastAgentId) {
		const lastIdx = tied.findIndex((a) => a.agentId === lastAgentId);
		selected = lastIdx !== -1
			? tied[(lastIdx + 1) % tied.length]!
			: tied[0]!;
	} else {
		selected = tied[0]!;
	}

	staticData[stateKey] = selected.agentId;
	return selected;
}

// ─── Properties ───────────────────────────────────────────────────────────────

export const ticketAssignmentProperties: INodeProperties[] = [
	// ─── Assign Ticket fields ─────────────────────────────────────────────────
	{
		displayName: 'Department Name or ID',
		name: 'assignDepartmentId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['assign'],
			},
		},
		description: 'The department of the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Assign To',
		name: 'assignToType',
		type: 'options',
		required: true,
		default: 'agent',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['assign'],
			},
		},
		options: [
			{ name: 'Agent', value: 'agent' },
			{ name: 'Team', value: 'team' },
			{ name: 'Agent Within a Team', value: 'agentInTeam' },
		],
		description: 'Whether to assign to an agent, a team, or an agent within a specific team',
	},
	{
		displayName: 'Agent Name or ID',
		name: 'assignAgentId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getAgentsByDepartmentForAssign',
			loadOptionsDependsOn: ['assignDepartmentId', 'assignToType'],
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['assign'], assignToType: ['agent'],
			},
		},
		description: 'The agent to assign the ticket to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Team Name or ID',
		name: 'assignTeamId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTeamsByDepartment',
			loadOptionsDependsOn: ['assignDepartmentId', 'assignToType'],
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['assign'], assignToType: ['team', 'agentInTeam'],
			},
		},
		description: 'The team to assign the ticket to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Agent Name or ID',
		name: 'assignTeamAgentId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getAgentsByTeam',
			loadOptionsDependsOn: ['assignTeamId', 'assignDepartmentId', 'assignToType'],
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['assign'], assignToType: ['agentInTeam'],
			},
		},
		description: 'The agent within the selected team. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// ─── Round Robin Assignment fields ────────────────────────────────────────
	{
		displayName: 'Department Name or ID',
		name: 'rrDepartmentId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['roundRobinAssign'],
			},
		},
		description: 'The department to scope agent selection to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Round Robin Type',
		name: 'rrType',
		type: 'options',
		required: true,
		default: 'sequential',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['roundRobinAssign'],
			},
		},
		options: [
			{ name: 'Sequential Assignment', value: 'sequential' },
			{ name: 'Load Based Assignment', value: 'loadBased' },
		],
		description: 'Sequential cycles through agents in order. Load-based assigns to the agent with the fewest active tickets.',
	},
	{
		displayName: 'Agents (Ordered)',
		name: 'rrAgentsSequential',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		required: true,
		placeholder: 'Add Agent',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['roundRobinAssign'], rrType: ['sequential'],
			},
		},
		description: 'Agents to include in the round-robin rotation. Drag to reorder. The order defines the assignment sequence.',
		options: [
			{
				displayName: 'Agent',
				name: 'agent',
				values: [
					{
						displayName: 'Agent Name or ID',
						name: 'agentId',
						type: 'options',
						required: true,
						typeOptions: {
							loadOptionsMethod: 'getAgentsByDepartmentForRoundRobin',
							loadOptionsDependsOn: ['rrDepartmentId'],
						},
						default: '',
						description: 'Select an agent. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
				],
			},
		],
	},
	{
		displayName: 'Agent Names or IDs',
		name: 'rrAgentsLoadBased',
		type: 'multiOptions',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getAgentsByDepartmentForRoundRobin',
			loadOptionsDependsOn: ['rrDepartmentId'],
		},
		default: [],
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['roundRobinAssign'], rrType: ['loadBased'],
			},
		},
		description: 'Agents to include in the load-based round-robin pool. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Max Open Tickets Per Agent',
		name: 'rrThreshold',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 0 },
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['roundRobinAssign'],
			},
		},
		description: 'Maximum number of active (non-closed) tickets an agent can have before being skipped. Set to 0 for no limit.',
	},
	{
		displayName: 'Assign to Offline Agents',
		name: 'rrAssignOffline',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['roundRobinAssign'],
			},
		},
		description: 'Whether to include offline agents in the round-robin pool. When disabled, only online agents receive assignments.',
	},
	// ─── Skill Based Assignment fields ────────────────────────────────────────
	{
		displayName: 'Department Name or ID',
		name: 'sbaDepartmentId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['skillBasedAssign'],
			},
		},
		description: 'The department to scope agent and skill matching to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Agent Names or IDs',
		name: 'sbaAgents',
		type: 'multiOptions',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getAgentsByDepartmentForSkillAssign',
			loadOptionsDependsOn: ['sbaDepartmentId'],
		},
		default: [],
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['skillBasedAssign'],
			},
		},
		description: 'Agents to consider for skill-based assignment. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Max Open Tickets Per Agent',
		name: 'sbaThreshold',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 0 },
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['skillBasedAssign'],
			},
		},
		description: 'Maximum number of active (non-closed) tickets an agent can have before being skipped. Set to 0 for no limit.',
	},
	{
		displayName: 'Assign to Offline Agents',
		name: 'sbaAssignOffline',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['skillBasedAssign'],
			},
		},
		description: 'Whether to include offline agents. When disabled, only online agents are considered.',
	},
	// ─── Shift Based Assignment fields ────────────────────────────────────────
	{
		displayName: 'Department Name or ID',
		name: 'shiftDepartmentId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['shiftBasedAssign'],
			},
		},
		description: 'The department to scope agent selection to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Shift Groups',
		name: 'shiftGroups',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		required: true,
		placeholder: 'Add Shift',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['shiftBasedAssign'],
			},
		},
		description: 'Map business hours to agent groups. Drag to reorder — order defines priority when shifts overlap. First matching active shift wins.',
		options: [
			{
				displayName: 'Shift',
				name: 'shift',
				values: [
					{
						displayName: 'Business Hour Name or ID',
						name: 'businessHourId',
						type: 'options',
						required: true,
						typeOptions: { loadOptionsMethod: 'getBusinessHours' },
						default: '',
						description: 'The business hour that defines this shift\'s schedule. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Agent Names or IDs',
						name: 'agents',
						type: 'multiOptions',
						required: true,
						typeOptions: {
							loadOptionsMethod: 'getAgentsByDepartmentForShiftAssign',
							loadOptionsDependsOn: ['shiftDepartmentId'],
						},
						default: [],
						description: 'Agents assigned to this shift. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
				],
			},
		],
	},
	{
		displayName: 'Fallback Agent Names or IDs',
		name: 'shiftFallbackAgents',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getAgentsByDepartmentForShiftAssign',
			loadOptionsDependsOn: ['shiftDepartmentId'],
		},
		default: [],
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['shiftBasedAssign'],
			},
		},
		description: 'Agents to assign to when no shift is currently active (off-hours / on-call). Leave empty to return a warning instead.',
	},
	{
		displayName: 'Max Open Tickets Per Agent',
		name: 'shiftThreshold',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 0 },
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['shiftBasedAssign'],
			},
		},
		description: 'Maximum number of active (non-closed) tickets an agent can have before being skipped. Set to 0 for no limit.',
	},
	{
		displayName: 'Assign to Offline Agents',
		name: 'shiftAssignOffline',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['ticket'], operation: ['shiftBasedAssign'],
			},
		},
		description: 'Whether to include offline agents. When disabled, only online agents are considered.',
	},
];

// ─── Execute handler ──────────────────────────────────────────────────────────

export const executeTicketAssignment: ResourceExecuteHandler = async (context, operation, i) => {
	const returnData: INodeExecutionData[] = [];
	const ticketId = context.getNodeParameter('ticketId', i) as string;

	switch (operation) {
		// ─── Assign Ticket ────────────────────────────────────────────────────
		case 'assign': {
			const assignToType = context.getNodeParameter('assignToType', i) as string;
			const body: Record<string, unknown> = {};

			if (assignToType === 'agent') {
				body.assigneeId = context.getNodeParameter('assignAgentId', i) as string;
			} else if (assignToType === 'team') {
				body.teamId = context.getNodeParameter('assignTeamId', i) as string;
			} else if (assignToType === 'agentInTeam') {
				body.teamId = context.getNodeParameter('assignTeamId', i) as string;
				body.assigneeId = context.getNodeParameter('assignTeamAgentId', i) as string;
			}

			const response = await zohoApiRequest(context, 'PATCH', `/tickets/${encodeURIComponent(ticketId)}`, body);
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(response as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Round Robin Assignment ───────────────────────────────────────────
		case 'roundRobinAssign': {
			const rrDepartmentId = context.getNodeParameter('rrDepartmentId', i) as string;
			const rrType = context.getNodeParameter('rrType', i) as string;
			const threshold = context.getNodeParameter('rrThreshold', i) as number;
			const assignOffline = context.getNodeParameter('rrAssignOffline', i) as boolean;
			const staticData = context.getWorkflowStaticData('node');

			// Build agent list based on mode
			let agentIds: string[];
			if (rrType === 'sequential') {
				const agentsParam = context.getNodeParameter('rrAgentsSequential', i, {}) as IDataObject;
				const agentEntries = (agentsParam.agent as IDataObject[] | undefined) || [];
				agentIds = agentEntries.map((e) => e.agentId as string).filter(Boolean);
			} else {
				agentIds = context.getNodeParameter('rrAgentsLoadBased', i, []) as string[];
				agentIds = [...new Set(agentIds)]; // deduplicate for load-based
			}

			if (agentIds.length === 0) {
				throw new NodeOperationError(
					context.getNode(),
					'At least one agent must be selected for round-robin assignment.',
					{ itemIndex: i },
				);
			}

			const onlineAgentIds = assignOffline ? null : await fetchOnlineAgentIds(context, rrDepartmentId);

			const agentsSkipped: Array<{ agentId: string; reason: string }> = [];
			let selectedAgentId: string | null = null;
			let selectedIndex = -1;

			if (rrType === 'sequential') {
				// Sequential: cycle from last index
				const lastIndex = (staticData.lastIndex as number | undefined) ?? -1;

				for (let attempt = 0; attempt < agentIds.length; attempt++) {
					const candidateIndex = (lastIndex + 1 + attempt) % agentIds.length;
					const candidateId = agentIds[candidateIndex] as string;

					if (onlineAgentIds && !onlineAgentIds.has(candidateId)) {
						agentsSkipped.push({ agentId: candidateId, reason: 'offline' });
						continue;
					}

					if (threshold > 0) {
						const count = await getActiveTicketCount(context, candidateId, rrDepartmentId);
						if (count === -1 || count >= threshold) {
							agentsSkipped.push({
								agentId: candidateId,
								reason: count === -1 ? 'apiError' : 'atThreshold',
							});
							continue;
						}
					}

					selectedAgentId = candidateId;
					selectedIndex = candidateIndex;
					break;
				}

				if (selectedAgentId) {
					staticData.lastIndex = selectedIndex;
				}
			} else {
				// Load-based: find agent with fewest active tickets
				const lastAgentId = (staticData.lastAgentId as string | undefined) ?? '';

				// Filter by online status first
				const onlineAgents = onlineAgentIds
					? agentIds.filter((id) => {
						if (onlineAgentIds!.has(id)) return true;
						agentsSkipped.push({ agentId: id, reason: 'offline' });
						return false;
					})
					: agentIds;

				// Get counts, apply threshold, and find best agent
				const agentCounts: Array<{ agentId: string; count: number }> = [];
				for (const agentId of onlineAgents) {
					const count = await getActiveTicketCount(context, agentId, rrDepartmentId);
					if (count === -1) {
						agentsSkipped.push({ agentId, reason: 'apiError' });
					} else if (threshold > 0 && count >= threshold) {
						agentsSkipped.push({ agentId, reason: 'atThreshold' });
					} else {
						agentCounts.push({ agentId, count });
					}
				}

				if (agentCounts.length > 0) {
					agentCounts.sort((a, b) => a.count - b.count);
					const minCount = agentCounts[0]!.count;
					const tied = agentCounts.filter((a) => a.count === minCount);

					if (tied.length > 1 && lastAgentId) {
						const lastIdx = tied.findIndex((a) => a.agentId === lastAgentId);
						selectedAgentId = lastIdx !== -1
							? tied[(lastIdx + 1) % tied.length]!.agentId
							: tied[0]!.agentId;
					} else {
						selectedAgentId = tied[0]!.agentId;
					}
				}

				if (selectedAgentId) {
					staticData.lastAgentId = selectedAgentId;
				}
			}

			// Build result
			let result: IDataObject;
			if (selectedAgentId) {
				const response = await zohoApiRequest(
					context, 'PATCH',
					`/tickets/${encodeURIComponent(ticketId)}`,
					{ assigneeId: selectedAgentId },
				);
				result = (response as IDataObject) || {};
				result._roundRobin = {
					assigned: true,
					assignedAgentId: selectedAgentId,
					mode: rrType,
					agentsEvaluated: agentIds.length,
					agentsSkipped,
				};
			} else {
				result = {
					_roundRobin: {
						assigned: false,
						warning: 'All agents in the pool are either at their ticket threshold or offline.',
						ticketId,
						mode: rrType,
						agentsEvaluated: agentIds.length,
						agentsSkipped,
					},
				};
			}

			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Skill Based Assignment ───────────────────────────────────────────
		case 'skillBasedAssign': {
			const sbaDepartmentId = context.getNodeParameter('sbaDepartmentId', i) as string;
			const agentIds = [...new Set(context.getNodeParameter('sbaAgents', i, []) as string[])];
			const threshold = context.getNodeParameter('sbaThreshold', i) as number;
			const assignOffline = context.getNodeParameter('sbaAssignOffline', i) as boolean;

			if (agentIds.length === 0) {
				throw new NodeOperationError(
					context.getNode(),
					'At least one agent must be selected for skill-based assignment.',
					{ itemIndex: i },
				);
			}

			// Step 1: Get the ticket to retrieve its skills
			const ticket = await zohoApiRequest(context, 'GET', `/tickets/${encodeURIComponent(ticketId)}`, {}, { include: 'skills' }) as IDataObject;
			const ticketSkills = (ticket.entitySkills ?? ticket.skills ?? []) as Array<{ id?: string; skillId?: string; name?: string }>;
			const ticketSkillIds = new Set(
				ticketSkills.map((s) => String(s.id ?? s.skillId ?? '')).filter(Boolean),
			);

			if (ticketSkillIds.size === 0) {
				// No skills on the ticket — cannot match
				const result: IDataObject = {
					_skillBasedAssignment: {
						assigned: false,
						warning: 'The ticket has no skills associated with it. Cannot perform skill-based assignment.',
						ticketId,
					},
				};
				const executionData = context.helpers.constructExecutionMetaData(
					context.helpers.returnJsonArray(result),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
				break;
			}

			// Step 2: Fetch online agents if needed
			const onlineAgentIds = assignOffline ? null : await fetchOnlineAgentIds(context, sbaDepartmentId);

			// Step 3: For each agent, get skills and compute match score
			const agentsSkipped: Array<{ agentId: string; reason: string }> = [];
			const agentScores: Array<{ agentId: string; matchCount: number; matchedSkills: string[]; ticketCount: number }> = [];

			for (const agentId of agentIds) {
				if (onlineAgentIds && !onlineAgentIds.has(agentId)) {
					agentsSkipped.push({ agentId, reason: 'offline' });
					continue;
				}

				// Fetch ticket count once — used for both threshold and tie-breaking
				const ticketCount = await getActiveTicketCount(context, agentId, sbaDepartmentId);
				if (ticketCount === -1) {
					agentsSkipped.push({ agentId, reason: 'apiError' });
					continue;
				}
				if (threshold > 0 && ticketCount >= threshold) {
					agentsSkipped.push({ agentId, reason: 'atThreshold' });
					continue;
				}

				// Get agent skills
				try {
					const skillsResponse = await zohoApiRequest(context, 'GET', `/agents/${encodeURIComponent(agentId)}/skills`, {}, {
						departmentIds: sbaDepartmentId,
					});
					const agentDepts = (skillsResponse
						? ((skillsResponse as IDataObject).data || skillsResponse) as IDataObject[]
						: []) as Array<{ associatedSkills?: Array<{ skillId?: string; skillName?: string }>; departmentId?: string }>;

					const matchedSkills: string[] = [];
					for (const dept of (Array.isArray(agentDepts) ? agentDepts : [])) {
						for (const skill of (dept.associatedSkills || [])) {
							const skillId = String(skill.skillId ?? '');
							if (skillId && ticketSkillIds.has(skillId)) {
								matchedSkills.push(skill.skillName || skillId);
							}
						}
					}

					if (matchedSkills.length === 0) {
						agentsSkipped.push({ agentId, reason: 'noSkillMatch' });
						continue;
					}

					agentScores.push({ agentId, matchCount: matchedSkills.length, matchedSkills, ticketCount });
				} catch {
					agentsSkipped.push({ agentId, reason: 'apiError' });
				}
			}

			// Step 4: Select best agent — most matching skills, then fewest tickets
			agentScores.sort((a, b) => {
				if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
				return a.ticketCount - b.ticketCount;
			});

			let result: IDataObject;
			if (agentScores.length > 0) {
				const best = agentScores[0]!;
				const response = await zohoApiRequest(
					context, 'PATCH',
					`/tickets/${encodeURIComponent(ticketId)}`,
					{ assigneeId: best.agentId },
				);
				result = (response as IDataObject) || {};
				result._skillBasedAssignment = {
					assigned: true,
					assignedAgentId: best.agentId,
					matchedSkills: best.matchedSkills,
					matchCount: best.matchCount,
					ticketSkillCount: ticketSkillIds.size,
					agentsEvaluated: agentIds.length,
					agentsSkipped,
					rankings: agentScores.map((a) => ({
						agentId: a.agentId,
						matchCount: a.matchCount,
						matchedSkills: a.matchedSkills,
						ticketCount: a.ticketCount,
					})),
				};
			} else {
				result = {
					_skillBasedAssignment: {
						assigned: false,
						warning: 'No eligible agent found with matching skills for this ticket.',
						ticketId,
						ticketSkillCount: ticketSkillIds.size,
						agentsEvaluated: agentIds.length,
						agentsSkipped,
					},
				};
			}

			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
			break;
		}

		// ─── Shift Based Assignment ───────────────────────────────────────────
		case 'shiftBasedAssign': {
			const shiftDepartmentId = context.getNodeParameter('shiftDepartmentId', i) as string;
			const shiftGroupsParam = context.getNodeParameter('shiftGroups', i, {}) as IDataObject;
			const shiftEntries = (shiftGroupsParam.shift as IDataObject[] | undefined) || [];
			const fallbackAgentIds = [...new Set(context.getNodeParameter('shiftFallbackAgents', i, []) as string[])];
			const threshold = context.getNodeParameter('shiftThreshold', i) as number;
			const assignOffline = context.getNodeParameter('shiftAssignOffline', i) as boolean;
			const staticData = context.getWorkflowStaticData('node');

			if (shiftEntries.length === 0 && fallbackAgentIds.length === 0) {
				throw new NodeOperationError(
					context.getNode(),
					'At least one shift group or fallback agent must be configured.',
					{ itemIndex: i },
				);
			}

			const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
			const now = new Date();

			const onlineAgentIds = assignOffline ? null : await fetchOnlineAgentIds(context, shiftDepartmentId);
			const agentsSkipped: Array<{ agentId: string; reason: string }> = [];

			// Step 1: Check each shift group in priority order
			let assignedAgentId: string | null = null;
			let matchedShiftName = '';
			let matchedBusinessHourId = '';
			const shiftsEvaluated: Array<{ businessHourId: string; name: string; active: boolean; reason?: string }> = [];

			for (const entry of shiftEntries) {
				const bhId = entry.businessHourId as string;
				const shiftAgentIds = [...new Set(entry.agents as string[])];
				if (!bhId || shiftAgentIds.length === 0) continue;

				// Fetch the business hour
				let bh: IDataObject;
				try {
					bh = await zohoApiRequest(context, 'GET', `/businessHours/${encodeURIComponent(bhId)}`) as IDataObject;
				} catch {
					shiftsEvaluated.push({ businessHourId: bhId, name: '(fetch failed)', active: false, reason: 'apiError' });
					continue;
				}

				const bhName = (bh.name as string) || bhId;
				const bhType = (bh.type as string) || '';
				const tz = bh.timeZone as IDataObject | undefined;
				const tzName = (tz?.name as string) || '( GMT 0:00 )';
				const offsetMinutes = parseUtcOffset(tzName);

				// Convert UTC now to business hour's local time
				const localMs = now.getTime() + offsetMinutes * 60 * 1000;
				const localDate = new Date(localMs);
				const dayOfWeek = DAY_NAMES[localDate.getUTCDay()]!;
				const currentMinutes = localDate.getUTCHours() * 60 + localDate.getUTCMinutes();
				const monthDay = String(localDate.getUTCMonth() + 1).padStart(2, '0') + '-' + String(localDate.getUTCDate()).padStart(2, '0');

				// Check holidays
				const holidayList = bh.associatedHolidayList as IDataObject | undefined;
				if (holidayList && holidayList.holidayListId) {
					try {
						const hlResponse = await zohoApiRequest(context, 'GET',
							`/holidayLists/${encodeURIComponent(String(holidayList.holidayListId))}`,
						) as IDataObject;
						const holidays = (hlResponse.holidays ?? []) as Array<{ from: string; to: string }>;
						const isHoliday = holidays.some((h) => isInHolidayRange(monthDay, h.from, h.to));
						if (isHoliday) {
							shiftsEvaluated.push({ businessHourId: bhId, name: bhName, active: false, reason: 'holiday' });
							continue;
						}
					} catch {
						// Can't fetch holiday list — proceed without holiday check
					}
				}

				// Check if current time falls within business hours
				let isActive = false;
				if (bhType === '24X7') {
					isActive = true;
				} else {
					const businessTimes = (bh.businessTimes ?? []) as Array<{ day: string; startTime: string | number; endTime: string | number }>;
					const todayEntry = businessTimes.find((bt) => bt.day === dayOfWeek);
					if (todayEntry) {
						const start = parseTime(todayEntry.startTime);
						const end = parseTime(todayEntry.endTime);
						if (start === 0 && end === 0) {
							// "00:00" to "00:00" means closed
							isActive = false;
						} else if (start < end) {
							// Normal hours (e.g., 09:00 to 17:00)
							isActive = currentMinutes >= start && currentMinutes < end;
						} else {
							// Overnight shift (e.g., 18:00 to 06:00)
							isActive = currentMinutes >= start || currentMinutes < end;
						}
					}
				}

				if (!isActive) {
					shiftsEvaluated.push({ businessHourId: bhId, name: bhName, active: false, reason: 'outsideHours' });
					continue;
				}

				shiftsEvaluated.push({ businessHourId: bhId, name: bhName, active: true });

				// Try assigning from this shift's agents (load-based round-robin)
				const selected = await tryAssignFromGroup(
					context,
					shiftAgentIds,
					`shift_rr_${bhId}`,
					staticData,
					shiftDepartmentId,
					threshold,
					onlineAgentIds,
					agentsSkipped,
				);
				if (selected) {
					assignedAgentId = selected.agentId;
					matchedShiftName = bhName;
					matchedBusinessHourId = bhId;
					break;
				}
				// Cascade: all agents in this shift unavailable, try next active shift
			}

			// Step 2: If no shift matched or all agents unavailable, try fallback
			if (!assignedAgentId && fallbackAgentIds.length > 0) {
				const selected = await tryAssignFromGroup(
					context,
					fallbackAgentIds,
					'shift_rr_fallback',
					staticData,
					shiftDepartmentId,
					threshold,
					onlineAgentIds,
					agentsSkipped,
				);
				if (selected) {
					assignedAgentId = selected.agentId;
					matchedShiftName = '(fallback)';
					matchedBusinessHourId = 'fallback';
				}
			}

			// Step 3: Build result
			let result: IDataObject;
			if (assignedAgentId) {
				const response = await zohoApiRequest(
					context, 'PATCH',
					`/tickets/${encodeURIComponent(ticketId)}`,
					{ assigneeId: assignedAgentId },
				);
				result = (response as IDataObject) || {};
				result._shiftBasedAssignment = {
					assigned: true,
					assignedAgentId,
					matchedShift: matchedShiftName,
					matchedBusinessHourId,
					shiftsEvaluated,
					agentsSkipped,
				};
			} else {
				result = {
					_shiftBasedAssignment: {
						assigned: false,
						warning: 'No active shift found or all agents are at threshold/offline.',
						ticketId,
						shiftsEvaluated,
						agentsSkipped,
					},
				};
			}

			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(result),
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
