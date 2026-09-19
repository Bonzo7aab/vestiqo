import { Loader2 } from 'lucide-react';
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
import type { ManagedHousingUiCopy } from '../../lib/profile/account-role-labels';
import type { ManagedHousingWorkspace } from './useManagedHousingWorkspace';

interface HousingAddChildDialogProps {
  copy: ManagedHousingUiCopy;
  workspace: ManagedHousingWorkspace;
}

export function HousingAddChildDialog({ copy, workspace }: HousingAddChildDialogProps) {
  const {
    isAddBuildingOpen,
    setIsAddBuildingOpen,
    newBuildingName,
    setNewBuildingName,
    isSubmitting,
    handleCreateBuilding,
  } = workspace;

  return (
    <Dialog open={isAddBuildingOpen} onOpenChange={setIsAddBuildingOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.addChildDialogTitle}</DialogTitle>
          <DialogDescription>{copy.addChildDialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="new-building-name">{copy.addChildNameLabel}</Label>
          <Input
            id="new-building-name"
            value={newBuildingName}
            onChange={(e) => setNewBuildingName(e.target.value)}
            placeholder={copy.addChildNamePlaceholder}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAddBuildingOpen(false)}
            disabled={isSubmitting}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={() => void handleCreateBuilding()}
            disabled={isSubmitting || !newBuildingName.trim()}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
