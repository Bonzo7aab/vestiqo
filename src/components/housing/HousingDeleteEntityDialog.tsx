import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { cn } from '../ui/utils';
import type { ManagedHousingUiCopy } from '../../lib/profile/account-role-labels';
import type { ManagedHousingWorkspace } from './useManagedHousingWorkspace';

interface HousingDeleteEntityDialogProps {
  copy: ManagedHousingUiCopy;
  workspace: ManagedHousingWorkspace;
  includeChildren: boolean;
}

export function HousingDeleteEntityDialog({
  copy,
  workspace,
  includeChildren,
}: HousingDeleteEntityDialogProps) {
  const { isDeleteDialogOpen, setIsDeleteDialogOpen, deletingEntity, isSubmitting, handleDelete } =
    workspace;

  const description = deletingEntity
    ? includeChildren
      ? `Czy na pewno chcesz usunąć „${deletingEntity.name}" ${copy.deleteEntityConfirmWithChildren}? Ta operacja jest nieodwracalna.`
      : `Czy na pewno chcesz usunąć „${deletingEntity.name}" z listy? Ta operacja jest nieodwracalna.`
    : '';

  return (
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.deleteEntityConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={isSubmitting}
            className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Usuń'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
