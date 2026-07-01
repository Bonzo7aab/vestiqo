import type { CompanyRegistrySnapshot } from '../registry/types';

export interface ProfileBusinessData {
  accountRole: string | null;
  organizationType: string | null;
  companyType: string | null;
  companyName: string;
  companyNip: string;
  companyRegon: string;
  companyKrs: string;
  legalForm: string;
  companyAddress: string;
  companyCity: string;
  companyPostalCode: string;
  bankAccountIban: string;
  vatStatus: string;
  vatWhitelistAssigned: boolean | null;
  registrySnapshot: CompanyRegistrySnapshot | null;
}

interface CacheEntry {
  data: ProfileBusinessData;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

export function getProfileBusinessDataCache(userId: string): ProfileBusinessData | null {
  return cache.get(userId)?.data ?? null;
}

export function isProfileBusinessDataCacheFresh(userId: string): boolean {
  const entry = cache.get(userId);
  if (!entry) {
    return false;
  }

  return Date.now() - entry.fetchedAt <= CACHE_TTL_MS;
}

export function setProfileBusinessDataCache(userId: string, data: ProfileBusinessData): void {
  cache.set(userId, {
    data,
    fetchedAt: Date.now(),
  });
}

export function invalidateProfileBusinessDataCache(userId?: string): void {
  if (userId) {
    cache.delete(userId);
    return;
  }

  cache.clear();
}
