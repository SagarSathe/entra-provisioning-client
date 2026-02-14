import React, { useState } from 'react';

export default function ConnectionConfig({ config, setConfig }) {
  const [showSecret, setShowSecret] = useState(false);

  const update = (field, value) => {
    setConfig({ ...config, [field]: value });
  };

  return (
    <div className="card">
      <h2>Connection Configuration</h2>
      <p className="subtitle">Enter your Entra ID app registration details and the provisioning API endpoint.</p>

      <div className="alert alert-success" style={{ marginBottom: 12 }}>
        <span>🔒</span>
        <div>
          <strong>Your credentials are safe.</strong> This app runs entirely on your local machine.
          Secrets are never stored on disk or sent anywhere except directly to Microsoft Entra ID when you click Send.
        </div>
      </div>

      <div className="alert alert-info">
        <span>ℹ️</span>
        <div>
          <strong>Where to find these values:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20, fontSize: 13 }}>
            <li><strong>Tenant ID</strong> — Entra admin center → Overview → Tenant ID</li>
            <li><strong>Client ID & Secret</strong> — App registrations → Your app → Overview / Certificates & secrets</li>
            <li><strong>API Endpoint</strong> — Enterprise apps → Your provisioning app → Provisioning → Overview → Provisioning API Endpoint</li>
          </ul>
        </div>
      </div>

      <div className="form-group">
        <label>Tenant ID</label>
        <div className="hint">Your Microsoft Entra ID (Azure AD) tenant identifier</div>
        <input
          type="text"
          placeholder="e.g. 00000000-0000-0000-0000-000000000000"
          value={config.tenantId || ''}
          onChange={e => update('tenantId', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Client ID (Application ID)</label>
        <div className="hint">The application (client) ID of your app registration</div>
        <input
          type="text"
          placeholder="e.g. 00000000-0000-0000-0000-000000000000"
          value={config.clientId || ''}
          onChange={e => update('clientId', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Client Secret</label>
        <div className="hint">A client secret from your app registration</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type={showSecret ? 'text' : 'password'}
            placeholder="Enter client secret"
            value={config.clientSecret || ''}
            onChange={e => update('clientSecret', e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowSecret(!showSecret)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {showSecret ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Provisioning API Endpoint</label>
        <div className="hint">The bulkUpload API endpoint URL from your provisioning app</div>
        <input
          type="url"
          placeholder="https://graph.microsoft.com/beta/servicePrincipals/{id}/synchronization/jobs/{jobId}/bulkUpload"
          value={config.endpoint || ''}
          onChange={e => update('endpoint', e.target.value)}
        />
      </div>
    </div>
  );
}
