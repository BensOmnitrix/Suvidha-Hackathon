import express, {} from "express";
import cors from "cors";
import { indexRouter } from "./routes/index.route.js";
import { errorHandler } from "./middlewares/error.middleware.js";
const PORT = process.env.PORT || 5000;
export const app = express();
import { globalRateLimiter } from "./middlewares/rateLimiters.js";
app.use(globalRateLimiter);
app.use(cors());
app.use(express.json());
app.use("/", indexRouter);
app.get("/api/health", (req, res) => {
    return res.json({ status: "Backend running with TS" });
});
app.use(errorHandler);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
