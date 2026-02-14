/**
 * HRMS Connector Registry
 * 
 * Each connector defines:
 *   - id, name, description, icon
 *   - authType: 'oauth2' | 'basic' | 'apikey' | 'bearer'
 *   - configFields: fields the user must supply
 *   - endpoints: default API endpoint templates
 *   - fieldMapping: hints mapping HRMS fields → SCIM attributes
 * 
 * To add a new HRMS, just add an entry below — the UI and backend
 * will pick it up automatically.
 */
const CONNECTORS = {
  workday: {
    id: 'workday',
    name: 'Workday',
    description: 'Pull worker data from Workday Human Capital Management via REST API',
    icon: '🏢',
    category: 'HCM',
    authType: 'oauth2',
    configFields: [
      { key: 'baseUrl', label: 'Workday REST API Base URL', placeholder: 'https://<tenant>.workday.com/ccx/api/v1/<tenant>', required: true },
      { key: 'clientId', label: 'Client ID (ISU)', placeholder: 'OAuth2 client from Workday', required: true },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Client secret', required: true, secret: true },
      { key: 'tokenUrl', label: 'Token Endpoint', placeholder: 'https://<tenant>.workday.com/ccx/oauth2/<tenant>/token', required: true },
      { key: 'workersEndpoint', label: 'Workers Endpoint Path', placeholder: '/workers', required: false, default: '/workers' },
    ],
    responseMapping: {
      dataPath: 'data',         // JSON path to the array of records
      totalPath: 'total',       // JSON path to total count
      pagingParam: 'offset',    // query param for pagination
      pageSizeParam: 'limit',   // query param for page size
      defaultPageSize: 100,
    },
    sampleFieldHints: {
      'Worker_ID': 'externalId',
      'User_ID': 'userName',
      'First_Name': 'name.givenName',
      'Last_Name': 'name.familyName',
      'Email_Address': 'emails.0.value',
      'Job_Title': 'title',
      'Department': 'enterprise.department',
      'Manager_ID': 'enterprise.manager.value',
    },
  },

  sapSuccessFactors: {
    id: 'sapSuccessFactors',
    name: 'SAP SuccessFactors',
    description: 'Pull employee data from SAP SuccessFactors via OData API',
    icon: '🔷',
    category: 'HCM',
    authType: 'basic',
    configFields: [
      { key: 'baseUrl', label: 'API Base URL', placeholder: 'https://<datacenter>.successfactors.com/odata/v2', required: true },
      { key: 'username', label: 'API Username', placeholder: 'companyId\\username', required: true },
      { key: 'password', label: 'API Password', placeholder: 'Password', required: true, secret: true },
      { key: 'entity', label: 'OData Entity', placeholder: 'User or PerPerson', required: false, default: 'User' },
      { key: 'selectFields', label: 'Fields to Retrieve ($select)', placeholder: 'userId,firstName,lastName,email,...', required: false },
    ],
    responseMapping: {
      dataPath: 'd.results',
      totalPath: 'd.__count',
      pagingParam: '$skip',
      pageSizeParam: '$top',
      defaultPageSize: 100,
    },
    sampleFieldHints: {
      'userId': 'externalId',
      'username': 'userName',
      'firstName': 'name.givenName',
      'lastName': 'name.familyName',
      'email': 'emails.0.value',
      'title': 'title',
      'department': 'enterprise.department',
      'division': 'enterprise.division',
      'managerId': 'enterprise.manager.value',
    },
  },

  bamboohr: {
    id: 'bamboohr',
    name: 'BambooHR',
    description: 'Pull employee directory data from BambooHR via REST API',
    icon: '🎋',
    category: 'HCM',
    authType: 'apikey',
    configFields: [
      { key: 'baseUrl', label: 'API Base URL', placeholder: 'https://api.bamboohr.com/api/gateway.php/<companyDomain>/v1', required: true },
      { key: 'apiKey', label: 'API Key', placeholder: 'BambooHR API key', required: true, secret: true },
      { key: 'fields', label: 'Fields to Retrieve', placeholder: 'id,firstName,lastName,workEmail,...', required: false },
    ],
    responseMapping: {
      dataPath: 'employees',
      totalPath: null,
      pagingParam: null,
      pageSizeParam: null,
      defaultPageSize: null,
    },
    sampleFieldHints: {
      'id': 'externalId',
      'firstName': 'name.givenName',
      'lastName': 'name.familyName',
      'workEmail': 'emails.0.value',
      'jobTitle': 'title',
      'department': 'enterprise.department',
      'supervisor': 'enterprise.manager.displayName',
    },
  },

  adp: {
    id: 'adp',
    name: 'ADP Workforce Now',
    description: 'Pull worker data from ADP Workforce Now via REST API',
    icon: '📊',
    category: 'Payroll / HCM',
    authType: 'oauth2',
    configFields: [
      { key: 'baseUrl', label: 'API Base URL', placeholder: 'https://api.adp.com', required: true },
      { key: 'clientId', label: 'Client ID', placeholder: 'ADP app client ID', required: true },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'ADP app client secret', required: true, secret: true },
      { key: 'tokenUrl', label: 'Token Endpoint', placeholder: 'https://accounts.adp.com/auth/oauth/v2/token', required: true },
      { key: 'sslCertPath', label: 'SSL Client Certificate Path (optional)', placeholder: '/path/to/cert.pem', required: false },
    ],
    responseMapping: {
      dataPath: 'workers',
      totalPath: 'meta.totalNumber',
      pagingParam: '$skip',
      pageSizeParam: '$top',
      defaultPageSize: 100,
    },
    sampleFieldHints: {
      'associateOID': 'externalId',
      'workerID': 'userName',
      'givenName': 'name.givenName',
      'familyName': 'name.familyName',
      'emailAddress': 'emails.0.value',
      'jobTitle': 'title',
      'departmentName': 'enterprise.department',
    },
  },

  oracleHCM: {
    id: 'oracleHCM',
    name: 'Oracle HCM Cloud',
    description: 'Pull worker data from Oracle Fusion HCM Cloud via REST API',
    icon: '🔴',
    category: 'HCM',
    authType: 'basic',
    configFields: [
      { key: 'baseUrl', label: 'API Base URL', placeholder: 'https://<pod>.oraclecloud.com/hcmRestApi/resources/11.13.18.05', required: true },
      { key: 'username', label: 'Username', placeholder: 'integration_user', required: true },
      { key: 'password', label: 'Password', placeholder: 'Password', required: true, secret: true },
      { key: 'entity', label: 'Resource', placeholder: 'emps or workers', required: false, default: 'emps' },
    ],
    responseMapping: {
      dataPath: 'items',
      totalPath: 'totalResults',
      pagingParam: 'offset',
      pageSizeParam: 'limit',
      defaultPageSize: 100,
    },
    sampleFieldHints: {
      'PersonNumber': 'externalId',
      'UserName': 'userName',
      'FirstName': 'name.givenName',
      'LastName': 'name.familyName',
      'EmailAddress': 'emails.0.value',
      'JobName': 'title',
      'DepartmentName': 'enterprise.department',
      'ManagerPersonNumber': 'enterprise.manager.value',
    },
  },

  customApi: {
    id: 'customApi',
    name: 'Custom REST API',
    description: 'Connect to any system that exposes a REST/JSON API with employee data',
    icon: '🔌',
    category: 'Custom',
    authType: 'bearer',     // user picks actual auth type
    configFields: [
      { key: 'baseUrl', label: 'API Base URL', placeholder: 'https://your-api.example.com', required: true },
      { key: 'endpoint', label: 'Endpoint Path', placeholder: '/api/employees', required: true },
      { key: 'method', label: 'HTTP Method', placeholder: 'GET', required: false, default: 'GET' },
      { key: 'authType', label: 'Auth Type', placeholder: 'none | basic | bearer | apikey | oauth2', required: true, default: 'none' },
      { key: 'authValue', label: 'Auth Token / API Key / Username:Password', placeholder: 'Value depends on auth type', required: false, secret: true },
      { key: 'tokenUrl', label: 'OAuth2 Token URL (if applicable)', placeholder: 'https://...', required: false },
      { key: 'clientId', label: 'OAuth2 Client ID (if applicable)', placeholder: '', required: false },
      { key: 'clientSecret', label: 'OAuth2 Client Secret (if applicable)', placeholder: '', required: false, secret: true },
      { key: 'dataPath', label: 'JSON Path to Data Array', placeholder: 'e.g. data, results, items', required: true, default: 'data' },
      { key: 'headers', label: 'Custom Headers (JSON)', placeholder: '{"X-Custom": "value"}', required: false },
    ],
    responseMapping: {
      dataPath: 'data',
      totalPath: null,
      pagingParam: null,
      pageSizeParam: null,
      defaultPageSize: null,
    },
    sampleFieldHints: {},
  },
};

function getConnector(id) {
  return CONNECTORS[id] || null;
}

function listConnectors() {
  return Object.values(CONNECTORS).map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    icon: c.icon,
    category: c.category,
    authType: c.authType,
    configFields: c.configFields,
  }));
}

module.exports = { CONNECTORS, getConnector, listConnectors };
