import { Platform } from "react-native";
import { getITMApiClient } from "@/lib/api";

export const isWeb = Platform.OS === "web";

export async function cloudList<T = Record<string, unknown>>(
  entityType: string,
  orgId: string,
): Promise<T[]> {
  return getITMApiClient().listEntity<T>(entityType, orgId);
}

export async function cloudUpsert<T = Record<string, unknown>>(
  entityType: string,
  rows: T | T[],
): Promise<T[]> {
  return getITMApiClient().upsertEntity<T>(entityType, rows);
}

export async function cloudDelete(
  entityType: string,
  id: string,
  orgId: string,
): Promise<void> {
  return getITMApiClient().deleteEntity(entityType, id, orgId);
}
