import { Router } from "express";
import { authRouter } from "./auth.route.js";
import { userRouter } from "./user.route.js";
import { kioskRouter } from "./kiosk.route.js";
import { complaintRouter } from "./complaint.route.js";
import { billingRouter } from "./billing.route.js";
import paymentRouter from "./payment.route.js";

export const indexRouter = Router();

indexRouter.use("/auth", authRouter);
indexRouter.use("/users", userRouter); // Changed from 'user' to 'users' for REST convention, or keep 'user' if preferred
indexRouter.use("/kiosks", kioskRouter);
indexRouter.use("/complaints", complaintRouter);
indexRouter.use("/billing", billingRouter);
indexRouter.use("/payments", paymentRouter);

