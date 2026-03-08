import type { PaginatedResponse } from '@/types/pagination';

import { httpClient } from './httpClient';

export type EventSummary = {
  id: number;
  name: string;
  disasterType: string;
  city: string;
  description: string;
  date: string;
  createdBy: number;
};

export type GetEventsParams = {
  page?: number;
  limit?: number;
  city?: string;
  disasterType?: string;
  search?: string;
};

export type CreateEventPayload = {
  name: string;
  disasterType: string;
  city: string;
  description: string;
  date: string;
  createdBy: number;
};

export async function getEvents({
  page = 1,
  limit = 50,
  city,
  disasterType,
  search,
}: GetEventsParams = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (city) {
    params.set('city', city);
  }

  if (disasterType) {
    params.set('disasterType', disasterType);
  }

  if (search) {
    params.set('search', search);
  }

  return httpClient<PaginatedResponse<EventSummary>>(`/events?${params.toString()}`);
}

export async function createEvent(payload: CreateEventPayload) {
  return httpClient<EventSummary>('/events', {
    method: 'POST',
    body: payload,
  });
}
