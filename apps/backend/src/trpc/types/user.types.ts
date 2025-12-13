import type { User } from "@prisma/client";

export type UserUpdateData = Partial<Pick<User,
  | 'name'
  | 'email'
  | 'image'
  | 'emailVerified'
  | 'username'
  | 'levelId'
  | 'points'
  | 'badges'
>> & {
  hashedPassword?: string;
};

export type UserProfileUpdateData = {
  username?: string;
  hashedPassword?: string;
};
