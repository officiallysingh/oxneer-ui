import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  cn,
} from '@oxneer/ui';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  /** `default` for a confirmation that isn't destructive, e.g. publishing. */
  tone?: 'destructive' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  open,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  tone = 'destructive',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const destructive = tone === 'destructive';
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                destructive ? 'bg-destructive/10' : 'bg-primary/10',
              )}
            >
              {destructive ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <Info className="h-4 w-4 text-primary" />
              )}
            </div>
            <AlertDialogTitle className="font-display text-lg">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="font-body text-sm text-muted-foreground pl-12">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel onClick={onCancel} className="font-body">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              'font-body',
              destructive && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
