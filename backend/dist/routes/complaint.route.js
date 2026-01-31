import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createComplaintSchema } from "../validators/complaint.validators.js";
import { createComplaint, getUserComplaints } from "../controllers/complaint/complaint.controller.js";
export const complaintRouter = Router();
complaintRouter.use(authenticate);
complaintRouter.route("/").post(validate(createComplaintSchema), createComplaint);
complaintRouter.route("/my-complaints").get(getUserComplaints);
