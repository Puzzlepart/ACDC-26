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

---

## Infrastructure & Network Configuration

### Azure VM Setup

The Minecraft bot server runs on an Ubuntu VM in Azure with the following network configuration:

#### Network Security Group (NSG) Rules

| Priority | Name | Port | Protocol | Purpose |
|----------|------|------|----------|---------|
| 300 | SSH | 22 | TCP | Remote administration |
| 310 | minecraft | 25560-25599 | Any | Minecraft server connections |
| 320 | bot-remote-control-ui | 4000 | Any | Bot control web interface |
| 330 | bot-remote-control-viewer | 3000 | Any | Prismarine 3D viewer (direct access) |
| 340 | nginx_80_to_443 | 80 | Any | HTTP (Let's Encrypt ACME challenge) |
| 350 | https | 443 | Any | HTTPS (proxied viewer at cam.craycon.no) |

**Note:** Port 80 is required for Let's Encrypt/Certbot ACME challenge validation. Port 443 serves the proxied HTTPS viewer.

### Reverse Proxy Configuration

The Prismarine viewer (port 3000) is proxied through nginx to `cam.craycon.no` with SSL.

**Nginx config:** `/etc/nginx/sites-available/cam.craycon.no`

```nginx
server {
    listen 80;
    server_name cam.craycon.no;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Long-lived WebSocket connections
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

**SSL Setup:**

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain and configure SSL certificate
sudo certbot --nginx -d cam.craycon.no
```

Certbot automatically:
- Obtains SSL certificate from Let's Encrypt
- Updates nginx config to redirect HTTP → HTTPS
- Sets up auto-renewal via systemd timer

### DNS Configuration

Cloudflare DNS (DNS-only, no proxy):

```
cam.craycon.no → A record → 135.225.56.193 (DNS only)
```

**Why DNS-only?** Direct connection to VM allows WebSocket traffic for the 3D viewer without Cloudflare proxy limitations.
