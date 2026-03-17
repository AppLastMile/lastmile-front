import type { PaginatedResponse } from '@/types/pagination';

import type { UserRole } from '@/constants/roles';

import { httpClient } from './httpClient';

export type UserSummary = {
  id: number;
  fullName?: string;
  name?: string;
  email: string;
  role: UserRole;
};

export async function getUsers(page = 1, limit = 100) {
  return httpClient<PaginatedResponse<UserSummary>>(`/users?page=${page}&limit=${limit}`);
}
