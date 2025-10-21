
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Status } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { shipmentFormSchema, ShipmentFormValues } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type BranchOption = {
  id: string;
  name: string;
  area: string;
};

type OrderOption = {
  id: string;
  code: string;
  branch: string;
  status: Status;
};

type ShipmentDisplay = {
  id: string;
  date: string;
  fromBranch: string;
  toBranch: string;
  notes: string;
  scans: {
    id: string;
    direction: string;
    workOrderCode: string;
    scannedByName: string;
    scannedAt: string;
  }[];
};

type ShipmentsClientProps = {
  branches: BranchOption[];
  orders: OrderOption[];
  shipments: ShipmentDisplay[];
};

export function ShipmentsClient({ branches, orders, shipments }: ShipmentsClientProps) {
  const router = useRouter();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentFormSchema),
    defaultValues: {
      fromBranchId: branches[0]?.id ?? "",
      toBranchId: branches[1]?.id ?? "",
      notes: "",
      orderIds: [],
    },
  });

  const toggleOrder = (orderId: string) => {
    setSelectedOrders((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]));
  };

  const onSubmit = form.handleSubmit((values) => {
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, orderIds: selectedOrders }),
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "Unable to create shipment");
        }
        form.reset({
          fromBranchId: branches[0]?.id ?? "",
          toBranchId: branches[1]?.id ?? "",
          orderIds: [],
          notes: "",
        });
        setSelectedOrders([]);
        router.refresh();
        setMessage("Shipment created.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unexpected error while creating shipment.");
      }
    });
  });

  const scanOrder = (shipmentId: string, direction: "OUT" | "IN", code: string, scannedByName: string) => {
    startTransition(async () => {
      try {
        const orderResponse = await fetch(`/api/work-orders?code=${code}`);
        if (!orderResponse.ok) {
          throw new Error("Order not found");
        }
        const order = await orderResponse.json();
        const response = await fetch("/api/shipments/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shipmentId,
            workOrderId: order.id,
            direction,
            scannedByName,
          }),
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "Unable to record scan");
        }
        router.refresh();
        setMessage("Scan recorded.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to record scan.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Shipments</h1>
        <p className="text-sm text-muted-foreground">Coordinate inter-branch transfers and record in/out scans.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create Shipment</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fromBranchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Factory" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} - {branch.area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toBranchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Destination branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} - {branch.area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Driver, vehicle, remarks..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <p className="text-sm font-semibold">Orders</p>
                <div className="grid gap-2 max-h-56 overflow-y-auto rounded-md border p-3">
                  {orders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No eligible orders available.</p>
                  ) : (
                    orders.map((order) => (
                      <label key={order.id} className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={selectedOrders.includes(order.id)} onCheckedChange={() => toggleOrder(order.id)} />
                          <span className="font-medium">{order.code}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {order.branch} - {order.status.replace(/_/g, " ")}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={isPending || selectedOrders.length === 0}>
                {isPending ? "Creating..." : "Create Shipment"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Shipments</h2>
        {shipments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shipments have been created yet.</p>
        ) : (
          shipments.map((shipment) => (
            <Card key={shipment.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {shipment.fromBranch} {"->"} {shipment.toBranch}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{formatDate(shipment.date)}</p>
                </div>
                <Badge variant="secondary">{shipment.scans.length} scans</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {shipment.notes ? <p className="text-sm text-muted-foreground">{shipment.notes}</p> : null}
                <div className="grid gap-2 md:grid-cols-2">
                  <ScanForm shipmentId={shipment.id} direction="OUT" onScan={scanOrder} />
                  <ScanForm shipmentId={shipment.id} direction="IN" onScan={scanOrder} />
                </div>
                {shipment.scans.length ? (
                  <div className="space-y-2">
                    {shipment.scans.map((scan) => (
                      <div key={scan.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span>
                          {scan.direction} - {scan.workOrderCode}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {scan.scannedByName} - {formatDate(scan.scannedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No scans recorded yet.</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

type ScanFormProps = {
  shipmentId: string;
  direction: "OUT" | "IN";
  onScan: (shipmentId: string, direction: "OUT" | "IN", code: string, scannedByName: string) => void;
};

function ScanForm({ shipmentId, direction, onScan }: ScanFormProps) {
  const [code, setCode] = useState("");
  const [scannedBy, setScannedBy] = useState("");

  return (
    <div className="rounded-md border p-3 space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{direction === "OUT" ? "Scan Out" : "Scan In"}</p>
      <Input placeholder="Order code" value={code} onChange={(event) => setCode(event.target.value)} />
      <Input placeholder="Scanned by" value={scannedBy} onChange={(event) => setScannedBy(event.target.value)} />
      <Button
        type="button"
        size="sm"
        onClick={() => {
          if (!code || !scannedBy) return;
          onScan(shipmentId, direction, code, scannedBy);
          setCode("");
          setScannedBy("");
        }}
      >
        Record {direction}
      </Button>
    </div>
  );
}
