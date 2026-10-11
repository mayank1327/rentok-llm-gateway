# RentOk LLM Gateway

A minimal LLM gateway built with Node.js, Express, MongoDB, and Groq.

It provides gateway API-key authentication, budget enforcement, token usage tracking, and cost calculation for chat completion requests.

## Tech Stack

- Node.js and Express
- MongoDB with Mongoose
- Groq API
- Jest and Supertest

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/mayank1327/rentok-llm-gateway.git
cd rentok-llm-gateway
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root using `.env.example` as a reference.

Configure these variables:

| Variable | Description |
|---|---|
| `PORT` | Server port; defaults to `3000` locally |
| `MONGODB_URI` | MongoDB connection URI |
| `GROQ_API_KEY` | Groq provider API key |
| `USD_TO_INR_RATE` | USD-to-INR conversion rate |

Keep your `.env` file and credentials private. Never commit secrets to GitHub.

### 4. Start the server

```bash
npm run dev
```

The server starts on the configured port.

### 5. Create a gateway API key

```bash
npm run create-key -- "My API Key"
```

Copy and securely store the generated key. It is displayed only once.

### 6. Send a chat completion request

**Endpoint**

`POST /v1/chat/completions`

**Headers**

```text
Content-Type: application/json
x-api-key: YOUR_GATEWAY_API_KEY
```

**Request body**

```json
{
  "model": "openai/gpt-oss-20b",
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ]
}
```

Replace `YOUR_GATEWAY_API_KEY` with the gateway key created in Step 5.

For local testing, use `http://localhost:3000/v1/chat/completions`.

### 7. Health check

`GET /health`

Local URL: `http://localhost:3000/health`

## Running Tests

```bash
npm test
```

## Deployment

The gateway is deployed on Render:

https://rentok-llm-gateway-vli4.onrender.com

## Security

- Keep provider credentials server-side.
- Store gateway API keys securely.
- Never commit `.env` or production secrets.