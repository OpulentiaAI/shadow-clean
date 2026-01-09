import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export interface UserSettings {
  id: string;
  userId: string;
  autoPullRequest: boolean;
  enableShadowWiki: boolean;
  memoriesEnabled: boolean;
  selectedModels: string[];
  enableIndexing: boolean;
  rules?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapConvexSettings(settings: {
  _id: Id<"userSettings"> | null;
  userId: Id<"users">;
  autoPullRequest: boolean;
  enableShadowWiki: boolean;
  memoriesEnabled: boolean;
  selectedModels: string[];
  enableIndexing: boolean;
  rules?: string;
  createdAt: number;
  updatedAt: number;
}): UserSettings {
  return {
    id: settings._id ?? "temp",
    userId: settings.userId,
    autoPullRequest: settings.autoPullRequest,
    enableShadowWiki: settings.enableShadowWiki,
    memoriesEnabled: settings.memoriesEnabled,
    selectedModels: settings.selectedModels,
    enableIndexing: settings.enableIndexing,
    rules: settings.rules,
    createdAt: new Date(settings.createdAt),
    updatedAt: new Date(settings.updatedAt),
  };
}

export async function getUserSettings(
  userId: string
): Promise<UserSettings | null> {
  try {
    const convexUserId = userId as Id<"users">;
    const settings = await fetchQuery(api.userSettings.get, { userId: convexUserId });
    if (!settings) return null;
    return mapConvexSettings(settings);
  } catch (error) {
    console.error("[getUserSettings] Error:", error);
    return null;
  }
}

export async function updateUserSettings(
  userId: string,
  settings: {
    autoPullRequest?: boolean;
    enableShadowWiki?: boolean;
    memoriesEnabled?: boolean;
    selectedModels?: string[];
    enableIndexing?: boolean;
    rules?: string;
  }
): Promise<UserSettings> {
  try {
    const convexUserId = userId as Id<"users">;
    await fetchMutation(api.userSettings.update, {
      userId: convexUserId,
      ...settings,
    });
    
    // Fetch updated settings
    const updated = await fetchQuery(api.userSettings.get, { userId: convexUserId });
    if (!updated) {
      throw new Error("Settings not found after update");
    }
    return mapConvexSettings(updated);
  } catch (error) {
    console.error("[updateUserSettings] Error:", error);
    throw error;
  }
}

export async function getOrCreateUserSettings(
  userId: string
): Promise<UserSettings> {
  try {
    const convexUserId = userId as Id<"users">;
    const settings = await fetchQuery(api.userSettings.getOrCreate, { userId: convexUserId });
    return mapConvexSettings(settings);
  } catch (error) {
    console.error("[getOrCreateUserSettings] Error:", error);
    throw error;
  }
}
