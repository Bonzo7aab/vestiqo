'use client';

import type { ContestQuestionComment } from '../../lib/database/questions';

function formatCommentTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

interface ContestQuestionCommentsListProps {
  comments: ContestQuestionComment[];
  variant: 'contractor' | 'manager';
}

export function ContestQuestionCommentsList({
  comments,
  variant,
}: ContestQuestionCommentsListProps): React.ReactElement | null {
  if (comments.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/15 bg-primary/[0.04] p-3 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
        {comments.length === 1 ? 'Odpowiedź organizatora' : 'Odpowiedzi organizatora'}
      </p>
      {comments.map((comment, index) => (
        <div
          key={comment.id}
          className={index > 0 ? 'border-t border-primary/10 pt-3' : undefined}
        >
          {variant === 'manager' && comment.authorDisplayName ? (
            <p className="mb-1.5 text-xs text-muted-foreground">
              {comment.authorDisplayName} — {formatCommentTimestamp(comment.createdAt)}
            </p>
          ) : (
            <p className="mb-1.5 text-xs text-muted-foreground">
              Organizator ({formatCommentTimestamp(comment.createdAt)})
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{comment.body}</p>
        </div>
      ))}
    </div>
  );
}
