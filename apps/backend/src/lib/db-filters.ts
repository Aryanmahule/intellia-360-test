/**
 * Filters for the "soft delete" / "archive" columns.
 *
 * ── Why these exist ─────────────────────────────────────────────────────────
 * MongoDB stores no key at all for an optional field that has never been
 * written. A user created by the seed, or by any code path that does not pass
 * `deletedAt`, is stored as:
 *
 *     { _id, email, name, password, role, emailVerified, createdAt, updatedAt }
 *
 * — with no `deletedAt` key. Prisma *reads* that back as `deletedAt: null`, so
 * the field looks null everywhere in application code, but `where: { deletedAt:
 * null }` compiles to a query that only matches documents where the key is
 * present and null. Documents missing the key are invisible to it.
 *
 * The effect is a filter that silently matches nothing: every admin list
 * endpoint that hid deactivated accounts with `deletedAt: null` returned an
 * empty table even though the records existed and the endpoint returned 200.
 *
 * Both shapes occur in practice — documents written before the field existed
 * have no key, and a restore (`data: { deletedAt: null }`) writes an explicit
 * null — so these helpers match either.
 *
 * Combine them under `AND` rather than spreading them into a `where` that may
 * already carry its own `OR` (a search clause, typically), since two `OR` keys
 * cannot coexist in one object.
 *
 *     const where: Prisma.UserWhereInput = {
 *       ...(includeDeleted ? {} : { AND: [notDeleted()] }),
 *       ...(q ? { OR: [{ name: { contains: q } }] } : {}),
 *     };
 */

/** Matches rows that have not been soft-deleted (`deletedAt` null or absent). */
export function notDeleted() {
  return { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };
}

/** Matches rows that have not been archived (`archivedAt` null or absent). */
export function notArchived() {
  return { OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }] };
}

/**
 * Matches rows where the optional enum `requestedRole` actually holds a value.
 *
 * The inverse needs the same care: `NOT: { requestedRole: null }` matched every
 * document whose key was absent, so the pending-upgrade queue listed the whole
 * user table instead of the handful awaiting review.
 */
export function hasRequestedRole() {
  return { NOT: { OR: [{ requestedRole: null }, { requestedRole: { isSet: false } }] } };
}

/**
 * Makes search-box text safe to pass to Prisma's `contains` on MongoDB.
 *
 * The MongoDB connector turns `contains` into a `$regex` without escaping it,
 * so the text was read as a pattern: a lone "(" made the query invalid and the
 * route answered 500, and "1+1" or "St. Mary's (Pune)" silently matched the
 * wrong rows. Escaping the metacharacters makes the search match literally.
 */
export function literalSearch(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
