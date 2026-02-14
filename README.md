# Entra ID Provisioning Client

A local-first web application for **API-driven inbound provisioning** to Microsoft Entra ID. Upload CSV files or pull data directly from any HRMS system, map fields to SCIM attributes, preview the payload, and send it to the Entra provisioning API — all from a simple browser-based wizard.

---

## Security

> **Your credentials never leave your machine.**

| Concern | How it's handled |
|---|---|
| Client secrets | Entered in-browser, held in memory only, never written to disk |
| Network exposure | Server binds to `127.0.0.1` — not reachable from other machines |
| Data transmission | Nothing is sent to any cloud service until you explicitly click **Send** in the final step |
| Git safety | `.env`, secrets, and build artifacts are all in `.gitignore` |

---

## Prerequisites

| Requirement | Version |
|---|---|
| **Node.js** | 18 or later ([download](https://nodejs.org)) |
| **npm** | Comes with Node.js |
| **Git** | Any recent version (to clone the repo) |

No other tools, databases, or cloud accounts are needed to run the app locally. Docker is optional.

---

## Quick Start (3 commands)

### Windows

```powershell
git clone https://github.com/<your-org>/entra-provisioning-client.git
cd entra-provisioning-client
setup.bat
```

### macOS / Linux

```bash
git clone https://github.com/<your-org>/entra-provisioning-client.git
cd entra-provisioning-client
chmod +x setup.sh && ./setup.sh
```

### Then start the app

```bash
npm start
```

Open **http://localhost:3001** in your browser.

---

## Manual Setup (step by step)

If you prefer to run each step yourself:

### 1. Clone the repository

```bash
git clone https://github.com/<your-org>/entra-provisioning-client.git
cd entra-provisioning-client
```

### 2. Install server dependencies

```bash
npm install
```

### 3. Install client dependencies

```bash
cd client
npm install
```

### 4. Build the client

```bash
npx react-scripts build
cd ..
```

### 5. Start the app

```bash
npm start
```

You will see:

```
  Entra Provisioning Client running at http://127.0.0.1:3001
  All credentials stay on this machine — nothing leaves until you click Send.
```

Open **http://localhost:3001** in your browser.

---

## How to Use

The wizard guides you through **6 steps**:

### Step 1 — Connect

Enter your Microsoft Entra ID app registration details:

| Field | Where to find it |
|---|---|
| **Tenant ID** | [Entra admin center](https://entra.microsoft.com) → Overview → Tenant ID |
| **Client ID** | App registrations → Your app → Overview → Application (client) ID |
| **Client Secret** | App registrations → Your app → Certificates & secrets → New client secret |
| **API Endpoint** | Enterprise apps → Your provisioning app → Provisioning → Overview → **Provisioning API Endpoint** |

> The API endpoint looks like:  
> `https://graph.microsoft.com/beta/servicePrincipals/{id}/synchronization/jobs/{jobId}/bulkUpload`

### Step 2 — Choose Data Source

Pick one:

- **CSV / File Upload** — Upload a CSV exported from any system of record
- **HRMS / API Integration** — Connect directly to your HR system via API

### Step 3 — Load Data

**CSV path:** Drag and drop your CSV file. The app will parse the headers and show a preview.

**HRMS path:** Select your HRMS connector, enter the API credentials, test the connection, then fetch employee data. Supported connectors:

| System | Auth Type |
|---|---|
| Workday | OAuth2 |
| SAP SuccessFactors | Basic |
| BambooHR | API Key |
| ADP Workforce Now | OAuth2 |
| Oracle HCM Cloud | Basic |
| Custom REST API | Any (none / basic / bearer / API key / OAuth2) |

### Step 4 — Map Attributes

Map your source columns to SCIM attributes. Click **Auto-Map** to auto-detect common field names, or map manually with the dropdowns.

At minimum, you must map **externalId** (a unique worker identifier).

### Step 5 — Preview

Click **Generate Preview** to see the exact SCIM JSON payload that will be sent. You can download it for inspection.

### Step 6 — Send

Click **Send to Entra ID** to post the payload to your provisioning API endpoint. The app authenticates with your credentials, sends the data in batches, and shows per-batch results.

---

## Project Structure

```
entra-provisioning-client/
├── setup.bat / setup.sh        # One-command local setup
├── package.json                # Server dependencies + scripts
├── server/
│   ├── index.js                # Express entry point (binds to 127.0.0.1)
│   ├── connectors/
│   │   └── registry.js         # HRMS connector definitions (extensible)
│   ├── routes/
│   │   ├── upload.js           # CSV upload endpoint
│   │   ├── mapping.js          # SCIM schema + validation
│   │   ├── provisioning.js     # Preview + Send endpoints
│   │   └── connectors.js       # HRMS connector API
│   ├── schemas/
│   │   └── scimSchemas.js      # SCIM attribute definitions
│   └── services/
│       ├── csvParser.js        # CSV parsing
│       ├── scimBuilder.js      # CSV/HRMS → SCIM payload builder
│       ├── entraAuth.js        # OAuth2 + API call to Entra
│       └── hrmsClient.js       # Generic HRMS API client
├── client/
│   ├── package.json            # React dependencies
│   ├── public/index.html
│   └── src/
│       ├── App.js              # 6-step wizard
│       ├── App.css             # Fluent UI-inspired styles
│       ├── services/api.js     # Frontend → Backend API calls
│       └── components/
│           ├── ConnectionConfig.js   # Step 1: Entra credentials
│           ├── DataSourcePicker.js   # Step 2: CSV vs HRMS
│           ├── FileUpload.js         # Step 3a: CSV upload
│           ├── HRMSConnector.js      # Step 3b: HRMS integration
│           ├── AttributeMapping.js   # Step 4: Field mapping
│           ├── PayloadPreview.js     # Step 5: JSON preview
│           └── SubmitResult.js       # Step 6: Send results
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose config
└── .github/workflows/build.yml # CI/CD pipeline
```

---

## Adding a New HRMS Connector

The connector system is fully extensible. To add a new connector:

1. Open `server/connectors/registry.js`
2. Add a new entry to the `CONNECTORS` object:

```javascript
myHrms: {
  id: 'myHrms',
  name: 'My HRMS',
  description: 'Pull employee data from My HRMS',
  icon: '🏢',
  category: 'HCM',
  authType: 'bearer',          // oauth2 | basic | apikey | bearer
  configFields: [
    { key: 'baseUrl', label: 'API Base URL', placeholder: 'https://...', required: true },
    { key: 'authValue', label: 'Bearer Token', placeholder: 'token', required: true, secret: true },
  ],
  responseMapping: {
    dataPath: 'data.employees', // JSON path to the array of records
    pagingParam: 'offset',      // query param for pagination (or null)
    pageSizeParam: 'limit',
    defaultPageSize: 100,
  },
  sampleFieldHints: {           // auto-map hints for common field names
    'employee_id': 'externalId',
    'first_name': 'name.givenName',
  },
},
```

3. Save — the new connector will appear in the UI automatically.

---

## Docker Deployment (optional)

```bash
# Build the image
docker build -t entra-provisioning-client .

# Run (credentials entered in-browser, no .env needed)
docker run -p 3001:3001 entra-provisioning-client
```

Or with Docker Compose:

```bash
docker-compose up --build
```

---

## Configuration Reference

All configuration is entered through the browser UI. No `.env` file is required for basic usage.

If you want to pre-configure the server port:

```bash
# Optional: create a .env file (never committed to Git)
cp .env.example .env
# Edit .env to change PORT (default: 3001)
```

---

## Entra ID App Registration Setup

Before using this tool, you need an app registration in Microsoft Entra ID:

1. Go to [Entra admin center](https://entra.microsoft.com) → **App registrations** → **New registration**
2. Name it (e.g., "Inbound Provisioning Client") and register
3. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions**
4. Add: `SynchronizationData-User.Upload`
5. Click **Grant admin consent**
6. Go to **Certificates & secrets** → **New client secret** → Copy the value
7. Note your **Tenant ID**, **Client ID**, and the **Client Secret**
8. Go to **Enterprise applications** → Your provisioning app → **Provisioning** → **Overview**
9. Copy the **Provisioning API Endpoint** URL

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `npm install` fails | Make sure you have Node.js 18+. Run `node -v` to check. |
| Port 3001 already in use | Set a different port: `PORT=3002 npm start` (or edit `.env`) |
| "Authentication failed" at Send | Verify Tenant ID, Client ID, Client Secret. Ensure `SynchronizationData-User.Upload` permission is granted with admin consent. |
| CSV not parsing correctly | Ensure your file is UTF-8 encoded CSV with a header row. BOM is handled automatically. |
| HRMS connection fails | Check the API URL, credentials, and that your IP is allowlisted by the HRMS vendor. |

---

## License

MIT
