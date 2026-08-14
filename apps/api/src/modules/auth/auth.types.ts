import { UserStatus } from '../users/schemas/user.schema';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  type: 'access';
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUser;
}