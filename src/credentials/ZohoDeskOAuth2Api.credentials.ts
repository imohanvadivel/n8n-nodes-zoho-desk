import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ZohoDeskOAuth2Api implements ICredentialType {
	name = 'zohoDeskOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'Zoho Desk OAuth2 API';
	documentationUrl = 'https://desk.zoho.com/DeskAPIDocument#Introduction';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Zoho Data Center',
			name: 'datacenter',
			type: 'options',
			options: [
				{ name: 'zoho.com (US)', value: 'com' },
				{ name: 'zoho.com.au (Australia)', value: 'com.au' },
				{ name: 'zoho.com.cn (China)', value: 'com.cn' },
				{ name: 'zoho.eu (EU)', value: 'eu' },
				{ name: 'zoho.in (India)', value: 'in' },
				{ name: 'zoho.jp (Japan)', value: 'jp' },
			],
			default: 'com',
			description: 'The data center where your Zoho Desk account is hosted',
		},
		{
			displayName: 'Organization ID',
			name: 'orgId',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Zoho Desk Organization ID. Find this in Setup > Developer Space > API.',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '=https://accounts.zoho.{{$self["datacenter"]}}/oauth/v2/auth',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://accounts.zoho.{{$self["datacenter"]}}/oauth/v2/token',
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'hidden',
			default: '=https://desk.zoho.{{$self["datacenter"]}}/api/v1',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: [
				'Desk.tickets.ALL',
				'Desk.contacts.ALL',
				'Desk.tasks.ALL',
				'Desk.events.ALL',
				'Desk.calls.ALL',
				'Desk.activities.ALL',
				'Desk.products.ALL',
				'Desk.basic.ALL',
				'Desk.settings.ALL',
				'Desk.search.READ',
				'Desk.custommodule.ALL',
			].join(' '),
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'access_type=offline&prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://desk.zoho.{{$credentials["datacenter"]}}/api/v1',
			url: '/tickets?limit=1',
			headers: {
				orgId: '={{$credentials["orgId"]}}',
			},
		},
	};

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.oauthTokenData.access_token}}',
			},
		},
	};
}
