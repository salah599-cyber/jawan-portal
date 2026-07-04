"use client";

import { useState } from "react";
import type { SuccessionAppointmentInput } from "@/lib/actions/succession";
import { SUCCESSION_APPOINTMENT_ROLE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type MemberOption = { id: string; fullName: string };

const emptyAppointment = (): SuccessionAppointmentInput => ({
  familyMemberId: "",
  role: "EXECUTOR",
  isPrimary: false,
  notes: "",
});

export function SuccessionAppointmentsFields({
  initialAppointments = [],
  members,
  appointmentsJsonName = "appointmentsJson",
}: {
  initialAppointments?: SuccessionAppointmentInput[];
  members: MemberOption[];
  appointmentsJsonName?: string;
}) {
  const [appointments, setAppointments] = useState<SuccessionAppointmentInput[]>(initialAppointments);

  const serialized = JSON.stringify(appointments.filter((a) => a.familyMemberId?.trim()));

  return (
    <div className="space-y-4">
      <input type="hidden" name={appointmentsJsonName} value={serialized} readOnly />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">Executors & Trustees</p>
        <Button type="button" variant="outline" size="sm" onClick={() => setAppointments((c) => [...c, emptyAppointment()])}>
          Add appointment
        </Button>
      </div>
      {appointments.map((appt, index) => (
        <div key={index} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <p className="text-sm font-medium">Appointment {index + 1}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAppointments((c) => c.filter((_, i) => i !== index))}>
              Remove
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Family Member</Label>
            <Select
              value={appt.familyMemberId}
              onValueChange={(v) => setAppointments((c) => c.map((a, i) => i === index ? { ...a, familyMemberId: v } : a))}
            >
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={appt.role}
              onValueChange={(v) => setAppointments((c) => c.map((a, i) => i === index ? { ...a, role: v } : a))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SUCCESSION_APPOINTMENT_ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              className="size-4"
              checked={appt.isPrimary === true}
              onChange={(e) =>
                setAppointments((c) => c.map((a, i) => i === index ? { ...a, isPrimary: e.target.checked } : a))
              }
            />
            <Label>Primary appointment for this role</Label>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={appt.notes ?? ""}
              onChange={(e) => setAppointments((c) => c.map((a, i) => i === index ? { ...a, notes: e.target.value } : a))}
              rows={2}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
