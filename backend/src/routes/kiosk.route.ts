import { Router } from "express";
import { registerKiosk, updateKioskStatus, getAllKiosks } from "../controllers/kiosk/kiosk.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { registerKioskSchema, updateKioskStatusSchema } from "../validators/kiosk.validators.js";

export const kioskRouter = Router();

// Public routes
kioskRouter.route("/").get(getAllKiosks);

// Protected routes
kioskRouter.route("/register").post(authenticate, validate(registerKioskSchema), registerKiosk);
kioskRouter.route("/:kioskId/status").patch(authenticate, validate(updateKioskStatusSchema), updateKioskStatus);