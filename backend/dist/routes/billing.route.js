import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getUserBills } from "../controllers/billing/billing.controller.js";
export const billingRouter = Router();
billingRouter.use(authenticate);
billingRouter.route("/").get(getUserBills);
