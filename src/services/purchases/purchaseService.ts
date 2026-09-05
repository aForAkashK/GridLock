/**
 * In-app purchases — PRD section 21. Not wired for MVP v0.1.
 *
 * Entitlement is restored from the store receipt, never from our own coin
 * ledger. That is what guarantees a player who loses local progress still
 * keeps what they paid for.
 */

export type ProductId = 'remove_ads' | 'premium_pack';

export async function restorePurchases(): Promise<ProductId[]> {
  // TODO(iap): v1.0
  throw new Error('Not implemented');
}

export async function purchase(_id: ProductId): Promise<boolean> {
  // TODO(iap): v1.0
  throw new Error('Not implemented');
}
