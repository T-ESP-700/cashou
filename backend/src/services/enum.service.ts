// src/services/enum.service.ts
import { QuizType, NotificationType } from "@prisma/client";

export class EnumService {
    /** Renvoie les valeurs de QuizType issues du model Prisma */
    getQuizTypes(): string[] {
        return Object.values(QuizType);
    }

    /** Renvoie les valeurs de NotificationType issues du model Prisma */
    getNotificationTypes(): string[] {
        return Object.values(NotificationType);
    }
}