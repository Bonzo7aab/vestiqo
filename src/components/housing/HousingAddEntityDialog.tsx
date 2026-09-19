import { Check, Loader2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { GusNipStatusHint } from '../gus/GusNipStatusHint';
import { cn } from '../ui/utils';
import type { ManagedHousingUiCopy } from '../../lib/profile/account-role-labels';
import type { ManagedHousingWorkspace } from './useManagedHousingWorkspace';

interface HousingAddEntityDialogProps {
  copy: ManagedHousingUiCopy;
  workspace: ManagedHousingWorkspace;
  description: string;
  nipLabel: string;
}

export function HousingAddEntityDialog({
  copy,
  workspace,
  description,
  nipLabel,
}: HousingAddEntityDialogProps) {
  const {
    isAddDialogOpen,
    closeAddDialog,
    formData,
    setFormData,
    gusLookup,
    previewFields,
    isSubmitting,
    handleCreate,
  } = workspace;

  return (
    <Dialog open={isAddDialogOpen} onOpenChange={(open) => !open && closeAddDialog()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.addEntity}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="entity-nip">{nipLabel}</Label>
            <div className="relative">
              <Input
                id="entity-nip"
                value={formData.nip}
                onChange={(e) => {
                  if (gusLookup.isLoading) return;
                  gusLookup.handleNipChange(e.target.value, (next) =>
                    setFormData((prev) => ({ ...prev, nip: next })),
                  );
                }}
                placeholder="0000000000"
                inputMode="numeric"
                disabled={gusLookup.isLoading || isSubmitting}
                aria-busy={gusLookup.isLoading}
                className={cn(gusLookup.isLoading && 'pr-10 opacity-80')}
              />
              {gusLookup.isLoading ? (
                <Loader2
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary"
                  aria-hidden
                />
              ) : null}
            </div>
            <GusNipStatusHint
              status={gusLookup.status}
              message={gusLookup.message}
              validationError={gusLookup.validationError}
            />
          </div>

          {gusLookup.isLoading ? (
            <div className="space-y-3 rounded-lg border bg-muted/40 p-4" aria-hidden>
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="grid grid-cols-3 gap-2">
                  <div className="h-3 animate-pulse rounded bg-muted" />
                  <div className="col-span-2 h-3 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : formData.name ? (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Dane z rejestru GUS
              </p>
              {previewFields.map((field) => (
                <div key={field.label} className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">{field.label}</span>
                  <span className="col-span-2 font-medium">{field.value || '—'}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeAddDialog} disabled={isSubmitting}>
            <X className="mr-2 h-4 w-4" />
            Anuluj
          </Button>
          <Button
            onClick={() => void handleCreate()}
            disabled={isSubmitting || gusLookup.status === 'loading' || !formData.name.trim()}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
