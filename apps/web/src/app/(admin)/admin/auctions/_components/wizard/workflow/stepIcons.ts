import {
  ClipboardList,
  CreditCard,
  FileText,
  Landmark,
  SquarePen,
  type LucideIcon,
} from 'lucide-react';
import type { WorkflowStepType } from '@repo/api';

export const STEP_ICON: Record<WorkflowStepType, LucideIcon> = {
  TNC_FORM_STEP: FileText,
  PARTICIPATION_FORM_STEP: ClipboardList,
  FORM_STEP: SquarePen,
  BANK_DETAIL_FORM_STEP: Landmark,
  PAYMENT_STEP: CreditCard,
};
