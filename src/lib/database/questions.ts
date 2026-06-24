import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { notifyContestQuestionAskerAction } from '../../app/pytania-konkursu/actions';
import { createNotification } from './messaging';
import { isContestTender } from '../contest/map-tender-contest-display';
import { isContestQuestionsDeadlinePassed } from '../contest-questions/format-contest-question-label';
import { formatPostgrestError } from './postgrest-error';

export { formatPostgrestError };

export interface ContestQuestionComment {
  id: string;
  body: string;
  createdAt: string;
  authorId?: string;
  authorDisplayName?: string;
}

export interface ContestQuestionPublished {
  id: string;
  question: string;
  createdAt: string;
  answeredAt: string;
  comments: ContestQuestionComment[];
}

export interface ContestQuestionManagerRow {
  id: string;
  question: string;
  createdAt: string;
  answeredAt: string | null;
  askerId: string;
  askerDisplayName: string;
  companyName: string | null;
  comments: ContestQuestionComment[];
}

function parseContractorComments(raw: unknown): ContestQuestionComment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === 'string' ? row.id : '';
      const body = typeof row.body === 'string' ? row.body : '';
      const createdAt = typeof row.created_at === 'string' ? row.created_at : '';
      if (!id || !body) return null;
      return { id, body, createdAt };
    })
    .filter((c): c is ContestQuestionComment => c !== null);
}

function parseManagerComments(raw: unknown): ContestQuestionComment[] {
  if (!Array.isArray(raw)) return [];
  const comments: ContestQuestionComment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : '';
    const body = typeof row.body === 'string' ? row.body : '';
    const createdAt = typeof row.created_at === 'string' ? row.created_at : '';
    if (!id || !body) continue;
    const authorDisplayName =
      typeof row.author_display_name === 'string'
        ? row.author_display_name.trim() || 'Organizator'
        : 'Organizator';
    const authorId = typeof row.author_id === 'string' ? row.author_id : undefined;
    comments.push({ id, body, createdAt, authorId, authorDisplayName });
  }
  return comments;
}

export interface ContestQuestionPending {
  id: string;
  question: string;
  createdAt: string;
}

/**
 * Published Q&A visible to all contractors (anonymous).
 */
export async function fetchContestQuestionsForContractor(
  supabase: SupabaseClient<Database>,
  tenderId: string,
): Promise<{ data: ContestQuestionPublished[]; error: PostgrestError | null }> {
  const { data, error } = await supabase.rpc('list_contest_questions_contractor', {
    p_contest_id: tenderId,
  });

  if (error) {
    return { data: [], error };
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    question: row.question,
    createdAt: row.created_at,
    answeredAt: row.answered_at,
    comments: parseContractorComments(row.comments),
  }));

  return { data: rows, error: null };
}

/**
 * Own unanswered questions (visible only to asker via RLS).
 */
export async function fetchOwnPendingContestQuestions(
  supabase: SupabaseClient<Database>,
  tenderId: string,
  askerId: string,
): Promise<{ data: ContestQuestionPending[]; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('questions')
    .select('id, question, created_at')
    .eq('contest_id', tenderId)
    .eq('asker_id', askerId)
    .is('answered_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error };
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    question: row.question,
    createdAt: row.created_at,
  }));

  return { data: rows, error: null };
}

/**
 * All contest Q&A for manager (with asker identity).
 */
async function fetchContestQuestionsForManagerDirect(
  supabase: SupabaseClient<Database>,
  tenderId: string,
): Promise<{ data: ContestQuestionManagerRow[]; error: PostgrestError | null }> {
  const { data: questionRows, error } = await supabase
    .from('questions')
    .select('id, question, answer, created_at, answered_at, asker_id')
    .eq('contest_id', tenderId)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: [], error };
  }

  const askerIds = [...new Set((questionRows ?? []).map((q) => q.asker_id))];
  const profileMap = new Map<string, { name: string; company: string | null }>();

  if (askerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .in('id', askerIds);

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        company: null,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: companyLinks } = await (supabase as any)
      .from('user_companies')
      .select('user_id, companies(name)')
      .in('user_id', askerIds)
      .eq('is_primary', true);

    for (const link of companyLinks ?? []) {
      const userId = link.user_id as string;
      const company = link.companies as { name?: string } | null;
      const existing = profileMap.get(userId);
      if (existing && company?.name) {
        existing.company = company.name;
      }
    }
  }

  const questionIds = (questionRows ?? []).map((q) => q.id);
  const commentsByQuestion = new Map<string, ContestQuestionComment[]>();

  if (questionIds.length > 0) {
    const { data: commentRows } = await supabase
      .from('question_comments')
      .select('id, question_id, body, created_at, author_id')
      .in('question_id', questionIds)
      .order('created_at', { ascending: true });

    const authorIds = [...new Set((commentRows ?? []).map((c) => c.author_id))];
    const authorNames = new Map<string, string>();

    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .in('id', authorIds);
      for (const author of authors ?? []) {
        authorNames.set(
          author.id,
          `${author.first_name} ${author.last_name}`.trim() || 'Organizator',
        );
      }
    }

    for (const comment of commentRows ?? []) {
      const list = commentsByQuestion.get(comment.question_id) ?? [];
      list.push({
        id: comment.id,
        body: comment.body,
        createdAt: comment.created_at,
        authorId: comment.author_id,
        authorDisplayName: authorNames.get(comment.author_id) ?? 'Organizator',
      });
      commentsByQuestion.set(comment.question_id, list);
    }
  }

  const rows = (questionRows ?? []).map((row) => {
    const profile = profileMap.get(row.asker_id);
    const comments = commentsByQuestion.get(row.id) ?? [];
    if (comments.length === 0 && row.answer && row.answered_at) {
      comments.push({
        id: `legacy-${row.id}`,
        body: row.answer,
        createdAt: row.answered_at,
        authorDisplayName: 'Organizator',
      });
    }
    return {
      id: row.id,
      question: row.question,
      createdAt: row.created_at,
      answeredAt: row.answered_at,
      askerId: row.asker_id,
      askerDisplayName: profile?.name || 'Wykonawca',
      companyName: profile?.company ?? null,
      comments,
    };
  });

  return { data: rows, error: null };
}

/**
 * All contest Q&A for manager (with asker identity).
 */
export async function fetchContestQuestionsForManager(
  supabase: SupabaseClient<Database>,
  tenderId: string,
): Promise<{ data: ContestQuestionManagerRow[]; error: PostgrestError | null }> {
  const direct = await fetchContestQuestionsForManagerDirect(supabase, tenderId);
  if (!direct.error) {
    return direct;
  }

  const { data, error } = await supabase.rpc('list_contest_questions_manager', {
    p_contest_id: tenderId,
  });

  if (!error) {
    const rows = (data ?? []).map((row) => ({
      id: row.id,
      question: row.question,
      createdAt: row.created_at,
      answeredAt: row.answered_at,
      askerId: row.asker_id,
      askerDisplayName: row.asker_display_name?.trim() || 'Wykonawca',
      companyName: row.company_name,
      comments: parseManagerComments(row.comments),
    }));
    return { data: rows, error: null };
  }

  return direct.error ? direct : { data: [], error };
}

export async function updateContestQuestionComment(
  supabase: SupabaseClient<Database>,
  commentId: string,
  body: string,
): Promise<{ success: boolean; error: PostgrestError | Error | null }> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { success: false, error: new Error('Treść komentarza jest wymagana') };
  }

  if (commentId.startsWith('legacy-')) {
    return { success: false, error: new Error('Nie można edytować tej odpowiedzi w systemie') };
  }

  const { error } = await supabase
    .from('question_comments')
    .update({ body: trimmed })
    .eq('id', commentId);

  if (error) {
    return { success: false, error };
  }

  return { success: true, error: null };
}

export async function deleteContestQuestionComment(
  supabase: SupabaseClient<Database>,
  commentId: string,
): Promise<{ success: boolean; error: PostgrestError | Error | null }> {
  if (commentId.startsWith('legacy-')) {
    return { success: false, error: new Error('Nie można usunąć tej odpowiedzi w systemie') };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('delete_contest_question_comment', {
    p_comment_id: commentId,
  });

  if (error) {
    if (
      error.code === 'PGRST202' ||
      error.message?.includes('Could not find the function')
    ) {
      const { data: row, error: fetchError } = await supabase
        .from('question_comments')
        .select('question_id')
        .eq('id', commentId)
        .maybeSingle();

      if (fetchError || !row?.question_id) {
        return { success: false, error: fetchError ?? new Error('Komentarz nie istnieje') };
      }

      const { error: deleteError } = await supabase
        .from('question_comments')
        .delete()
        .eq('id', commentId);

      if (deleteError) {
        return { success: false, error: deleteError };
      }

      const { data: remaining, error: listError } = await supabase
        .from('question_comments')
        .select('body, created_at')
        .eq('question_id', row.question_id)
        .order('created_at', { ascending: false });

      if (listError) {
        return { success: false, error: listError };
      }

      const latest = remaining?.[0];
      const { error: syncError } = await supabase
        .from('questions')
        .update(
          latest
            ? { answer: latest.body, updated_at: new Date().toISOString() }
            : {
                answer: null,
                answered_by: null,
                answered_at: null,
                updated_at: new Date().toISOString(),
              },
        )
        .eq('id', row.question_id);

      if (syncError) {
        return { success: false, error: syncError };
      }

      return { success: true, error: null };
    }

    return { success: false, error };
  }

  return { success: true, error: null };
}

/**
 * Manager comments per contest (for Konkursy table badge).
 */
export async function fetchContestCommentCounts(
  supabase: SupabaseClient<Database>,
  tenderIds: string[],
): Promise<Record<string, number>> {
  if (tenderIds.length === 0) return {};

  const { data, error } = await supabase
    .from('question_comments')
    .select('id, questions!question_comments_question_id_fkey ( contest_id )')
    .in('questions.contest_id', tenderIds);

  if (error) {
    console.error('fetchContestCommentCounts:', formatPostgrestError(error));
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const questions = row.questions as { contest_id?: string } | null;
    const tenderId = questions?.contest_id;
    if (tenderId) {
      counts[tenderId] = (counts[tenderId] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Total Q&A threads per contest (for manager table badge).
 */
export async function fetchContestQuestionCounts(
  supabase: SupabaseClient<Database>,
  tenderIds: string[],
): Promise<Record<string, number>> {
  if (tenderIds.length === 0) return {};

  const { data, error } = await supabase
    .from('questions')
    .select('contest_id')
    .in('contest_id', tenderIds);

  if (error) {
    console.error('fetchContestQuestionCounts:', formatPostgrestError(error));
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.contest_id) {
      counts[row.contest_id] = (counts[row.contest_id] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Unanswered questions the manager has not opened in the Q&A dialog yet.
 */
/**
 * All unanswered questions per contest (for manager tooltip / badge).
 */
export async function fetchUnansweredContestQuestionCounts(
  supabase: SupabaseClient<Database>,
  tenderIds: string[],
): Promise<Record<string, number>> {
  if (tenderIds.length === 0) return {};

  const { data, error } = await supabase
    .from('questions')
    .select('contest_id')
    .in('contest_id', tenderIds)
    .is('answered_at', null);

  if (error) {
    console.error('fetchUnansweredContestQuestionCounts:', formatPostgrestError(error));
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.contest_id) {
      counts[row.contest_id] = (counts[row.contest_id] ?? 0) + 1;
    }
  }
  return counts;
}

export async function fetchUnseenContestQuestionCounts(
  supabase: SupabaseClient<Database>,
  tenderIds: string[],
): Promise<Record<string, number>> {
  if (tenderIds.length === 0) return {};

  const { data, error } = await supabase.rpc('count_unseen_contest_questions', {
    p_contest_ids: tenderIds,
  });

  if (error) {
    console.error('fetchUnseenContestQuestionCounts:', error);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.contest_id] = Number(row.unseen_count);
  }
  return counts;
}

export async function markContestQuestionsSeen(
  supabase: SupabaseClient<Database>,
  tenderId: string,
): Promise<void> {
  const { error } = await supabase.rpc('mark_contest_questions_seen', {
    p_contest_id: tenderId,
  });
  if (error) {
    console.warn('markContestQuestionsSeen:', error);
  }
}

export async function addContestQuestionComment(
  supabase: SupabaseClient<Database>,
  questionId: string,
  body: string,
): Promise<{ success: boolean; error: PostgrestError | Error | null }> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { success: false, error: new Error('Treść komentarza jest wymagana') };
  }

  const { error } = await supabase.rpc('add_contest_question_comment', {
    p_question_id: questionId,
    p_body: trimmed,
  });

  if (!error) {
    void notifyContestQuestionAskerAction(questionId).catch((notifError) => {
      console.warn('notifyContestQuestionAskerAction:', notifError);
    });
    return { success: true, error: null };
  }

  if (
    error.code === 'PGRST202' ||
    error.message?.includes('Could not find the function')
  ) {
    const legacy = await supabase.rpc('answer_contest_question', {
      p_question_id: questionId,
      p_answer: trimmed,
    });
    if (legacy.error) {
      return { success: false, error: legacy.error };
    }
    void notifyContestQuestionAskerAction(questionId).catch((notifError) => {
      console.warn('notifyContestQuestionAskerAction:', notifError);
    });
    return { success: true, error: null };
  }

  return { success: false, error };
}

export async function answerContestQuestion(
  supabase: SupabaseClient<Database>,
  questionId: string,
  answer: string,
): Promise<{ success: boolean; error: PostgrestError | Error | null }> {
  return addContestQuestionComment(supabase, questionId, answer);
}

interface TenderMeta {
  id: string;
  title: string;
  managerId: string;
  allowQuestions: boolean;
  submissionDeadline: string | null;
  isContest: boolean;
}

async function resolveListingMeta(
  supabase: SupabaseClient<Database>,
  listingId: string,
): Promise<{ meta: TenderMeta | null; isJob: boolean; error: PostgrestError | Error | null }> {
  const { data: jobData, error: jobError } = await supabase
    .from('jobs')
    .select('id, title, manager_id')
    .eq('id', listingId)
    .maybeSingle();

  if (!jobError && jobData) {
    return {
      meta: {
        id: jobData.id,
        title: jobData.title,
        managerId: jobData.manager_id,
        allowQuestions: true,
        submissionDeadline: null,
        isContest: false,
      },
      isJob: true,
      error: null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tenderData, error: tenderError } = await (supabase as any)
    .from('contests')
    .select(
      'id, title, manager_id, allow_questions, submission_deadline, managed_entity_id, selection_criteria, formal_requirements',
    )
    .eq('id', listingId)
    .maybeSingle();

  if (tenderError || !tenderData) {
    return { meta: null, isJob: false, error: tenderError ?? new Error('Ogłoszenie nie istnieje') };
  }

  const isContest = isContestTender({
    managed_entity_id: tenderData.managed_entity_id,
    selection_criteria: tenderData.selection_criteria as Record<string, unknown> | null,
    formal_requirements: tenderData.formal_requirements as Record<string, unknown> | null,
  });

  return {
    meta: {
      id: tenderData.id,
      title: tenderData.title,
      managerId: tenderData.manager_id,
      allowQuestions: tenderData.allow_questions ?? true,
      submissionDeadline: tenderData.submission_deadline,
      isContest,
    },
    isJob: false,
    error: null,
  };
}

/**
 * Submit a question about a job or tender.
 */
export async function submitQuestion(
  supabase: SupabaseClient<Database>,
  jobId: string,
  askerId: string,
  question: string,
): Promise<{
  success: boolean;
  error: PostgrestError | Error | null;
  questionId?: string;
  notifyManagerContestQuestion?: {
    questionId: string;
    contestId: string;
    managerId: string;
    contestTitle: string;
    questionText: string;
  };
}> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      return {
        success: false,
        error: new Error('Brak aktywnej sesji. Proszę się zalogować ponownie.'),
      };
    }

    const authenticatedUserId = sessionData.session.user.id;
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return { success: false, error: new Error('Pytanie nie może być puste') };
    }

    const { meta, isJob, error: metaError } = await resolveListingMeta(supabase, jobId);
    if (metaError || !meta) {
      return { success: false, error: metaError ?? new Error('Ogłoszenie nie istnieje') };
    }

    if (!isJob && meta.isContest) {
      if (!meta.allowQuestions) {
        return { success: false, error: new Error('Pytania do tego konkursu są wyłączone') };
      }
      if (isContestQuestionsDeadlinePassed(meta.submissionDeadline)) {
        return {
          success: false,
          error: new Error('Termin składania ofert minął — nie można już zadawać pytań'),
        };
      }
    }

    const insertPayload: Database['public']['Tables']['questions']['Insert'] = {
      asker_id: authenticatedUserId,
      question: trimmedQuestion,
      is_public: true,
      ...(isJob ? { job_id: jobId } : { contest_id: jobId }),
    };

    const { data: questionRow, error: questionError } = await supabase
      .from('questions')
      .insert(insertPayload)
      .select('id')
      .single();

    if (questionError) {
      if (questionError.code === '23503') {
        return { success: false, error: new Error('Ogłoszenie nie istnieje') };
      }
      if (
        questionError.code === '42501' ||
        questionError.message?.includes('policy') ||
        questionError.message?.includes('permission')
      ) {
        return {
          success: false,
          error: new Error('Brak uprawnień do dodania pytania. Sprawdź czy jesteś zalogowany.'),
        };
      }
      return { success: false, error: questionError };
    }

    const questionId = questionRow?.id ?? '';
    const isContestQa = !isJob && meta.isContest;

    if (meta.managerId && authenticatedUserId !== meta.managerId) {
      const actionUrl = isContestQa
        ? `/panel-zarzadcy/konkursy?contestId=${jobId}&tab=questions`
        : `/konkurs/${jobId}`;

      const notificationType = isContestQa ? 'contest_question' : 'new_message';
      const notificationTitle = isContestQa
        ? 'Nowe pytanie do konkursu'
        : 'Nowe pytanie dotyczące ogłoszenia';

      try {
        if (!isContestQa) {
          await createNotification(
            supabase,
            meta.managerId,
            notificationType,
            notificationTitle,
            `Otrzymałeś nowe pytanie dotyczące ogłoszenia: ${meta.title}`,
            {
              questionId,
              jobId,
              title: meta.title,
            },
            actionUrl,
          );
        }
      } catch (notifError) {
        console.warn('Error creating notification:', notifError);
      }
    }

    return {
      success: true,
      error: null,
      questionId,
      notifyManagerContestQuestion:
        isContestQa && meta.managerId && authenticatedUserId !== meta.managerId
          ? {
              questionId,
              contestId: jobId,
              managerId: meta.managerId,
              contestTitle: meta.title,
              questionText: trimmedQuestion,
            }
          : undefined,
    };
  } catch (err) {
    console.error('Error submitting question:', err);
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}
