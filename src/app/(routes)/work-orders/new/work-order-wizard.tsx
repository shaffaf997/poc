"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CustomerFormValues, WorkOrderFormValues, customerFormSchema, workOrderFormSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";
import { QRCode } from "@/components/QRCode";
import { Barcode } from "@/components/Barcode";
import Link from "next/link";
import { Status } from "@prisma/client";

type CustomerOption = {
  id: string;
  name: string;
  phone: string;
};

type MeasurementOption = {
  id: string;
  customerId: string;
  customerName: string;
  garmentType: string;
  version: number;
  takenAt: string;
};

type FabricOption = {
  id: string;
  sku: string;
  name: string;
  color: string;
  price: number;
};

type BranchOption = {
  id: string;
  name: string;
  area: string;
};

type WorkOrderWizardProps = {
  customers: CustomerOption[];
  measurementProfiles: MeasurementOption[];
  fabrics: FabricOption[];
  branches: BranchOption[];
  defaults?: {
    customerId?: string;
    measurementProfileId?: string;
  };
};

type CreatedOrderInfo = {
  id: string;
  code: string;
  dueDate: string;
  status: string;
  branch: string;
  customer: string;
  total: number;
  deposit: number;
  balance: number;
};

export function WorkOrderWizard({
  customers,
  measurementProfiles,
  fabrics,
  branches,
  defaults,
}: WorkOrderWizardProps) {
  const [customersList, setCustomersList] = useState(customers);
  const [message, setMessage] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrderInfo | null>(null);
  const [isPending, startTransition] = useTransition();
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      customerId: defaults?.customerId ?? customers[0]?.id ?? "",
      branchId: branches[0]?.id ?? "",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: "NORMAL",
      deposit: 0,
      total: 0,
      notes: "",
      items: [
        {
          garmentType: "THAWB",
          measurementProfileId: defaults?.measurementProfileId ?? "",
          fabricId: fabrics[0]?.id ?? "",
          price: 0,
          optionsJson: {
            notes: "",
          },
        },
      ],
    },
  });

  const selectedCustomerId = useWatch({ control: form.control, name: "customerId" });
  const total = useWatch({ control: form.control, name: "total" });
  const deposit = useWatch({ control: form.control, name: "deposit" });

  const balance = Math.max(Number(total || 0) - Number(deposit || 0), 0);

  const measurementOptions = useMemo(
    () => measurementProfiles.filter((profile) => profile.customerId === selectedCustomerId),
    [measurementProfiles, selectedCustomerId],
  );

  useEffect(() => {
    const current = form.getValues("items")[0]?.measurementProfileId ?? "";
    if (current && measurementOptions.some((option) => option.id === current)) {
      return;
    }
    const fallback = measurementOptions[0]?.id ?? "";
    form.setValue("items.0.measurementProfileId", fallback);
  }, [form, measurementOptions]);

  useEffect(() => {
    const price = Number(total || 0);
    form.setValue("items.0.price", price, { shouldDirty: true, shouldValidate: false });
  }, [form, total]);

  const onSubmit = form.handleSubmit((values) => {
    setMessage("");
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          dueDate: values.dueDate instanceof Date ? values.dueDate.toISOString() : new Date(values.dueDate).toISOString(),
          items: values.items.map((item) => ({
            ...item,
            price: Number(item.price),
            optionsJson: item.optionsJson?.notes?.length ? item.optionsJson : undefined,
          })),
        };

        const response = await fetch("/api/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error ?? "Unable to create work order");
        }
        const created = await response.json();
        setCreatedOrder({
          id: created.id,
          code: created.code,
          dueDate: created.dueDate,
          status: created.status,
          branch: created.branch,
          customer: created.customer,
          total: created.total,
          deposit: created.deposit,
          balance: created.balance,
        });
        setMessage("Work order created successfully.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unexpected error while saving.");
      }
    });
  });

  const customerForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      altPhone: "",
      preferredLang: "",
      defaultBranchId: branches[0]?.id ?? "",
    },
  });

  const submitCustomer = customerForm.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "Unable to create customer");
        }
        const customer = await response.json();
        const newCustomer = {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
        };
        setCustomersList((prev) => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
        form.setValue("customerId", customer.id);
        setCustomerDialogOpen(false);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to add customer");
      }
    });
  });

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const newWindow = window.open("", "_blank", "width=600,height=800");
    if (!newWindow) return;
    newWindow.document.write(`<html><head><title>${createdOrder?.code ?? "Work Order"}</title></head><body>${printContents}</body></html>`);
    newWindow.document.close();
    newWindow.focus();
    newWindow.print();
    newWindow.close();
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Create Work Order</h1>
        <p className="text-sm text-muted-foreground">
          Confirm customer, measurements, fabric and payment to launch production.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="lg:col-span-1 lg:row-span-2">
          <CardHeader>
            <CardTitle>Order Setup</CardTitle>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={onSubmit}>
              <CardContent className="space-y-6">
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">1. Customer</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem className="min-w-[220px] flex-1">
                          <FormLabel>Customer</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customersList.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name} - {customer.phone}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          New Customer
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Customer</DialogTitle>
                        </DialogHeader>
                        <Form {...customerForm}>
                          <form onSubmit={submitCustomer} className="space-y-4">
                            <FormField
                              control={customerForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={customerForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={customerForm.control}
                              name="altPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Alt. Phone</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={customerForm.control}
                              name="defaultBranchId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Default Branch</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {branches.map((branch) => (
                                        <SelectItem key={branch.id} value={branch.id}>
                                          {branch.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter>
                              <Button type="submit" disabled={isPending}>
                                {isPending ? "Saving..." : "Save"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    2. Measurement Profile
                  </h2>
                  <FormField
                    control={form.control}
                    name="items.0.measurementProfileId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select measurement profile" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {measurementOptions.length === 0 ? (
                              <div className="p-3 text-xs text-muted-foreground">
                                No measurements yet.{" "}
                                <Link className="font-semibold underline" href={`/measurements/new?customerId=${selectedCustomerId}`}>
                                  Capture measurements
                                </Link>
                                .
                              </div>
                            ) : (
                              measurementOptions.map((profile) => (
                                <SelectItem key={profile.id} value={profile.id}>
                                  {profile.customerName} - v{profile.version} - {formatDate(profile.takenAt)}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">3. Garment & Fabric</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="items.0.garmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Garment</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="THAWB">Thawb</SelectItem>
                              <SelectItem value="BISHT">Bisht</SelectItem>
                              <SelectItem value="SHIRT">Shirt</SelectItem>
                              <SelectItem value="TROUSER">Trouser</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="items.0.fabricId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fabric</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select fabric" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {fabrics.map((fabric) => (
                                <SelectItem key={fabric.id} value={fabric.id}>
                                  {fabric.sku} - {fabric.name} ({formatCurrency(fabric.price)})
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
                    name="items.0.optionsJson.notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Garment Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Embroidery, collar preference, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    4. Price & Deposit
                  </h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="total"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total (QAR)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deposit (QAR)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel>Balance (auto)</FormLabel>
                      <p className="rounded-md border bg-muted px-3 py-2 text-sm font-semibold">
                        {formatCurrency(balance)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    5. Due Date & Branch
                  </h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={
                                field.value
                                  ? new Date(field.value).toISOString().slice(0, 10)
                                  : new Date().toISOString().slice(0, 10)
                              }
                              onChange={(event) => field.onChange(event.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="branchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
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
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="LOW">Low</SelectItem>
                              <SelectItem value="NORMAL">Normal</SelectItem>
                              <SelectItem value="HIGH">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">6. Notes</h2>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder="Special requests, delivery expectations..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>
                {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Work Order"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card className="lg:col-span-1 lg:row-span-2">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs uppercase text-muted-foreground">Balance Preview</p>
              <p className="text-2xl font-semibold">{formatCurrency(balance)}</p>
              <p className="text-xs text-muted-foreground">
                Total: {formatCurrency(total || 0)} - Deposit: {formatCurrency(deposit || 0)}
              </p>
            </div>
            {createdOrder ? (
              <div ref={printRef} className="space-y-4 rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Work Order</p>
                    <p className="text-lg font-semibold">{createdOrder.code}</p>
                  </div>
                  <StatusPill status={createdOrder.status as Status} />
                </div>
                <div className="grid gap-2 text-sm">
                  <p>
                    <span className="font-medium">Customer:</span> {createdOrder.customer}
                  </p>
                  <p>
                    <span className="font-medium">Branch:</span> {createdOrder.branch}
                  </p>
                  <p>
                    <span className="font-medium">Due:</span> {formatDate(createdOrder.dueDate)}
                  </p>
                  <p>
                    <span className="font-medium">Total:</span> {formatCurrency(createdOrder.total)}
                  </p>
                  <p>
                    <span className="font-medium">Deposit:</span> {formatCurrency(createdOrder.deposit)}
                  </p>
                  <p>
                    <span className="font-medium">Balance:</span> {formatCurrency(createdOrder.balance)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <QRCode value={createdOrder.code} size={96} title="Scan to open order" />
                  <Barcode value={createdOrder.code} label="Production Ticket" />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete the form to generate the order ticket with barcode and QR code.
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="button" variant="secondary" disabled={!createdOrder} onClick={handlePrint}>
              Print Ticket
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
