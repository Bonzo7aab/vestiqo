'use client';

import React from 'react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  VERIFICATION_REJECTION_REASONS,
  type VerificationRejectionReasonId,
  formatVerificationRejectionReason,
} from '../../lib/verification/status';

interface VerificationRejectReasonFieldsProps {
  reasonId: VerificationRejectionReasonId | '';
  customReason: string;
  onReasonIdChange: (id: VerificationRejectionReasonId | '') => void;
  onCustomReasonChange: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Hide OC-specific presets (contractor account review no longer covers polisa OC). */
  hideOutdatedOc?: boolean;
}

export function VerificationRejectReasonFields({
  reasonId,
  customReason,
  onReasonIdChange,
  onCustomReasonChange,
  disabled,
  compact = false,
  hideOutdatedOc = false,
}: VerificationRejectReasonFieldsProps) {
  const reasonOptions = hideOutdatedOc
    ? VERIFICATION_REJECTION_REASONS.filter((option) => option.id !== 'outdated_oc')
    : VERIFICATION_REJECTION_REASONS;
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        {!compact && <Label htmlFor="rejectReasonPreset">Powód odrzucenia</Label>}
        <Select
          value={reasonId || undefined}
          onValueChange={value => onReasonIdChange(value as VerificationRejectionReasonId)}
          disabled={disabled}
        >
          <SelectTrigger id="rejectReasonPreset" className={compact ? 'h-9 w-full' : 'w-full'}>
            <SelectValue placeholder="Wybierz powód odrzucenia…" />
          </SelectTrigger>
          <SelectContent>
            {reasonOptions.map(option => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {reasonId === 'other' && (
        <div className={compact ? 'space-y-1' : 'space-y-2'}>
          {!compact && <Label htmlFor="rejectReasonCustom">Szczegóły (Inne)</Label>}
          <Textarea
            id="rejectReasonCustom"
            value={customReason}
            onChange={e => onCustomReasonChange(e.target.value)}
            placeholder={compact ? 'Opisz powód odrzucenia…' : 'Opisz powód odrzucenia widoczny dla użytkownika…'}
            rows={compact ? 2 : 3}
            disabled={disabled}
            className={compact ? 'min-h-0 resize-none text-sm' : undefined}
          />
        </div>
      )}
    </div>
  );
}

export function buildRejectReasonFromFields(
  reasonId: VerificationRejectionReasonId | '',
  customReason: string,
  documentPrefill: string
): string | null {
  if (reasonId) {
    if (reasonId === 'other' && !customReason.trim()) {
      return null;
    }
    const formatted = formatVerificationRejectionReason(reasonId, customReason);
    if (documentPrefill.trim()) {
      return `${formatted}\n\n${documentPrefill.trim()}`;
    }
    return formatted;
  }
  if (documentPrefill.trim()) {
    return documentPrefill.trim();
  }
  return null;
}
