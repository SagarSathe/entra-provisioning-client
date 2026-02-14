import React, { useEffect, useState } from 'react';
import { getScimSchema, validateMapping } from '../services/api';

export default function AttributeMapping({ csvHeaders, mapping, setMapping }) {
  const [schema, setSchema] = useState(null);
  const [validation, setValidation] = useState(null);

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
