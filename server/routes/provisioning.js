const express = require('express');
const { buildScimBulkPayloads } = require('../services/scimBuilder');
const { getAccessToken, sendBulkUpload } = require('../services/entraAuth');

const router = express.Router();

/**
 * POST /api/provisioning/preview
 * Generate SCIM bulk payload preview without sending.
 * Body: { mapping, customSchemaNamespace?, operationsPerRequest? }
 */
router.post('/preview', (req, res) => {
  try {
    const csvData = req.app.locals.csvData;
    if (!csvData) {
      return res.status(400).json({ error: 'No CSV data uploaded. Please upload a file first.' });
    }

    const { mapping, customSchemaNamespace, operationsPerRequest } = req.body;
    if (!mapping) {
      return res.status(400).json({ error: 'Attribute mapping is required.' });
    }

    const payloads = buildScimBulkPayloads(
      csvData.rows,
      mapping,
      customSchemaNamespace || null,
      operationsPerRequest || 50
    );

    res.json({
      totalPayloads: payloads.length,
      totalOperations: csvData.rows.length,
      payloads,
    });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: `Failed to generate payload: ${err.message}` });
  }
});

/**
 * POST /api/provisioning/send
 * Generate and send SCIM bulk payload to the Provisioning API.
 * Body: { mapping, config: { tenantId, clientId, clientSecret, endpoint }, customSchemaNamespace?, operationsPerRequest? }
 */
router.post('/send', async (req, res) => {
  try {
    const csvData = req.app.locals.csvData;
    if (!csvData) {
      return res.status(400).json({ error: 'No CSV data uploaded. Please upload a file first.' });
    }

    const { mapping, config, customSchemaNamespace, operationsPerRequest } = req.body;
    if (!mapping) {
      return res.status(400).json({ error: 'Attribute mapping is required.' });
    }
    if (!config || !config.tenantId || !config.clientId || !config.clientSecret || !config.endpoint) {
      return res.status(400).json({ error: 'Connection configuration is incomplete. Provide tenantId, clientId, clientSecret, and endpoint.' });
    }

    // Build payloads
    const payloads = buildScimBulkPayloads(
      csvData.rows,
      mapping,
      customSchemaNamespace || null,
      operationsPerRequest || 50
    );

    // Get access token
    let accessToken;
    try {
      accessToken = await getAccessToken(config.tenantId, config.clientId, config.clientSecret);
    } catch (authErr) {
      return res.status(401).json({
        error: `Authentication failed: ${authErr.message}`,
        details: 'Verify your Tenant ID, Client ID, and Client Secret. Ensure the app registration has the SynchronizationData-User.Upload permission.',
      });
    }

    // Send each payload batch
    const results = [];
    for (let i = 0; i < payloads.length; i++) {
      try {
        const result = await sendBulkUpload(config.endpoint, accessToken, payloads[i]);
        results.push({
          batch: i + 1,
          operationsCount: payloads[i].Operations.length,
          status: result.status,
          statusText: result.statusText,
          response: result.body,
        });
      } catch (sendErr) {
        results.push({
          batch: i + 1,
          operationsCount: payloads[i].Operations.length,
          status: 'error',
          error: sendErr.message,
        });
      }
    }

    res.json({
      totalBatches: payloads.length,
      totalOperations: csvData.rows.length,
      results,
    });
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ error: `Failed to send: ${err.message}` });
  }
});

module.exports = router;
