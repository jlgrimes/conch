# Retry Policy

- max retries: 5
- backoff: exponential (1s, 2s, 4s, 8s, 16s)
- jitter: +/-20%
- dead-letter after max retries
