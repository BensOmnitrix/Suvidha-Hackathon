/**
 * JWT Configuration
 *
 * Access Token: Short-lived (15 min) - API calls ke liye
 * Refresh Token: Long-lived (7 days) - New access token lene ke liye
 */

export const jwtConfig = {
  // Access Token Settings
  accessToken: {
    secret:
      process.env.JWT_ACCESS_SECRET ||
      "your-access-secret-change-in-production",
    expiresIn: "15m" as const, // 15 minutes
  },

  // Refresh Token Settings
  refreshToken: {
    secret:
      process.env.JWT_REFRESH_SECRET ||
      "your-refresh-secret-change-in-production",
    expiresIn: "7d" as const, // 7 days
    expiresInMs: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds (for DB)
  },

  // Cookie Settings (for refresh token)
  cookie: {
    httpOnly: true, // JavaScript se access nahi ho sakta (XSS protection)
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict" as const, // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
} as const;
