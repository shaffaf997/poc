"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  MeasurementFormValues,
  measurementFormSchema,
  fitOptions,
  collarOptions,
} from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

type CustomerOption = {
  id: string;
  name: string;
  phone: string;
};

type MeasurementFormProps = {
  customers: CustomerOption[];
};

const measurementFields = [
  { key: "neck", label: "Neck" },
  { key: "shoulder", label: "Shoulder" },
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hip", label: "Hip" },
  { key: "arm_len_right", label: "Arm Length (Right)" },
  { key: "arm_len_left", label: "Arm Length (Left)" },
  { key: "wrist", label: "Wrist" },
  { key: "front_len", label: "Front Length" },
  { key: "back_len", label: "Back Length" },
  { key: "yoke", label: "Yoke" },
  { key: "placket_depth", label: "Placket Depth" },
  { key: "sleeve_opening", label: "Sleeve Opening" },
  { key: "side_slit", label: "Side Slit" },
] as const;

export function MeasurementForm({ customers }: MeasurementFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [createdProfile, setCreatedProfile] = useState<{ id: string; customerId: string } | null>(null);

  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: {
      customerId: customers[0]?.id ?? "",
      garmentType: "THAWB",
      takenByName: "",
      data: {
        garment: "THAWB",
        unit: "cm",
        fit: "Classic",
        fields: {
          neck: 42,
          shoulder: 48,
          chest: 108,
          waist: 102,
          hip: 108,
          arm_len_right: 60,
          arm_len_left: 60,
          wrist: 22,
          front_len: 140,
          back_len: 142,
          yoke: 45,
          placket_depth: 25,
          collar_type: "Omani",
          sleeve_opening: 20,
          side_slit: 25,
        },
        tolerance: { default: 1 },
        notes: "",
      },
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/measurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            data: {
              ...values.data,
              fields: {
                ...values.data.fields,
                collar_type: values.data.fields.collar_type,
              },
            },
          }),
        });

        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "Unable to save measurement");
        }

        const payload = await response.json();
        setCreatedProfile({ id: payload.id, customerId: values.customerId });
        setMessage("Measurement profile saved.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unexpected error.");
      }
    });
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">New Measurement Profile</h1>
        <p className="text-sm text-muted-foreground">
          Capture thawb measurements and keep them attached to the customer for future orders.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Measurement Details</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}  -  {customer.phone}
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
                  name="takenByName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taken By</FormLabel>
                      <FormControl>
                        <Input placeholder="Staff name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="data.fit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fitOptions.map((fit) => (
                            <SelectItem key={fit} value={fit}>
                              {fit}
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
                  name="data.fields.collar_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collar</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {collarOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {measurementFields.map((fieldConfig) => (
                  <FormField
                    key={fieldConfig.key}
                    control={form.control}
                    // @ts-expect-error compound path
                    name={`data.fields.${fieldConfig.key}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{fieldConfig.label} (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <FormField
                  control={form.control}
                  name="data.tolerance.default"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tolerance (cm)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="data.notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Add special requests..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
              {createdProfile ? (
                <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm">
                  Measurement saved.{" "}
                  <Link
                    href={`/work-orders/new?customerId=${createdProfile.customerId}&measurementId=${createdProfile.id}`}
                    className="font-medium underline"
                  >
                    Create work order with this profile
                  </Link>
                  .
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Measurement"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
