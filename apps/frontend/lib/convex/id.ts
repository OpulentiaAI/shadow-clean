import type { Id, TableNames } from "../../../../convex/_generated/dataModel";

const MIN_CONVEX_ID_LENGTH = 24;
const CONVEX_ID_REGEX = /^[a-z0-9]+$/;

/**
 * Best-effort guard to determine if a string looks like a Convex-generated id.
 * Convex ids are lowercase alphanumeric and longer than typical nanoid-based ids
 * we use in Postgres. This avoids sending Prisma ids to Convex validators.
 */
export function asConvexId<TableName extends TableNames>(
  value: string | null | undefined
): Id<TableName> | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (
    trimmed.length < MIN_CONVEX_ID_LENGTH ||
    !CONVEX_ID_REGEX.test(trimmed)
  ) {
    return undefined;
  }
  return trimmed as Id<TableName>;
}

/**
 * Convert string to Convex ID, throwing error if invalid
 * Use this when you expect a valid Convex ID
 */
export function toConvexId<TableName extends TableNames>(
  tableName: TableName,
  value: string
): Id<TableName> {
  const id = asConvexId<TableName>(value);
  if (!id) {
    throw new Error(`Invalid Convex ID for table ${tableName}: ${value}`);
  }
  return id;
}

