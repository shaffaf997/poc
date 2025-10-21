"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fabricFormSchema, FabricFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

type FabricRow = {
  id: string;
  sku: string;
  name: string;
  color: string;
  composition: string;
  widthCm: number;
  stockQty: number;
  price: number;
};

type FabricsClientProps = {
  fabrics: FabricRow[];
};

export function FabricsClient({ fabrics }: FabricsClientProps) {
  const [items, setItems] = useState<FabricRow[]>(fabrics);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FabricRow | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const form = useForm<FabricFormValues>({
    resolver: zodResolver(fabricFormSchema),
    defaultValues: {
      sku: "",
      name: "",
      color: "",
      composition: "",
      widthCm: 150,
      stockQty: 0,
      price: 0,
    },
  });

  const openDialog = (fabric?: FabricRow) => {
    if (fabric) {
      setEditing(fabric);
      form.reset({ ...fabric });
    } else {
      setEditing(null);
      form.reset({
        sku: "",
        name: "",
        color: "",
        composition: "",
        widthCm: 150,
        stockQty: 0,
        price: 0,
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = form.handleSubmit((values) => {
    setMessage("");
    startTransition(async () => {
      const method = editing ? "PATCH" : "POST";
      const payload = editing ? { ...values, id: editing.id } : values;
      const response = await fetch("/api/fabrics", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        setMessage(error.error ?? "Unable to save fabric");
        return;
      }

      const result = await response.json();
      const formatted: FabricRow = {
        id: result.id,
        sku: result.sku,
        name: result.name,
        color: result.color,
        composition: result.composition,
        widthCm: result.widthCm,
        stockQty: result.stockQty,
        price: Number(result.price),
      };

      setItems((prev) => {
        const exists = prev.some((item) => item.id === formatted.id);
        if (exists) {
          return prev.map((item) => (item.id === formatted.id ? formatted : item));
        }
        return [...prev, formatted].sort((a, b) => a.name.localeCompare(b.name));
      });

      setDialogOpen(false);
      setMessage(editing ? "Fabric updated." : "Fabric added.");
    });
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Fabrics</h1>
          <p className="text-sm text-muted-foreground">Track catalog, cost and stock across warehouses.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>New Fabric</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Update Fabric" : "Add Fabric"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-3">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="composition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Composition</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="widthCm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stockQty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Qty</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (QAR)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Composition</TableHead>
              <TableHead>Width</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Price</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  No fabrics recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((fabric) => (
                <TableRow key={fabric.id}>
                  <TableCell className="font-medium">{fabric.sku}</TableCell>
                  <TableCell>{fabric.name}</TableCell>
                  <TableCell>{fabric.color}</TableCell>
                  <TableCell>{fabric.composition}</TableCell>
                  <TableCell>{fabric.widthCm}</TableCell>
                  <TableCell>{fabric.stockQty}</TableCell>
                  <TableCell>{formatCurrency(fabric.price)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openDialog(fabric)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
