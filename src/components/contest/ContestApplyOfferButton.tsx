'use client';

import Link from 'next/link';
import { Button } from '../ui/button';
import { AuthPromptPopover, AUTH_PROMPT_APPLY_OFFER } from '../AuthPromptPopover';
import { VerificationRequiredApplyDialog } from '../VerificationRequiredApplyDialog';
import {
  isVerificationPendingReview,
  needsVerificationAttention,
} from '../../lib/verification/needs-verification-attention';
import type { AuthUser } from '../../types/auth';
import { cn } from '../ui/utils';
import { useState } from 'react';

export const CONTRACTOR_OFFERS_PAGE_HREF = '/panel-wykonawcy/aplikacje';

interface ContestApplyOfferButtonProps {
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoggedIn: boolean;
  user: AuthUser | null;
  hasSubmittedOffer?: boolean;
  hasDraftOffer?: boolean;
  isCheckingOffer?: boolean;
  onApply: (e: React.MouseEvent) => void;
}

export function ContestApplyOfferButton({
  className,
  size = 'default',
  isLoggedIn,
  user,
  hasSubmittedOffer = false,
  hasDraftOffer = false,
  isCheckingOffer = false,
  onApply,
}: ContestApplyOfferButtonProps) {
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const blockApply = needsVerificationAttention(user);

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (blockApply) {
      setVerificationDialogOpen(true);
      return;
    }
    onApply(e);
  };

  if (isCheckingOffer) {
    return (
      <Button type="button" className={className} size={size} disabled>
        Sprawdzanie...
      </Button>
    );
  }

  if (hasSubmittedOffer && isLoggedIn) {
    return (
      <Button
        asChild
        type="button"
        variant="outline"
        size={size}
        className={cn(
          className,
          'group border-border/60 bg-muted/45 text-muted-foreground shadow-none hover:bg-muted/65 hover:text-foreground',
        )}
      >
        <Link
          href={CONTRACTOR_OFFERS_PAGE_HREF}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="inline group-hover:hidden">Oferta złożona</span>
          <span className="hidden group-hover:inline">Moje oferty</span>
        </Link>
      </Button>
    );
  }

  if (hasDraftOffer && isLoggedIn) {
    return (
      <>
        <Button type="button" className={className} size={size} onClick={handleApplyClick}>
          Szkic
        </Button>
        <VerificationRequiredApplyDialog
          open={verificationDialogOpen}
          onOpenChange={setVerificationDialogOpen}
          ocSubmitted={isVerificationPendingReview(user)}
        />
      </>
    );
  }

  if (!isLoggedIn) {
    return (
      <div
        className="w-full sm:w-auto"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <AuthPromptPopover
          title={AUTH_PROMPT_APPLY_OFFER.title}
          description={AUTH_PROMPT_APPLY_OFFER.description}
          align="center"
        >
          <Button
            type="button"
            className={className}
            size={size}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            Złóż ofertę
          </Button>
        </AuthPromptPopover>
      </div>
    );
  }

  return (
    <>
      <Button type="button" className={className} size={size} onClick={handleApplyClick}>
        Złóż ofertę
      </Button>
      <VerificationRequiredApplyDialog
        open={verificationDialogOpen}
        onOpenChange={setVerificationDialogOpen}
        ocSubmitted={isVerificationPendingReview(user)}
      />
    </>
  );
}
