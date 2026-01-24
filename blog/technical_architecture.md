# Technical Architecture

## Dataverse Integration Pipeline

The bot system integrates with Microsoft Power Platform to stream harvest telemetry into Dataverse.

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐     ┌───────────┐
│  Minecraft Bot  │────▶│  Power Automate  │────▶│  Dataverse  │────▶│  Reports  │
│  (Node.js)      │     │  (HTTP Trigger)  │     │  (Table)    │     │           │
└─────────────────┘     └──────────────────┘     └─────────────┘     └───────────┘
        │
        │ POST every 10 harvests
        ▼
   JSON payload
```

### Schema

Each harvest event posts the following structure:

```json
{
  "resourceName": "Wheat",
  "logicalName": "wheat",
  "quantity": 10,
  "ID": 1847293847
}
```

| Field | Type | Description |
|-------|------|-------------|
| `resourceName` | string | Capitalized crop name (Wheat, Potatoes, Beets) |
| `logicalName` | string | Lowercase identifier for programmatic use |
| `quantity` | integer | Number of crops harvested in this batch |
| `ID` | integer | Random unique identifier per event |

### Components

#### 1. Bot Server (`remote_control_bot.js`)

Configuration loaded from environment:

```javascript
dataverse: {
  webhookUrl: process.env.DATAVERSE_WEBHOOK_URL || '',
  enabled: process.env.DATAVERSE_ENABLED !== 'false'
}
```

The `buildJobOptions()` function injects the webhook URL into all job configurations when enabled.

#### 2. Shared Utility (`jobs/utils.js`)

```javascript
async function postToDataverse(webhookUrl, payload) {
  if (!webhookUrl) return
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  console.log('[dataverse] POST', response.status)
}
```

#### 3. Farmer Jobs

Each specialized farmer (`farmer-wheat.js`, `farmer-potatoes.js`, `farmer-beets.js`) calls `postToDataverse()` from the `notifyHarvest()` function every 10 harvests.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATAVERSE_WEBHOOK_URL` | Yes | - | Power Automate HTTP trigger URL |
| `DATAVERSE_ENABLED` | No | `true` | Set to `false` to disable |

### Power Automate Flow

The receiving flow should:
1. Use an HTTP trigger with "When a HTTP request is received"
2. Parse the JSON body using the schema above
3. Create a new row in Dataverse with the parsed fields

### Batching Strategy

- Harvests are batched in groups of 10 to reduce API calls
- Each POST represents 10 individual block harvests
- The `quantity` field always equals the batch size (10)
