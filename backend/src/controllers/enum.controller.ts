// src/controllers/enum.controller.ts
import { Router } from "express";
import { EnumService } from "../services/enum.service";

const router = Router();
const enumSvc = new EnumService();

// Quiz types
router.get("/quiz-types", (_, res) => {
    res.json(enumSvc.getQuizTypes());
});

// Notification types
router.get("/notification-types", (_, res) => {
    res.json(enumSvc.getNotificationTypes());
});

export default router;
