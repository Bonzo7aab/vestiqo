'use client';

import React from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { cn } from '../ui/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'date'
  | 'datetime'
  | 'string-array';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: SelectOption[];
  fullWidth?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
  readOnly?: boolean;
}

export type FieldValue = string | number | string[] | null | undefined;

export interface FormSection {
  title?: string;
  fields: FieldDef[];
}

export type EditableFormValues = Record<string, FieldValue>;

interface EditableFormProps {
  sections: FormSection[];
  initialValues: EditableFormValues;
  busy?: boolean;
  submitLabel?: string;
  editing?: boolean;
  onSave: (patch: Record<string, unknown>) => Promise<boolean | void> | boolean | void;
}

function toInputDate(value: FieldValue): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  return value.slice(0, 10);
}

function toInputDateTime(value: FieldValue): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  const trimmed = value.replace('Z', '').slice(0, 16);
  return trimmed;
}

function toTextareaArray(value: FieldValue): string {
  if (Array.isArray(value)) return value.join('\n');
  return '';
}

function fromTextareaArray(value: string): string[] | null {
  const parts = value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : null;
}

function valuesEqual(a: FieldValue, b: FieldValue): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) return true;
  return false;
}

function cloneValues(source: EditableFormValues): EditableFormValues {
  return JSON.parse(JSON.stringify(source)) as EditableFormValues;
}

const editableFieldClass =
  'bg-background text-sm font-normal normal-case text-foreground placeholder:text-muted-foreground/70';

export function EditableForm({
  sections,
  initialValues,
  busy,
  submitLabel = 'Zapisz zmiany',
  editing = true,
  onSave,
}: EditableFormProps) {
  const [values, setValues] = React.useState<EditableFormValues>(initialValues);
  const baselineRef = React.useRef<EditableFormValues>(cloneValues(initialValues));
  const valuesRef = React.useRef<EditableFormValues>(initialValues);
  const [submitting, setSubmitting] = React.useState(false);
  const prevEditingRef = React.useRef(editing);

  valuesRef.current = values;

  React.useEffect(() => {
    if (editing) {
      if (!prevEditingRef.current) {
        baselineRef.current = cloneValues(initialValues);
        setValues(cloneValues(initialValues));
      }
    } else {
      baselineRef.current = cloneValues(initialValues);
      setValues(cloneValues(initialValues));
    }
    prevEditingRef.current = editing;
  }, [editing, initialValues]);

  const setValue = (key: string, next: FieldValue) => {
    setValues((prev) => {
      const nextValues = { ...prev, [key]: next };
      valuesRef.current = nextValues;
      return nextValues;
    });
  };

  const submit = async () => {
    const currentValues = valuesRef.current;
    const baseline = baselineRef.current;
    const patch: Record<string, unknown> = {};
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.readOnly) continue;
        const cur = currentValues[field.key];
        const init = baseline[field.key];
        if (!valuesEqual(cur, init)) {
          patch[field.key] = cur === '' ? null : cur;
        }
      }
    }
    if (Object.keys(patch).length === 0) {
      toast.info('Brak zmian do zapisania.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await onSave(patch);
      if (result !== false) {
        baselineRef.current = cloneValues(currentValues);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd zapisu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={section.title ?? idx} className="space-y-3">
          {section.title && (
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h4>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {section.fields.map((field) => (
              <div
                key={field.key}
                className={cn('space-y-1', (field.fullWidth || field.type === 'textarea' || field.type === 'string-array') && 'md:col-span-2')}
              >
                <Label htmlFor={field.key} className="text-xs font-medium tracking-wide text-muted-foreground">
                  {field.label}
                </Label>
                <FieldInput
                  field={field}
                  value={values[field.key]}
                  readOnly={field.readOnly || !editing}
                  onChange={(v) => setValue(field.key, v)}
                />
                {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {editing ? (
        <Button
          type="button"
          size="sm"
          disabled={busy || submitting}
          onClick={(event) => {
            event.stopPropagation();
            void submit();
          }}
        >
          {submitting ? 'Zapisywanie…' : submitLabel}
        </Button>
      ) : null}
    </div>
  );
}

interface FieldInputProps {
  field: FieldDef;
  value: FieldValue;
  readOnly: boolean;
  onChange: (next: FieldValue) => void;
}

function formatReadOnlyValue(field: FieldDef, value: FieldValue): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field.type === 'select') {
    const match = field.options?.find((opt) => opt.value === value);
    return match?.label ?? String(value);
  }
  if (field.type === 'string-array' && Array.isArray(value)) {
    return value.length > 0 ? value.join('\n') : '—';
  }
  if (field.type === 'date' || field.type === 'datetime') {
    try {
      return new Date(String(value)).toLocaleString('pl-PL', {
        dateStyle: 'short',
        timeStyle: field.type === 'datetime' ? 'short' : undefined,
      });
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function FieldInput({ field, value, readOnly, onChange }: FieldInputProps) {
  if (readOnly) {
    const formatted = formatReadOnlyValue(field, value);
    if (field.type === 'text' || field.type === 'number') {
      return (
        <Input
          id={field.key}
          readOnly
          type={field.type === 'number' ? 'number' : 'text'}
          className="cursor-default bg-muted/40 text-sm font-normal text-muted-foreground"
          value={formatted === '—' ? '' : formatted}
          placeholder="—"
        />
      );
    }
    const multiline = field.type === 'textarea' || field.type === 'string-array';
    return (
      <div
        id={field.key}
        className={cn(
          'rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm font-normal text-muted-foreground',
          multiline ? 'min-h-[72px] whitespace-pre-wrap' : 'min-h-9',
        )}
      >
        {formatted}
      </div>
    );
  }

  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          id={field.key}
          className={editableFieldClass}
          rows={field.rows ?? 4}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'number':
      return (
        <Input
          id={field.key}
          className={editableFieldClass}
          type="number"
          inputMode="decimal"
          placeholder={field.placeholder}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange(null);
              return;
            }
            const num = Number(raw);
            onChange(Number.isFinite(num) ? num : null);
          }}
        />
      );
    case 'select': {
      const selectValue = (value as string) ?? '';
      return (
        <Select
          value={selectValue.length > 0 ? selectValue : undefined}
          onValueChange={(v) => onChange(v === '__null__' ? null : v)}
        >
          <SelectTrigger id={field.key} className={editableFieldClass}>
            <SelectValue placeholder={field.placeholder ?? 'Wybierz…'} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case 'date':
      return (
        <Input
          id={field.key}
          className={editableFieldClass}
          type="date"
          value={toInputDate(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        />
      );
    case 'datetime':
      return (
        <Input
          id={field.key}
          className={editableFieldClass}
          type="datetime-local"
          value={toInputDateTime(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        />
      );
    case 'string-array':
      return (
        <Textarea
          id={field.key}
          className={editableFieldClass}
          rows={field.rows ?? 3}
          placeholder={field.placeholder ?? 'Jeden element w linii…'}
          value={toTextareaArray(value)}
          onChange={(e) => onChange(fromTextareaArray(e.target.value))}
        />
      );
    case 'text':
    default:
      return (
        <Input
          id={field.key}
          className={editableFieldClass}
          type="text"
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
