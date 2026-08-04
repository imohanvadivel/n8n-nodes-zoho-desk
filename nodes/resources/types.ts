import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export type ResourceProperties = INodeProperties[];

export type ResourceExecuteHandler = (
	context: IExecuteFunctions,
	operation: string,
	i: number,
) => Promise<INodeExecutionData[]>;
