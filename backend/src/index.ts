import rateLimit from "express-rate-limit";
import express, { type Application, type Request, type Response } from "express";
import cors from "cors";
import { indexRouter } from "./routes/index.route.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const PORT = process.env.PORT || 5000;

export const app: Application = express();

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Try again later.",
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Too many OTP requests. Try later.",
});

app.use(globalRateLimiter);
app.use(cors());
app.use(express.json());
app.use("/", indexRouter);

app.get("/api/health", (req: Request, res: Response) => {
  return res.json({ status: "Backend running with TS" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
