import { UserStatus } from '../schemas/user.schema';

export class UserResponseDto {
  id!: string;
  name!: string;
  email!: string;
  status!: UserStatus;
  emailVerifiedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}