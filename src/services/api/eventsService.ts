import type { PaginatedResponse } from '@/types/pagination';

import { httpClient } from './httpClient';

export type EventSummary = {
  id: number;
  name: string;
  city: string;
};

export async function getEvents(page = 1, limit = 50) {
  return httpClient<PaginatedResponse<EventSummary>>(`/events?page=${page}&limit=${limit}`);
}
