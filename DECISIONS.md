# DECISIONS.md

## What I Built

I built a small LLM gateway that sits between a user and an LLM provider. Users send chat requests using gateway-issued API keys, and the gateway checks their available budget before making a request. It also records token usage and the estimated cost of each request.

## Request Lifecycle

```text
Client Request
      ↓
API Key Authentication
      ↓
Request Validation
      ↓
Estimate Cost & Reserve Budget
      ↓
Call Groq Provider
      ↓
Update Budget with Actual Usage
      ↓
Save Usage in MongoDB
      ↓
Return Response to Client
```

The gateway checks the key and budget before calling Groq, then updates the spend and saves usage before returning the response.

## Important Design Decisions

### 1. Atomic Budget Reservation

Before calling the provider, I reserve the estimated cost from the API key's available budget in a single atomic operation. This prevents concurrent requests from using the same available budget.

### 2. Release Budget on Provider Failure

If the provider call fails, I try to release the reserved amount. This allows the API key to use that budget again.

### 3. Handling Reconciliation Failure

If the provider succeeds but budget reconciliation fails, I do not release the reservation because the provider may have incurred a cost. In the future, I can add a recovery mechanism to reconcile such cases.

### 4. Estimated Cost and Actual Usage

I reserve an estimated cost before calling the provider and adjust it based on the actual token usage returned by the provider. This helps keep the budget usage closer to the actual cost.

## Why the Gateway Enforces the Budget

The gateway enforces the budget because callers should not be trusted to control their own spending. Before sending a request to the provider, the gateway checks the available budget and reserves the estimated cost.

## Handling Concurrent Requests

If two requests arrive at the same time for the same API key, both could try to use the remaining budget. For example, if the key has ₹10 left and both requests need ₹7, both should not be allowed to proceed. Atomic reservation ensures that only a request with a successful reservation can proceed when enough budget is available.

## Fallback Policy

The gateway uses Groq as its only provider. If the provider call fails, the gateway returns an error and attempts to release the reserved budget. I have not added retries or a second provider to keep the implementation simple.

## What I Haven't Built

### Reconciliation Recovery

If the provider succeeds but budget reconciliation fails, I keep the reservation because the provider may have incurred a cost. I have not built a mechanism to reconcile the reservation with the actual cost later.

### Provider Failure and Cost Uncertainty

If the provider call fails, I attempt to release the reserved budget. However, a timeout or network error does not always tell me whether the provider processed the request and incurred a cost. This means some costs could go unaccounted for.

## Least-Confident Decisions

### Cost Estimation

I estimate the cost using the maximum tokens allowed for the response. If the actual response is shorter, the estimated cost may be higher until reconciliation happens.

### Reservation and Reconciliation

If the provider succeeds but reconciliation fails, I keep the reservation because the provider may have incurred a cost. I have not built a mechanism to reconcile the reservation with the actual cost later.

### Usage Logging

I save usage records before returning the response. This keeps the implementation simple, but a database failure can affect the request even after the provider has responded. Asynchronous logging could reduce this dependency, but it would need its own reliability mechanism.

## Where the System Breaks and What I'd Improve

If the provider fails, I may not know whether a cost was incurred. If reconciliation fails after a successful response, the reserved amount may remain unreconciled.

I would improve this by adding a recovery mechanism for failed reconciliation, handling uncertain provider failures more carefully, and exploring retries or a second provider with proper budget checks and safeguards against duplicate requests.
