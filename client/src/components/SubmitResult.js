import React, { useState } from 'react';
import { sendToApi } from '../services/api';

export default function SubmitResult({ mapping, config, customAttributes }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handleSend = async () => {
    if (!config.tenantId || !config.clientId || !config.clientSecret || !config.endpoint) {
      setError('Please complete the connection configuration in Step 1 before sending.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await sendToApi(mapping, config, customAttributes);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const allSuccess = results?.results?.every(r => r.status >= 200 && r.status < 300);

  return (
    <div className="card">
      <h2>Send to Entra ID</h2>
      <p className="subtitle">Submit the SCIM bulk request to the Provisioning API endpoint.</p>

      <div className="alert alert-warning">
        <span>⚠️</span>
        <div>
          <strong>Before sending, ensure:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20, fontSize: 13 }}>
            <li>The provisioning app is configured and started in Entra admin center</li>
            <li>Your app registration has <code>SynchronizationData-User.Upload</code> permission</li>
            <li>You have reviewed the payload preview in the previous step</li>
          </ul>
        </div>
      </div>

      <div className="btn-group" style={{ marginTop: 0 }}>
        <button className="btn btn-success" onClick={handleSend} disabled={loading}>
          {loading ? <><span className="spinner" /> Sending...</> : '🚀 Send to Provisioning API'}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 16 }}>❌ {error}</div>}

      {results && (
        <>
          <div className={`alert ${allSuccess ? 'alert-success' : 'alert-warning'}`} style={{ marginTop: 16 }}>
            {allSuccess ? '✅' : '⚠️'} Sent <strong>{results.totalBatches} batch(es)</strong> with
            <strong> {results.totalOperations} operations</strong>.
          </div>

          {results.results.map((r, i) => (
            <div key={i} className={`result-item ${r.status >= 200 && r.status < 300 ? 'success' : 'error'}`}>
              <span className={`status-badge ${r.status >= 200 && r.status < 300 ? 'success' : 'error'}`}>
                {r.status} {r.statusText || ''}
              </span>
              <span>Batch {r.batch} — {r.operationsCount} operations</span>
              {r.error && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{r.error}</span>}
            </div>
          ))}

          {results.results.some(r => r.response) && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>View API Response Details</summary>
              <pre style={{
                background: 'var(--code-bg)', color: 'var(--code-text)', padding: 16,
                borderRadius: 8, marginTop: 8, fontSize: 12, overflow: 'auto', maxHeight: 400
              }}>
                {JSON.stringify(results.results, null, 2)}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}
