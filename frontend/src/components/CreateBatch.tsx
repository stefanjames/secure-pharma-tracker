import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { addToast } from "@/hooks/useToast";
import { parseContractError } from "@/lib/contract";

interface CreateBatchProps {
  onCreateBatch: (drugName: string) => Promise<unknown>;
  txPending: boolean;
}

export function CreateBatch({ onCreateBatch, txPending }: CreateBatchProps) {
  const [drugName, setDrugName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = drugName.trim();
    if (!name) return;
    try {
      await onCreateBatch(name);
      addToast(`Batch created for "${name}"`, "success");
      setDrugName("");
    } catch (err) {
      addToast(parseContractError(err), "error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5 text-blue-400" />
          Create Batch
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Drug Name
            </label>
            <Input
              placeholder="e.g. Aspirin 500mg"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              disabled={txPending}
            />
          </div>
          <Button
            type="submit"
            disabled={txPending || !drugName.trim()}
            className="w-full"
          >
            {txPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Register New Batch"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
