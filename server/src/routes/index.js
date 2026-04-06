import { Router } from "express";
import authRoutes from "./auth.routes.js";
import documentsRoutes from "./documents.routes.js";
import studyRoutes from "./study.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/", documentsRoutes);
router.use("/", studyRoutes);

export default router;
