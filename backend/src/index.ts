import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { indexRouter } from "./routes/index.route.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { globalRateLimiter } from "./middlewares/rateLimiters.js";

const PORT = process.env.PORT || 5000;

export const app: Application = express();

// Middlewares
app.use(globalRateLimiter);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true, // Important: cookies bhejne ke liye
  }),
);
app.use(express.json());
app.use(cookieParser()); // Cookies read karne ke liye

// Routes
app.use("/", indexRouter);

app.get("/api/health", (req: Request, res: Response) => {
  return res.json({ status: "Backend running with TS + JWT Auth" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
