import { Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  AddStaffButton,
  EditStaffButton,
  type StaffRecord,
} from "@/components/staff/staff-dialogs";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/session";

export const metadata = { title: "Staff" };

interface StaffRow {
  id: string;
  full_name: string;
  designation: string;
  monthly_salary: string;
  phone: string | null;
  joined_on: string;
  is_active: boolean;
}

export default async function StaffPage() {
  // Hiding the sidebar link is tidiness, not access control: without this a
  // staff member who types the URL reaches the page. Salaries are on it.
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .select(
      "id, full_name, designation, monthly_salary, phone, joined_on, is_active",
    )
    .order("is_active", { ascending: false })
    .order("monthly_salary", { ascending: false });

  const staff = (data ?? []) as StaffRow[];
  const working = staff.filter((person) => person.is_active);
  const monthlyBill = working.reduce(
    (sum, person) => sum + Number(person.monthly_salary),
    0,
  );

  return (
    <>
      <PageHeader
        title="Staff"
        description="Everyone on the payroll, and the salary each one is paid."
        actions={<AddStaffButton />}
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-destructive/12 px-3 py-2.5 text-base text-destructive"
          >
            Could not load the staff list: {error.message}
          </p>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <Users className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-base font-medium">No staff recorded yet.</p>
            <p className="text-base text-muted-foreground">
              Use “Add staff member” above to build the payroll.
            </p>
          </div>
        ) : (
          <>
            <p className="text-base text-muted-foreground">
              {working.length} working ·{" "}
              <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">
                {formatPKR(monthlyBill)}
              </span>{" "}
              a month in agreed salaries
            </p>

            {/* min-w-0 keeps the table scrolling inside its own card rather
                than dragging the page sideways; relative keeps the hidden
                Actions label clipped here instead of escaping to the
                document. */}
            <div className="relative min-w-0 overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[46rem] border-collapse text-base">
                <caption className="sr-only">Staff on the payroll</caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Designation
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Phone
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Joined
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-medium"
                    >
                      Monthly salary
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((person) => (
                    <tr
                      key={person.id}
                      className="border-b border-border/60 last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">{person.full_name}</span>
                        {/* The word carries it, not a colour. */}
                        {person.is_active ? null : (
                          <Badge variant="neutral" className="ml-2 text-sm">
                            Left
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {person.designation}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                        {person.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                        {person.joined_on}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                        {formatPKR(Number(person.monthly_salary))}
                      </td>
                      <td className="px-4 py-3">
                        <EditStaffButton
                          staff={
                            {
                              id: person.id,
                              fullName: person.full_name,
                              designation: person.designation,
                              monthlySalary: Number(person.monthly_salary),
                              phone: person.phone,
                              joinedOn: person.joined_on,
                              isActive: person.is_active,
                            } satisfies StaffRecord
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-muted-foreground">
              The agreed salary is what the monthly salary run fills in. Marking
              someone as having left keeps their record and their past payments,
              and takes them out of the run.
            </p>
          </>
        )}
      </div>
    </>
  );
}
