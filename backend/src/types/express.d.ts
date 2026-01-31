/**
 * Express Request type extension
 *
 * req.user me ye data hoga (JWT se decoded)
 * Note: Full User object nahi, sirf zaroori fields
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        mobileNumber: string;
        fullName: string;
        role: string;
      };
    }
  }
}

export {};
