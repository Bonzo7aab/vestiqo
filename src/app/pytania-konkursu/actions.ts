'use server';

import { createClient } from '../../lib/supabase/server';
import { createAdminClientOrNull } from '../../lib/supabase/admin';
import {
  buildContractorContestAnswerMessage,
  buildManagerContestQuestionMessage,
  createOpd41Notification,
  truncateQuestionPreview,
} from '../../lib/notifications/opd41-server';

export async function notifyManagerContestQuestionAction(params: {
  questionId: string;
  contestId: string;
  managerId: string;
  contestTitle: string;
  questionText: string;
}): Promise<{ success: boolean }> {
  const { questionId, contestId, managerId, contestTitle, questionText } = params;

  if (!questionId?.trim() || !contestId?.trim() || !managerId?.trim()) {
    return { success: false };
  }

  const admin = createAdminClientOrNull();
  if (!admin) {
    console.warn('notifyManagerContestQuestionAction: admin client unavailable');
    return { success: false };
  }

  const preview = truncateQuestionPreview(questionText);
  const actionUrl = `/panel-zarzadcy/konkursy?contestId=${contestId.trim()}&tab=questions`;

  await createOpd41Notification({
    supabase: admin,
    userId: managerId.trim(),
    kind: 'manager_contest_question',
    type: 'contest_question',
    title: 'Pytanie do konkursu',
    message: buildManagerContestQuestionMessage(contestTitle, preview),
    data: {
      questionId: questionId.trim(),
      contestId: contestId.trim(),
      tenderId: contestId.trim(),
      title: contestTitle,
    },
    actionUrl,
  });

  return { success: true };
}

export async function notifyContestQuestionAskerAction(
  questionId: string,
): Promise<{ success: boolean }> {
  if (!questionId?.trim()) {
    return { success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { success: false };
  }

  const admin = createAdminClientOrNull();
  if (!admin) {
    console.warn('notifyContestQuestionAskerAction: admin client unavailable');
    return { success: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: question, error: questionError } = await (admin as any)
    .from('questions')
    .select('asker_id, contest_id')
    .eq('id', questionId.trim())
    .maybeSingle();

  if (questionError || !question?.contest_id || !question.asker_id) {
    return { success: false };
  }

  const { data: canManage, error: accessError } = await supabase.rpc(
    'user_can_manage_contest',
    { p_contest_id: question.contest_id },
  );

  if (accessError || !canManage) {
    return { success: false };
  }

  if (question.asker_id === user.id) {
    return { success: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tender } = await (admin as any)
    .from('contests')
    .select('title')
    .eq('id', question.contest_id)
    .maybeSingle();

  const tenderTitle = (tender?.title as string | undefined) ?? 'konkurs';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error: countError } = await (admin as any)
    .from('question_comments')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', questionId.trim());

  if (countError) {
    return { success: false };
  }

  const isFirstAnswer = (count ?? 0) === 1;
  const actionUrl = `/konkurs/${question.contest_id}?tab=contest-qa`;

  if (isFirstAnswer) {
    await createOpd41Notification({
      supabase: admin,
      userId: question.asker_id,
      kind: 'contractor_contest_answer',
      type: 'contest_question',
      title: 'Odpowiedź na pytanie do konkursu',
      message: buildContractorContestAnswerMessage(tenderTitle),
      data: {
        tenderId: question.contest_id,
        contestId: question.contest_id,
        questionId: questionId.trim(),
        tab: 'contest-qa',
        title: tenderTitle,
      },
      actionUrl,
    });
  }

  return { success: true };
}
