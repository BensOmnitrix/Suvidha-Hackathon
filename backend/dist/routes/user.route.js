import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateAccountSchema } from "../validators/user.validators.js";
import { getCurrentUser, updateAccountDetails } from "../controllers/user/user.controller.js";
export const userRouter = Router();
userRouter.use(authenticate);
userRouter.route("/me").get(getCurrentUser);
userRouter.route("/update-account").patch(validate(updateAccountSchema), updateAccountDetails);
