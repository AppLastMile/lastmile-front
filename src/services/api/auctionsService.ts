import type { PaginatedResponse } from '@/types/pagination';

import { httpClient } from './httpClient';

export type AuctionStatus = 'active' | 'sold' | 'cancelled';

export type Auction = {
  id: number;
  campaignId: number;
  sellerId: number;
  itemName: string;
  description?: string;
  price: number;
  currency?: string;
  status: AuctionStatus;
  buyerId: number | null;
  createdAt: string;
  soldAt: string | null;
};

export type CreateAuctionPayload = {
  sellerId: number;
  itemName: string;
  description?: string;
  price: number;
  currency?: string;
};

export type BuyAuctionPayload = {
  buyerId: number;
  idempotencyKey?: string;
};

export async function getCampaignAuctions(campaignId: number, status: 'active' | 'sold' | 'all' = 'all') {
  return httpClient<PaginatedResponse<Auction>>(`/campaigns/${campaignId}/auctions?status=${status}&page=1&limit=100`);
}

export async function createAuction(campaignId: number, payload: CreateAuctionPayload) {
  return httpClient<Auction>(`/campaigns/${campaignId}/auctions`, {
    method: 'POST',
    body: payload,
  });
}

export async function buyAuction(auctionId: number, payload: BuyAuctionPayload) {
  return httpClient<Auction>(`/auctions/${auctionId}/buy`, {
    method: 'POST',
    body: payload,
  });
}
