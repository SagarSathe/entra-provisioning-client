/**
 * Update the provisioning job's attribute schema via Microsoft Graph API.
 * This automatically adds custom SCIM extension attributes to the provisioning
 * job schema so users don't need to manually configure them in the Entra portal.
 */

/**
 * Parse servicePrincipalId and jobId from the bulkUpload endpoint URL.
 * Expected format: https://graph.microsoft.com/beta/servicePrincipals/{spId}/synchronization/jobs/{jobId}/bulkUpload
 */
function parseEndpointIds(endpoint) {
  const match = endpoint.match(
    /servicePrincipals\/([^/]+)\/synchronization\/jobs\/([^/]+)/i
  );
  if (!match) {
    throw new Error(
      'Could not parse servicePrincipalId and jobId from endpoint URL. ' +
      'Expected format: .../servicePrincipals/{id}/synchronization/jobs/{jobId}/bulkUpload'
    );
  }
  return { servicePrincipalId: match[1], jobId: match[2] };
}

/**
 * Fetch the current synchronization job schema from Graph API.
 */
async function getJobSchema(accessToken, servicePrincipalId, jobId) {
  const url = `https://graph.microsoft.com/beta/servicePrincipals/${encodeURIComponent(servicePrincipalId)}/synchronization/jobs/${encodeURIComponent(jobId)}/schema`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch job schema (${response.status}): ${body}`);
  }

  return response.json();
}

/**
 * Update the synchronization job schema via Graph API.
 */
async function updateJobSchema(accessToken, servicePrincipalId, jobId, schema) {
  const url = `https://graph.microsoft.com/beta/servicePrincipals/${encodeURIComponent(servicePrincipalId)}/synchronization/jobs/${encodeURIComponent(jobId)}/schema`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(schema),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to update job schema (${response.status}): ${body}`);
  }

  // 204 No Content on success
  return { status: response.status, statusText: response.statusText };
}

/**
 * Map our UI attribute types to Graph synchronization schema types.
 */
function mapAttributeType(uiType) {
  switch (uiType) {
    case 'boolean': return 'Boolean';
    case 'integer': return 'Integer';
    case 'dateTime': return 'DateTime';
    case 'string':
    default: return 'String';
  }
}

/**
 * Ensure custom attributes exist in the provisioning job schema.
 * Reads the current schema, adds missing custom attributes to the
 * API source directory, and PUTs the updated schema back.
 *
 * @param {string} accessToken - Bearer token with Synchronization.ReadWrite.All
 * @param {string} endpoint - The bulkUpload endpoint URL
 * @param {Object} customAttributes - { namespace, attributes: [{ name, type }] }
 * @returns {Object} { updated: boolean, attributesAdded: string[], message: string }
 */
async function ensureCustomSchemaAttributes(accessToken, endpoint, customAttributes) {
  if (!customAttributes?.namespace || !customAttributes?.attributes?.length) {
    return { updated: false, attributesAdded: [], message: 'No custom attributes to add.' };
  }

  const { servicePrincipalId, jobId } = parseEndpointIds(endpoint);

  // Fetch current schema
  const schema = await getJobSchema(accessToken, servicePrincipalId, jobId);

  // Find the API-sourced directory (the source where inbound SCIM data arrives).
  // This is typically named with a pattern like "API" or the custom schema namespace.
  // We look for a directory that has objects with the custom namespace in its name,
  // or we find the first non-Azure-AD directory.
  let sourceDir = schema.directories?.find(d =>
    d.name && d.name !== 'Azure Active Directory' && d.name !== 'Microsoft Entra ID'
  );

  if (!sourceDir) {
    throw new Error(
      'Could not find the API source directory in the job schema. ' +
      'Ensure the provisioning job is properly configured with an API-driven inbound source.'
    );
  }

  // Find the User object in the source directory
  let userObject = sourceDir.objects?.find(o =>
    o.name === 'User' || o.name === 'user'
  );

  if (!userObject) {
    throw new Error(
      `Could not find "User" object in source directory "${sourceDir.name}". ` +
      'Ensure the provisioning job has a User object in its schema.'
    );
  }

  // Check which custom attributes already exist
  const existingAttrNames = new Set(
    (userObject.attributes || []).map(a => a.name)
  );

  const attributesAdded = [];
  const namespace = customAttributes.namespace;

  for (const attr of customAttributes.attributes) {
    // The attribute name in the schema uses the full SCIM path format:
    // "urn:ietf:params:scim:schemas:extension:custom:1.0:User:AttributeName"
    const fullAttrName = `${namespace}:${attr.name}`;

    if (!existingAttrNames.has(fullAttrName)) {
      userObject.attributes.push({
        name: fullAttrName,
        type: mapAttributeType(attr.type),
        mutability: 'ReadWrite',
        flowNullValues: false,
        required: false,
        caseExact: false,
        referencedObjects: [],
        metadata: [],
      });
      attributesAdded.push(fullAttrName);
    }
  }

  if (attributesAdded.length === 0) {
    return {
      updated: false,
      attributesAdded: [],
      mappingsAdded: [],
      message: 'All custom attributes already exist in the provisioning job schema.',
    };
  }

  // Step 2: Add attribute mappings to the synchronization rules.
  // This maps source custom attributes to target Entra ID attributes
  // so users don't need to manually configure mappings in the portal.
  const mappingsAdded = [];

  const syncRule = schema.synchronizationRules?.[0];
  if (syncRule) {
    // Find the User-to-User object mapping
    const userMapping = syncRule.objectMappings?.find(m =>
      m.sourceObjectName === 'User' && m.targetObjectName === 'User'
    );

    if (userMapping) {
      const existingTargets = new Set(
        (userMapping.attributeMappings || []).map(m => m.targetAttributeName)
      );

      for (const attr of customAttributes.attributes) {
        const targetAttr = attr.targetAttribute;
        if (!targetAttr) continue; // No target specified, skip mapping

        // Don't add duplicate mappings
        const fullSourceName = `${namespace}:${attr.name}`;
        if (existingTargets.has(targetAttr)) {
          // Check if the existing mapping already uses this source
          const existingMapping = userMapping.attributeMappings.find(
            m => m.targetAttributeName === targetAttr
          );
          if (existingMapping) {
            // Update source to point to our custom attribute
            existingMapping.source = {
              name: fullSourceName,
              type: 'Attribute',
              parameters: [],
            };
            existingMapping.mappingType = 'Direct';
            existingMapping.expression = '';
            mappingsAdded.push(`${fullSourceName} → ${targetAttr} (updated)`);
          }
        } else {
          // Add new attribute mapping
          userMapping.attributeMappings.push({
            source: {
              name: fullSourceName,
              type: 'Attribute',
              parameters: [],
            },
            targetAttributeName: targetAttr,
            defaultValue: null,
            exportMissingReferences: false,
            flowBehavior: 'FlowWhenChanged',
            flowType: 'Add',
            matchingPriority: 0,
            mappingType: 'Direct',
            expression: '',
          });
          mappingsAdded.push(`${fullSourceName} → ${targetAttr}`);
        }
      }
    }
  }

  // PUT the updated schema back
  await updateJobSchema(accessToken, servicePrincipalId, jobId, schema);

  const parts = [];
  if (attributesAdded.length > 0) parts.push(`Added ${attributesAdded.length} custom attribute(s) to source schema.`);
  if (mappingsAdded.length > 0) parts.push(`Configured ${mappingsAdded.length} attribute mapping(s).`);

  return {
    updated: true,
    attributesAdded,
    mappingsAdded,
    message: parts.join(' '),
  };
}

module.exports = {
  parseEndpointIds,
  ensureCustomSchemaAttributes,
};
