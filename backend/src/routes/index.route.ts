import { Router } from "express";
import { authRouter } from "./auth.route.js";
import { userRouter } from "./user.route.js";
import { kioskRouter } from "./kiosk.route.js";

export const indexRouter = Router();

indexRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

indexRouter.use("/auth", authRouter);
indexRouter.use("/users", userRouter);
indexRouter.use("/kiosks", kioskRouter);
