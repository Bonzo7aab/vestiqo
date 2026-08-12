import 'server-only';

import { createAdminClientOrNull } from '../supabase/admin';
import { createNotificationsForUsers } from '../database/notifications-server';
import { buildKonkursPath } from '../listing/konkurs-slug';

/**
 * Notify contractors who bookmarked (Zapisane) the contest’s managed housing entity
 * when a new public contest is published (OPD-152).
 */
export async function notifySavedUsersOfNewContest(contestId: string): Promise<void> {
  const id = contestId?.trim();
  if (!id) return;

  const admin = createAdminClientOrNull();
  if (!admin) {
    console.warn('[notifySavedUsersOfNewContest] admin client unavailable');
    return;
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
      managed_entity_id,
      managed_entity:managed_housing_entities!contests_managed_entity_id_fkey (
        id,
        name,
        entity_type
      ),
      category:job_categories!tenders_category_id_fkey (
        name
      )
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (contestError) {
    console.error('[notifySavedUsersOfNewContest] contest fetch:', contestError);
    return;
  }

  if (
    !contest ||
    contest.status !== 'active' ||
    contest.is_public !== true ||
    !contest.managed_entity_id
  ) {
    return;
  }

  const entity = contest.managed_entity as
    | { id?: string; name?: string; entity_type?: string }
    | { id?: string; name?: string; entity_type?: string }[]
    | null;
  const entityRow = Array.isArray(entity) ? entity[0] : entity;
  const entityName = entityRow?.name?.trim();
  if (!entityName) return;

  const category = contest.category as
    | { name?: string }
    | { name?: string }[]
    | null;
  const categoryRow = Array.isArray(category) ? category[0] : category;
  const categoryName = categoryRow?.name?.trim() || 'usługi';

  const { data: bookmarks, error: bookmarkError } = await admin
    .from('bookmarks')
    .select('user_id')
    .eq('entity_type', 'managed_housing_entity')
    .eq('entity_id', contest.managed_entity_id as string);

  if (bookmarkError) {
    console.error('[notifySavedUsersOfNewContest] bookmarks:', bookmarkError);
    return;
  }

  const userIds = [
    ...new Set(
      (bookmarks ?? [])
        .map((row) => row.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    ),
  ];

  if (userIds.length === 0) return;

  const contestTitle = (contest.title as string) || 'konkurs';
  const actionUrl = buildKonkursPath(id, contestTitle);

  const result = await createNotificationsForUsers(userIds, {
    type: 'new_contest',
    title: 'Nowy konkurs',
    message: `${entityName} dodała nowy konkurs w kategorii ${categoryName}.`,
    actionUrl,
    data: {
      contestId: id,
      tenderId: id,
      managedEntityId: contest.managed_entity_id,
      title: contestTitle,
      entityName,
      categoryName,
    },
    priority: 'normal',
  });

  if (result.errors.length > 0) {
    console.warn(
      '[notifySavedUsersOfNewContest] some notifications failed:',
      result.errors.length,
    );
  }
}
