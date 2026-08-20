import type { ReactElement } from 'react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface ReviewCommentFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
}

export function ReviewCommentField({
  id,
  value,
  onChange,
  placeholder,
  helperText = 'Komentarz jest widoczny na profilu firmy.',
}: ReviewCommentFieldProps): ReactElement {
  return (
    <div>
      <Label htmlFor={id}>Komentarz *</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-1 resize-none"
      />
      <div className="mt-1.5 flex items-start justify-between gap-3 text-xs text-muted-foreground">
        <p>{helperText}</p>
        <span className="shrink-0 tabular-nums">{value.length} znaków</span>
      </div>
    </div>
  );
}
