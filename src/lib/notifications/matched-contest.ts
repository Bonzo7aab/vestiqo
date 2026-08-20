import 'server-only';

import { createAdminClientOrNull } from '../supabase/admin';
import { buildKonkursPath } from '../listing/konkurs-slug';
import { createOpd41Notification } from './opd41-server';
import { notifySavedUsersOfNewContest } from './saved-entity-new-contest';
import {
  MATCHED_CONTEST_TITLE,
  buildMatchedContestMessage,
  excludeUserIds,
  resolveContestServiceMatchSlugs,
} from './matched-contest-match';

interface CategoryRef {
  name?: string;
  slug?: string;
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Notify contractors whose Usługi match a newly published public contest (OPD-148).
 * Returns user IDs that received (or were targeted for) the match notification,
 * so bookmark alerts can skip them.
 */
export async function notifyMatchedContractorsOfNewContest(
  contestId: string,
): Promise<string[]> {
  const id = contestId?.trim();
  if (!id) return [];

  const admin = createAdminClientOrNull();
  if (!admin) {
    console.warn('[notifyMatchedContractorsOfNewContest] admin client unavailable');
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contest, error: contestError } = await (admin as any)
    .from('contests')
    .select(
      `
      id,
      title,
      status,
      is_public,
      manager_id,
      managed_entity_id,
      managed_entity:managed_housing_entities!contests_managed_entity_id_fkey (
        id,
        name
      ),
      category:job_categories!tenders_category_id_fkey (
        name,
        slug
      ),
      subcategory:job_categories!tenders_subcategory_id_fkey (
        name,
        slug
      )
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (contestError) {
    console.error('[notifyMatchedContractorsOfNewContest] contest fetch:', contestError);
    return [];
  }

  if (
    !contest ||
    contest.status !== 'active' ||
    contest.is_public !== true ||
    !contest.managed_entity_id
  ) {
    return [];
  }

  const entityRow = firstRow(
    contest.managed_entity as { name?: string } | { name?: string }[] | null,
  );
  const entityName = entityRow?.name?.trim();
  if (!entityName) return [];

  const categoryRow = firstRow(contest.category as CategoryRef | CategoryRef[] | null);
  const subcategoryRow = firstRow(contest.subcategory as CategoryRef | CategoryRef[] | null);
  const categoryName =
    subcategoryRow?.name?.trim() || categoryRow?.name?.trim() || 'usługi';

  const matchSlugs = resolveContestServiceMatchSlugs({
    subcategorySlug: subcategoryRow?.slug,
    categorySlug: categoryRow?.slug,
  });
  if (matchSlugs.length === 0) return [];

  const { data: matchedRows, error: rpcError } = await admin.rpc(
    'contractor_user_ids_matching_service_slugs',
    { p_slugs: matchSlugs },
  );

  if (rpcError) {
    console.error('[notifyMatchedContractorsOfNewContest] rpc:', rpcError);
    return [];
  }

  const ownerId = typeof contest.manager_id === 'string' ? contest.manager_id : null;
  const matchedUserIds = excludeUserIds(
    [
      ...new Set(
        (matchedRows ?? [])
          .map((row) => row.user_id)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    ],
    ownerId ? [ownerId] : [],
  );

  if (matchedUserIds.length === 0) return [];

  const contestTitle = (contest.title as string) || 'konkurs';
  const actionUrl = buildKonkursPath(id, contestTitle);
  const message = buildMatchedContestMessage(entityName, categoryName);

  await Promise.all(
    matchedUserIds.map(async (userId) => {
      const result = await createOpd41Notification({
        userId,
        kind: 'contractor_matched_contest',
        type: 'new_contest',
        title: MATCHED_CONTEST_TITLE,
        message,
        actionUrl,
        data: {
          contestId: id,
          tenderId: id,
          managedEntityId: contest.managed_entity_id,
          title: contestTitle,
          entityName,
          categoryName,
          matchSource: 'services',
        },
        supabase: admin,
      });
      if (!result.notificationId && !result.skipped) {
        console.warn('[notifyMatchedContractorsOfNewContest] create failed', userId);
      }
    }),
  );

  return matchedUserIds;
}

/**
 * Bookmark (OPD-152) + service-match (OPD-148) audience for a newly published contest.
 * Users who match by services get only the match copy.
 */
export async function notifyNewContestAudience(contestId: string): Promise<void> {
  const matchedUserIds = await notifyMatchedContractorsOfNewContest(contestId);
  await notifySavedUsersOfNewContest(contestId, matchedUserIds);
}
