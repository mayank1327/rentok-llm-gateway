# AI-LOG.md

## AI Tools Used

I used ChatGPT to understand the assignment requirements, plan the implementation, and debug issues during development.

## AI Mistake

One suggestion could release the reserved budget even after the provider had responded successfully but later processing failed. I questioned this because the provider might have already incurred a cost, so releasing the reservation could lead to incorrect budget tracking.

## AI Suggestion I Overrode

I did not accept every suggestion without checking it. I reviewed the suggestions against the assignment requirements and my implementation, and made the final decisions based on what I understood and what the project needed.

## How I Stayed in Control

I broke the requirements into smaller parts and implemented them one by one. I reviewed the implementation at each step and used tests to verify important budget-handling logic. I also tested the deployed API using Postman and kept provider credentials in environment variables instead of committing them to the repository.
