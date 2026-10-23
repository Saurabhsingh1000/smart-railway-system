// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/utils/retry.js
// Description: Automated retry mechanism with exponential backoff & jitter
// specifically targeting PostgreSQL SQLSTATE 40001 (serialization_failure)
// and 40P01 (deadlock_detected).
// ============================================================================

const RETRYABLE_SQL_STATES = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
]);

/**
 * Executes an operation with automatic retries on concurrency collision errors.
 * 
 * @param {Function} operation - Async function to execute. Receives attempt number.
 * @param {number} maxRetries - Maximum retry attempts (default 5).
 * @param {number} baseDelayMs - Base delay in milliseconds (default 50ms).
 * @returns {Promise<any>} - Resolves with the operation's return value.
 */
async function withRetry(operation, maxRetries = 5, baseDelayMs = 50) {
  let attempt = 0;

  while (true) {
    try {
      return await operation(attempt);
    } catch (error) {
      attempt++;
      const isRetryable = error && RETRYABLE_SQL_STATES.has(error.code);

      if (isRetryable && attempt <= maxRetries) {
        // Calculate exponential backoff with full random jitter
        const maxDelay = baseDelayMs * Math.pow(2, attempt);
        const delay = Math.floor(Math.random() * maxDelay);

        console.warn(
          `[Concurrency Retry] Encountered SQLSTATE ${error.code} (${error.message}). Retrying attempt ${attempt}/${maxRetries} after ${delay}ms...`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Rethrow non-retryable error or exceeded maximum retries
        throw error;
      }
    }
  }
}

module.exports = {
  withRetry,
  RETRYABLE_SQL_STATES,
};
