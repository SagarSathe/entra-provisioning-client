import React, { useEffect, useState } from 'react';
import { getScimSchema, validateMapping } from '../services/api';

export default function AttributeMapping({ csvHeaders, mapping, setMapping, customAttributes, setCustomAttributes }) {
  const [schema, setSchema] = useState(null);
  const [validation, setValidation] = useState(null);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrType, setNewAttrType] = useState('string');

  useEffect(() => {
    getScimSchema().then(setSchema).catch(console.error);
  }, []);

  const updateMapping = (scimPath, csvColumn) => {
    const newMapping = { ...mapping, [scimPath]: csvColumn };
    if (!csvColumn) delete newMapping[scimPath];
    setMapping(newMapping);
  };

  const handleValidate = async () => {
    const result = await validateMapping(mapping);
    setValidation(result);
  };

  // --- Custom Attribute Helpers ---
  const toggleCustomAttrs = () => {
    setCustomAttributes({ ...customAttributes, enabled: !customAttributes.enabled });
  };

  const updateNamespace = (ns) => {
    setCustomAttributes({ ...customAttributes, namespace: ns });
  };

  const addCustomAttribute = () => {
    const trimmed = newAttrName.trim();
    if (!trimmed) return;
    // Prevent duplicates
    if (customAttributes.attributes.some(a => a.name === trimmed)) return;
    setCustomAttributes({
      ...customAttributes,
      attributes: [...customAttributes.attributes, { name: trimmed, type: newAttrType, description: '' }],
    });
    setNewAttrName('');
    setNewAttrType('string');
  };

  const removeCustomAttribute = (name) => {
    setCustomAttributes({
      ...customAttributes,
      attributes: customAttributes.attributes.filter(a => a.name !== name),
    });
    // Also remove the mapping for this custom attribute
    const scimPath = `custom.${name}`;
    if (mapping[scimPath]) {
      const newMapping = { ...mapping };
      delete newMapping[scimPath];
      setMapping(newMapping);
    }
  };

  const autoMap = () => {
    if (!schema) return;
    const newMapping = { ...mapping };
    const lowerHeaders = csvHeaders.map(h => h.toLowerCase());

    // Auto-map common patterns
    const autoMappings = [
      ['externalId', ['workerid', 'employeeid', 'externalid', 'id', 'worker_id', 'employee_id']],
      ['userName', ['userid', 'username', 'user_name', 'login', 'email']],
      ['name.givenName', ['firstname', 'first_name', 'givenname', 'given_name', 'fname']],
      ['name.familyName', ['lastname', 'last_name', 'familyname', 'family_name', 'lname', 'surname']],
      ['name.middleName', ['middlename', 'middle_name']],
      ['displayName', ['fullname', 'full_name', 'displayname', 'display_name', 'name', 'preferredname']],
      ['title', ['jobtitle', 'job_title', 'title', 'position']],
      ['userType', ['workertype', 'worker_type', 'usertype', 'employeetype', 'employee_type']],
      ['active', ['workerstatus', 'worker_status', 'active', 'status', 'isactive']],
      ['enterprise.department', ['department', 'dept']],
      ['enterprise.division', ['division', 'div']],
      ['enterprise.costCenter', ['costcenter', 'cost_center']],
      ['enterprise.organization', ['company', 'organization', 'org']],
      ['enterprise.employeeNumber', ['workerid', 'employeenumber', 'employee_number', 'empno']],
      ['enterprise.manager.value', ['managerid', 'manager_id', 'manager', 'supervisorid']],
      ['addresses.0.streetAddress', ['streetaddress', 'street_address', 'address', 'street']],
      ['addresses.0.locality', ['city', 'locality']],
      ['addresses.0.region', ['state', 'region', 'province']],
      ['addresses.0.postalCode', ['postalcode', 'postal_code', 'zipcode', 'zip_code', 'zip']],
      ['addresses.0.country', ['country', 'countrycode', 'country_code', 'twolettercountrycode']],
      ['phoneNumbers.0.value', ['officephone', 'office_phone', 'phone', 'telephone', 'workphone']],
      ['emails.0.value', ['email', 'emailaddress', 'email_address', 'workemail']],
      ['preferredLanguage', ['preferredlanguage', 'preferred_language', 'language']],
      ['timezone', ['timezone', 'time_zone']],
    ];

    for (const [scimPath, patterns] of autoMappings) {
      if (newMapping[scimPath]) continue; // Don't override existing
      for (const pattern of patterns) {
        const idx = lowerHeaders.indexOf(pattern);
        if (idx >= 0) {
          newMapping[scimPath] = csvHeaders[idx];
          break;
        }
      }
    }

    // Auto-map custom attributes by name match
    if (customAttributes.enabled) {
      for (const attr of customAttributes.attributes) {
        const scimPath = `custom.${attr.name}`;
        if (newMapping[scimPath]) continue;
        const idx = lowerHeaders.indexOf(attr.name.toLowerCase());
        if (idx >= 0) {
          newMapping[scimPath] = csvHeaders[idx];
        }
      }
    }

    setMapping(newMapping);
  };

  if (!schema) return <div className="card"><span className="spinner" /> Loading schema...</div>;

  const coreSchema = schema['urn:ietf:params:scim:schemas:core:2.0:User'];
  const enterpriseSchema = schema['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'];

  return (
    <div className="card">
      <h2>Attribute Mapping</h2>
      <p className="subtitle">Map your CSV columns to SCIM user attributes. Required fields are marked.</p>

      <div className="btn-group" style={{ marginTop: 0, marginBottom: 20 }}>
        <button className="btn btn-secondary" onClick={autoMap}>
          ⚡ Auto-Map
        </button>
        <button className="btn btn-secondary" onClick={handleValidate}>
          ✓ Validate
        </button>
        <button className="btn btn-secondary" onClick={() => setMapping({})}>
          ↺ Clear All
        </button>
      </div>

      {validation && (
        <>
          {validation.errors.map((e, i) => (
            <div key={i} className="alert alert-error">❌ {e}</div>
          ))}
          {validation.warnings.map((w, i) => (
            <div key={i} className="alert alert-warning">⚠️ {w}</div>
          ))}
          {validation.valid && <div className="alert alert-success">✅ Mapping is valid!</div>}
        </>
      )}

      {/* Core User - Simple Attributes */}
      <div className="mapping-section">
        <h3>Core User Attributes</h3>
        {coreSchema.simple.map(attr => (
          <MappingRow
            key={attr.name}
            scimPath={attr.name}
            attr={attr}
            csvHeaders={csvHeaders}
            value={mapping[attr.name] || ''}
            onChange={val => updateMapping(attr.name, val)}
          />
        ))}
      </div>

      {/* Core User - Name */}
      <div className="mapping-section">
        <h3>Name</h3>
        {coreSchema.complex.find(c => c.name === 'name')?.subAttributes.map(attr => (
          <MappingRow
            key={`name.${attr.name}`}
            scimPath={`name.${attr.name}`}
            attr={attr}
            csvHeaders={csvHeaders}
            value={mapping[`name.${attr.name}`] || ''}
            onChange={val => updateMapping(`name.${attr.name}`, val)}
          />
        ))}
      </div>

      {/* Core User - Emails */}
      <div className="mapping-section">
        <h3>Email (Primary)</h3>
        {coreSchema.complex.find(c => c.name === 'emails')?.subAttributes
          .filter(a => a.name !== 'primary')
          .map(attr => (
            <MappingRow
              key={`emails.0.${attr.name}`}
              scimPath={`emails.0.${attr.name}`}
              attr={attr}
              csvHeaders={csvHeaders}
              value={mapping[`emails.0.${attr.name}`] || ''}
              onChange={val => updateMapping(`emails.0.${attr.name}`, val)}
            />
          ))}
      </div>

      {/* Core User - Phone Numbers */}
      <div className="mapping-section">
        <h3>Phone Numbers (Primary)</h3>
        {coreSchema.complex.find(c => c.name === 'phoneNumbers')?.subAttributes
          .filter(a => a.name !== 'primary')
          .map(attr => (
            <MappingRow
              key={`phoneNumbers.0.${attr.name}`}
              scimPath={`phoneNumbers.0.${attr.name}`}
              attr={attr}
              csvHeaders={csvHeaders}
              value={mapping[`phoneNumbers.0.${attr.name}`] || ''}
              onChange={val => updateMapping(`phoneNumbers.0.${attr.name}`, val)}
            />
          ))}
      </div>

      {/* Core User - Addresses */}
      <div className="mapping-section">
        <h3>Address (Primary)</h3>
        {coreSchema.complex.find(c => c.name === 'addresses')?.subAttributes
          .filter(a => a.name !== 'formatted')
          .map(attr => (
            <MappingRow
              key={`addresses.0.${attr.name}`}
              scimPath={`addresses.0.${attr.name}`}
              attr={attr}
              csvHeaders={csvHeaders}
              value={mapping[`addresses.0.${attr.name}`] || ''}
              onChange={val => updateMapping(`addresses.0.${attr.name}`, val)}
            />
          ))}
      </div>

      {/* Enterprise User */}
      <div className="mapping-section">
        <h3>Enterprise User Attributes</h3>
        {enterpriseSchema.simple.map(attr => (
          <MappingRow
            key={`enterprise.${attr.name}`}
            scimPath={`enterprise.${attr.name}`}
            attr={attr}
            csvHeaders={csvHeaders}
            value={mapping[`enterprise.${attr.name}`] || ''}
            onChange={val => updateMapping(`enterprise.${attr.name}`, val)}
          />
        ))}
      </div>

      {/* Enterprise User - Manager */}
      <div className="mapping-section">
        <h3>Manager</h3>
        {enterpriseSchema.complex.find(c => c.name === 'manager')?.subAttributes.map(attr => (
          <MappingRow
            key={`enterprise.manager.${attr.name}`}
            scimPath={`enterprise.manager.${attr.name}`}
            attr={attr}
            csvHeaders={csvHeaders}
            value={mapping[`enterprise.manager.${attr.name}`] || ''}
            onChange={val => updateMapping(`enterprise.manager.${attr.name}`, val)}
          />
        ))}
      </div>

      {/* Custom SCIM Schema Extension */}
      <div className="mapping-section custom-attrs-section">
        <h3>
          <label className="custom-attrs-toggle">
            <input
              type="radio"
              name="customAttrsEnabled"
              checked={customAttributes.enabled}
              onClick={toggleCustomAttrs}
              readOnly
            />
            Custom SCIM Schema Extension
          </label>
        </h3>

        {customAttributes.enabled && (
          <div className="custom-attrs-config">
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              <span>ℹ️</span>
              <div>
                <strong>Custom attributes</strong> let you send HR fields (e.g. HireDate, JobCode) that aren't part of the standard SCIM schema.
                These must also be registered in your Entra provisioning app's schema.{' '}
                <a href="https://learn.microsoft.com/en-us/entra/identity/app-provisioning/inbound-provisioning-api-custom-attributes"
                   target="_blank" rel="noopener noreferrer">Learn more</a>
              </div>
            </div>

            <div className="form-group">
              <label>Schema Namespace URI</label>
              <div className="hint">
                The SCIM schema extension namespace (e.g. urn:ietf:params:scim:schemas:extension:contoso:1.0:User)
              </div>
              <input
                type="text"
                placeholder="urn:ietf:params:scim:schemas:extension:contoso:1.0:User"
                value={customAttributes.namespace}
                onChange={e => updateNamespace(e.target.value)}
              />
            </div>

            {/* Add new attribute form */}
            <div className="custom-attr-add-row">
              <input
                type="text"
                placeholder="Attribute name (e.g. HireDate)"
                value={newAttrName}
                onChange={e => setNewAttrName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomAttribute(); }}
                className="custom-attr-name-input"
              />
              <select
                value={newAttrType}
                onChange={e => setNewAttrType(e.target.value)}
                className="custom-attr-type-select"
              >
                <option value="string">String</option>
                <option value="dateTime">DateTime</option>
                <option value="integer">Integer</option>
                <option value="boolean">Boolean</option>
              </select>
              <button className="btn btn-primary" onClick={addCustomAttribute} disabled={!newAttrName.trim()}>
                + Add
              </button>
            </div>

            {/* List of custom attributes with mapping */}
            {customAttributes.attributes.length > 0 && (
              <div className="custom-attrs-list">
                {customAttributes.attributes.map(attr => (
                  <div key={attr.name} className="mapping-row custom-attr-row">
                    <div className="mapping-label">
                      <span className="attr-name">{attr.name}</span>
                      <span className="custom-attr-type-badge">{attr.type}</span>
                      <div className="attr-desc">{customAttributes.namespace}:{attr.name}</div>
                    </div>
                    <div className="arrow">→</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        value={mapping[`custom.${attr.name}`] || ''}
                        onChange={e => updateMapping(`custom.${attr.name}`, e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">— Not mapped —</option>
                        {csvHeaders.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <button
                        className="btn btn-danger"
                        onClick={() => removeCustomAttribute(attr.name)}
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        title="Remove attribute"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {customAttributes.attributes.length === 0 && (
              <div className="custom-attrs-empty">
                No custom attributes added yet. Use the form above to add attributes like HireDate, JobCode, etc.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MappingRow({ scimPath, attr, csvHeaders, value, onChange }) {
  return (
    <div className="mapping-row">
      <div className="mapping-label">
        <span className="attr-name">{attr.name}</span>
        {attr.required && <span className="required-badge">Required</span>}
        <div className="attr-desc">{attr.description}</div>
      </div>
      <div className="arrow">→</div>
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— Not mapped —</option>
        {csvHeaders.map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
    </div>
  );
}
