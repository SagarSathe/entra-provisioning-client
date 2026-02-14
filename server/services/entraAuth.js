const { ClientSecretCredential } = require('@azure/identity');

/**
 * Acquire a bearer token for the Entra ID Provisioning API.
 * Uses client credentials flow (OAuth2).
 */
async function getAccessToken(tenantId, clientId, clientSecret) {
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
  return tokenResponse.token;
}

/**
 * Send a SCIM bulk request payload to the Provisioning API endpoint.
 * @param {string} endpoint - The bulkUpload API endpoint URL
 * @param {string} accessToken - Bearer token
 * @param {Object} payload - SCIM BulkRequest payload
 * @returns {Object} { status, statusText, body }
 */
async function sendBulkUpload(endpoint, accessToken, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/scim+json',
    },
    body: JSON.stringify(payload),
  });

  let body;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  return {
    status: response.status,
    statusText: response.statusText,
    body,
  };
}

module.exports = { getAccessToken, sendBulkUpload };
