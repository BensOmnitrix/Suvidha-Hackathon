import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { payBillSchema } from "../validators/billing.validators.js";
import { getUserBills, payBill } from "../controllers/billing.controller.js";

export const billingRouter = Router();

billingRouter.use(authenticate);

billingRouter.route("/").get(getUserBills);
billingRouter.route("/pay").post(validate(payBillSchema), payBill);
