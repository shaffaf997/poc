"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Status } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { paymentFormSchema } from "@/lib/validations";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentFormValues } from "@/lib/validations";

type AdvanceStageProps = {
  workOrderId: string;
  currentStatus: Status;
  options: Status[];
};

export function AdvanceStage({ workOrderId, currentStatus, options }: AdvanceStageProps) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(options[0] ?? null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const moveStage = () => {
    if (!nextStatus) return;
    startTransition(async () => {
      try {
        const response = await fetch("/api/production/move-stage", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workOrderId,
            toStage: nextStatus,
          }),
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "Unable to move stage");
        }
        router.refresh();
        setMessage("Stage updated.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unexpected error.");
      }
    });
  };

  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No further transitions available from <strong>{currentStatus.replace(/_/g, " ")}</strong>.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={nextStatus ?? undefined} onValueChange={(value) => setNextStatus(value as Status)}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Pick next stage" />
        </SelectTrigger>
        <SelectContent>
          {options.map((status) => (
            <SelectItem key={status} value={status}>
              {status.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={moveStage} disabled={isPending || !nextStatus}>
        {isPending ? "Updating..." : "Move to Next Stage"}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}

type AddPaymentProps = {
  workOrderId: string;
};

export function AddPayment({ workOrderId }: AddPaymentProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      method: "CASH",
      txnRef: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/work-orders/${workOrderId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "Unable to add payment");
        }
        form.reset();
        setOpen(false);
        router.refresh();
      } catch (error) {
        form.setError("amount", {
          message: error instanceof Error ? error.message : "Unable to add payment",
        });
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add Payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="txnRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional reference" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
