// Application-wide constants

module.exports = {
  // User roles
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    STAFF: 'staff',
    TENANT: 'tenant'
  },

  // Maintenance request statuses
  MAINTENANCE_STATUS: {
    SUBMITTED:   'submitted',
    PENDING:     'pending',
    ASSIGNED:    'assigned',
    IN_PROGRESS: 'in_progress',
    COMPLETED:   'completed',
    CANCELLED:   'cancelled',
    ON_HOLD:     'on_hold'
  },

  // Invoice statuses
  INVOICE_STATUS: {
    PENDING:   'pending',
    PAID:      'paid',
    OVERDUE:   'overdue',
    CANCELLED: 'cancelled',
    PARTIAL:   'partial'
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE:  1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT:     100
  },

  // File upload limits
  UPLOAD: {
    MAX_SIZE_MB:    10,
    ALLOWED_IMAGES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_DOCS:   ['application/pdf'],
    ALLOWED_VIDEOS: ['video/mp4', 'video/quicktime']
  },

  // OTP settings
  OTP: {
    LENGTH:           6,
    EXPIRES_MINUTES:  10
  }
};
