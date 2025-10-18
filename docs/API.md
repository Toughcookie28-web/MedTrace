# MedTrace Backend API Reference

Complete API documentation for the MedTrace backend server.

---

## 🌐 Base URL

- **Local Development:** `http://localhost:3001`
- **Testnet:** `https://your-backend.com` (after deployment)

---

## 📋 API Endpoints

### **1. Health Check**

**GET** `/api/health`

Check if the backend server is running and connected to blockchain.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "network": {
    "name": "localhost",
    "chainId": 31337,
    "connected": true
  },
  "contracts": {
    "stakeholderRegistry": {
      "address": "0x5FbDB...",
      "deployed": true
    },
    "digitalBatch": {
      "address": "0xe7f17...",
      "deployed": true
    },
    "trackAndTrace": {
      "address": "0xCf7Ed...",
      "deployed": true
    }
  },
  "timestamp": 1234567890
}
```

---

### **2. List All Batches**

**GET** `/api/batches`

Get a list of all minted batches with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Example:**
```
GET /api/batches?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batches": [
      {
        "tokenId": 1,
        "tokenURI": "Aspirin 100mg|LOT-2025-001|Token #1",
        "manufacturer": "0x7099...",
        "currentOwner": "0x15d3...",
        "mintedAt": 1234567890
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  },
  "timestamp": 1234567890
}
```

---

### **3. Get Batch Details**

**GET** `/api/batches/:tokenId`

Get complete details for a specific batch by Token ID.

**Parameters:**
- `tokenId` (required): The NFT token ID

**Example:**
```
GET /api/batches/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenId": 1,
    "tokenURI": "Aspirin 100mg|LOT-2025-001|Token #1",
    "manufacturer": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "currentOwner": "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "mintedAt": 1234567890
  },
  "timestamp": 1234567890
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Batch not found",
  "timestamp": 1234567890
}
```

---

### **4. Get Batch Events**

**GET** `/api/batches/:tokenId/events`

Get all supply chain events (IoT logs) for a specific batch.

**Parameters:**
- `tokenId` (required): The NFT token ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example:**
```
GET /api/batches/1/events?page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "eventId": 1,
        "tokenId": 1,
        "logger": "0x7099...",
        "eventData": "{\"type\":\"iot_sensor_reading\",\"sensorData\":{\"temperature\":\"5°C\",\"location\":\"Warehouse A\"}}",
        "signature": "0xabc123...",
        "timestamp": 1234567890
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 3
    }
  },
  "timestamp": 1234567890
}
```

---

### **5. Get Custody History**

**GET** `/api/batches/:tokenId/custody`

Get complete custody transfer history for a batch.

**Parameters:**
- `tokenId` (required): The NFT token ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example:**
```
GET /api/batches/1/custody
```

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "from": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "to": "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        "timestamp": 1234567890,
        "acknowledged": true
      },
      {
        "from": "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        "to": "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
        "timestamp": 1234567900,
        "acknowledged": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2
    }
  },
  "timestamp": 1234567890
}
```

---

### **6. Get Stakeholder Role**

**GET** `/api/stakeholders/:address/role`

Get the role information for a specific stakeholder address.

**Parameters:**
- `address` (required): Ethereum address

**Example:**
```
GET /api/stakeholders/0x70997970C51812dc3A010C7d01b50e0d17dc79C8/role
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "role": 1,
    "roleName": "Manufacturer"
  },
  "timestamp": 1234567890
}
```

**Role Mapping:**
- `0` = None
- `1` = Manufacturer
- `2` = Distributor
- `3` = Pharmacist

---

### **7. Get Batches by Owner**

**GET** `/api/stakeholders/:address/batches`

Get all batches currently owned by a specific address.

**Parameters:**
- `address` (required): Ethereum address

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example:**
```
GET /api/stakeholders/0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65/batches
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batches": [
      {
        "tokenId": 1,
        "tokenURI": "Aspirin 100mg|LOT-2025-001|Token #1",
        "manufacturer": "0x7099...",
        "currentOwner": "0x15d3...",
        "mintedAt": 1234567890
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1
    }
  },
  "timestamp": 1234567890
}
```

---

### **8. Get Batches Manufactured by Address**

**GET** `/api/manufactured/:address`

Get all batches originally manufactured by a specific address.

**Parameters:**
- `address` (required): Manufacturer's Ethereum address

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example:**
```
GET /api/manufactured/0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batches": [
      {
        "tokenId": 1,
        "tokenURI": "Aspirin 100mg|LOT-2025-001|Token #1",
        "manufacturer": "0x7099...",
        "currentOwner": "0x15d3...",
        "mintedAt": 1234567890
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5
    }
  },
  "timestamp": 1234567890
}
```

---

### **9. Real-Time Event Stream (SSE)**

**GET** `/api/events/stream`

Subscribe to real-time blockchain events via Server-Sent Events.

**Example:**
```javascript
const eventSource = new EventSource('http://localhost:3001/api/events/stream');

eventSource.addEventListener('BatchMinted', (event) => {
  const data = JSON.parse(event.data);
  console.log('New batch minted:', data);
});

eventSource.addEventListener('CustodyTransferred', (event) => {
  const data = JSON.parse(event.data);
  console.log('Custody transferred:', data);
});

eventSource.addEventListener('ReceiptAcknowledged', (event) => {
  const data = JSON.parse(event.data);
  console.log('Receipt acknowledged:', data);
});
```

**Event Types:**
- `BatchMinted` - New batch NFT created
- `CustodyTransferred` - Batch ownership changed
- `ReceiptAcknowledged` - Receiver acknowledged batch
- `EventLogged` - IoT data logged
- `PartnershipEstablished` - New vouching relationship

**Event Data Format:**
```json
{
  "tokenId": 1,
  "from": "0x7099...",
  "to": "0x15d3...",
  "timestamp": 1234567890,
  "blockNumber": 12345
}
```

---

## 🔐 Authentication

**Current:** No authentication required (public read access)

**Future:**
- API keys for rate limiting
- OAuth for write operations
- Role-based API access

---

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": 1234567890
}
```

**Common HTTP Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## 📊 Rate Limiting

**Current:** No rate limiting (local development)

**Production:**
- 100 requests per minute per IP
- 1000 requests per hour per IP
- SSE connections limited to 10 per IP

---

## 🧪 Testing the API

### **Using cURL**

```bash
# Health check
curl http://localhost:3001/api/health

# Get all batches
curl http://localhost:3001/api/batches

# Get specific batch
curl http://localhost:3001/api/batches/1

# Get custody history
curl http://localhost:3001/api/batches/1/custody

# Get stakeholder role
curl http://localhost:3001/api/stakeholders/0x70997970C51812dc3A010C7d01b50e0d17dc79C8/role
```

### **Using JavaScript (Frontend)**

```javascript
// Example: Fetch batch details
const fetchBatchDetails = async (tokenId) => {
  const response = await fetch(`http://localhost:3001/api/batches/${tokenId}`);
  const data = await response.json();

  if (data.success) {
    console.log('Batch:', data.data);
  } else {
    console.error('Error:', data.error);
  }
};

fetchBatchDetails(1);
```

---

## 🔧 Configuration

Backend API configuration (`.env` file):

```env
# Network
LOCALHOST_RPC_URL=http://127.0.0.1:8545

# Contract Addresses
LOCALHOST_STAKEHOLDER_REGISTRY=0x5FbDB...
LOCALHOST_DIGITAL_BATCH=0xe7f17...
LOCALHOST_TRACK_AND_TRACE=0xCf7Ed...
LOCALHOST_SUPPLY_CHAIN_EVENTS=0xDc64a...
LOCALHOST_PARTNERSHIP_REGISTRY=0x9fE46...

# Server
PORT=3001
CORS_ORIGIN=http://localhost:5174

# Event Indexer
INDEXER_ENABLED=true
```

---

## 📈 Performance

- **Response Time:** < 100ms (local), < 500ms (testnet)
- **Event Indexing:** 2-second polling interval
- **SSE Latency:** ~1-2 seconds from blockchain confirmation
- **Pagination:** Max 100 items per page

---

## 🚀 Next Steps

1. Deploy backend to cloud (AWS, Heroku, Railway)
2. Add database for persistent storage
3. Implement WebSocket for faster event streaming
4. Add caching layer (Redis)
5. Set up monitoring (New Relic, Datadog)

---

**For setup instructions, see [SETUP.md](SETUP.md)**
**For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md)**
