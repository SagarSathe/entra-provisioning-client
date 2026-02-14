const API_BASE = process.env.REACT_APP_API_URL || '';

export async function uploadCsv(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
  return res.json();
}

export async function getScimSchema() {
  const res = await fetch(`${API_BASE}/api/mapping/schema`);
  return res.json();
}

export async function validateMapping(mapping) {
  const res = await fetch(`${API_BASE}/api/mapping/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapping }),
  });
  return res.json();
}

export async function previewPayload(mapping, customSchemaNamespace) {
  const res = await fetch(`${API_BASE}/api/provisioning/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapping, customSchemaNamespace }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Preview failed');
  return res.json();
}

export async function sendToApi(mapping, config, customSchemaNamespace) {
  const res = await fetch(`${API_BASE}/api/provisioning/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapping, config, customSchemaNamespace }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Send failed');
  }
  return res.json();
}

// ---- HRMS Connector APIs ----

export async function getConnectors() {
  const res = await fetch(`${API_BASE}/api/connectors`);
  if (!res.ok) throw new Error('Failed to load connectors');
  return res.json();
}

export async function getConnectorDetails(connectorId) {
  const res = await fetch(`${API_BASE}/api/connectors/${connectorId}`);
  if (!res.ok) throw new Error('Connector not found');
  return res.json();
}

export async function testHRMSConnection(connectorId, config) {
  const res = await fetch(`${API_BASE}/api/connectors/${connectorId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || err.error || 'Connection test failed');
  }
  return res.json();
}

export async function fetchHRMSData(connectorId, config) {
  const res = await fetch(`${API_BASE}/api/connectors/${connectorId}/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch HRMS data');
  }
  return res.json();
}
