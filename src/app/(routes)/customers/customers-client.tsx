"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerFormSchema, CustomerFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  altPhone?: string | null;
  preferredLang?: string;
  defaultBranch?: string;
};

type BranchOption = {
  id: string;
  name: string;
  area: string;
};

type CustomersClientProps = {
  initialCustomers: CustomerRow[];
  branches: BranchOption[];
};

export function CustomersClient({ initialCustomers, branches }: CustomersClientProps) {
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      altPhone: "",
      preferredLang: "",
      defaultBranchId: "",
    },
  });

  const filteredCustomers = useMemo(() => {
    const lower = search.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(lower) ||
        customer.phone.toLowerCase().includes(lower) ||
        (customer.altPhone ?? "").toLowerCase().includes(lower),
    );
  }, [customers, search]);

  const refreshCustomers = useCallback(async (query?: string) => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    const response = await fetch(`/api/customers?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to fetch customers");
    }
    const data = await response.json();
    setCustomers(data);
  }, []);

  const onSubmit = form.handleSubmit((values) => {
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
        form.reset();
        setDialogOpen(false);
        setMessage("Customer created successfully.");
        await refreshCustomers(search);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unexpected error");
      }
    });
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">Search and register tailoring customers across all branches.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>New Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+974..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="altPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alt. Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="preferredLang"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Language</FormLabel>
                      <FormControl>
                        <Input placeholder="English / Arabic / ..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultBranchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Branch</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} · {branch.area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(event) => {
            const value = event.target.value;
            setSearch(value);
            startTransition(() => refreshCustomers(value).catch((error) => setMessage(error.message)));
          }}
        />
        {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Alt. Phone</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Preferred Language</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No customers match the search.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.altPhone ?? "—"}</TableCell>
                  <TableCell>{customer.defaultBranch ?? "—"}</TableCell>
                  <TableCell>{customer.preferredLang ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
