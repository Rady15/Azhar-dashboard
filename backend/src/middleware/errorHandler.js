// ─────────────────────────────────────────────────────────────
// Global error handler — catches everything thrown in routes
// ─────────────────────────────────────────────────────────────
function errorHandler(err, req, res, next) {
  // Always log errors on the server — visible in HuggingFace Spaces logs
  console.error(`🔴 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.error('   Message:', err.message);
  console.error('   Status:', err.status || err.statusCode || 500);
  console.error('   Stack:', err.stack);


  // Determine status code
  const status = err.status || err.statusCode || 500;

  // Build response
  const response = {
    success: false,
    message: err.message || 'Internal server error'
  };

  // Add validation details if present
  if (err.details) {
    response.errors = err.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

// ─────────────────────────────────────────────────────────────
// 404 handler — for routes that don't exist
// ─────────────────────────────────────────────────────────────
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

// ─────────────────────────────────────────────────────────────
// Async wrapper — wraps async route handlers to auto-catch errors
// Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
// ─────────────────────────────────────────────────────────────
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─────────────────────────────────────────────────────────────
// Helper to create standardized API errors
// ─────────────────────────────────────────────────────────────
function createError(message, status = 400, details = null) {
  const err = new Error(message);
  err.status = status;
  if (details) err.details = details;
  return err;
}

module.exports = { errorHandler, notFound, asyncHandler, createError };
