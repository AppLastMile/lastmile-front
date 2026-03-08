import { httpClient } from './httpClient';

export type CreateMoneyDonationPayload = {
  campaignId: number;
  donorId: number;
  amount: number;
};

export type MoneyDonationResponse = {
  id: number;
  campaignId: number;
  donorId: number;
  amount: number;
  createdAt?: string;
};

export async function createMoneyDonation(payload: CreateMoneyDonationPayload) {
  return httpClient<MoneyDonationResponse>('/donations/money', {
    method: 'POST',
    body: payload,
  });
}
