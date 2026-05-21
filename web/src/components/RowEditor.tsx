import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Save } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  onSave: () => void;
  onDelete?: () => void;
  saving?: boolean;
  children: ReactNode;
  isNew?: boolean;
}

export function RowEditor({ open, onOpenChange, title, subtitle, onSave, onDelete, saving, children, isNew }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {subtitle && <DialogDescription className="text-zinc-500">{subtitle}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4 py-2">{children}</div>
        <DialogFooter className="gap-2 sm:gap-2">
          {!isNew && onDelete && (
            <Button
              variant="ghost"
              className="mr-auto text-red-400 hover:text-red-300 hover:bg-red-950/30"
              onClick={onDelete}
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold">
            <Save className="size-4 mr-2" />
            {saving ? "Saving…" : isNew ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && <div className="text-xs text-zinc-600 mt-1">{hint}</div>}
    </div>
  );
}
