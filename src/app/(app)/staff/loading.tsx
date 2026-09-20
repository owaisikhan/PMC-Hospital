import { PageHeader } from "@/components/layout/page-header";
import {
  TableSkeleton,
  TableSummarySkeleton,
  type SkeletonColumn,
} from "@/components/skeletons/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const COLUMNS: SkeletonColumn[] = [
  { label: "Name", bar: "w-36" },
  { label: "Designation", bar: "w-32" },
  { label: "Phone", bar: "w-24" },
  { label: "Joined", bar: "w-20" },
  { label: "Monthly salary", bar: "w-20", align: "right" },
  { label: "Actions", bar: "w-14", hiddenLabel: true },
];

export default function StaffLoading() {
  return (
    <>
      {/* Fixed copy, so it renders for real. */}
      <PageHeader
        title="Staff"
        description="Everyone on the payroll, and the salary each one is paid."
        actions={<Skeleton className="h-11 w-48 rounded-lg" />}
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        <TableSummarySkeleton width="w-72" />
        <TableSkeleton
          columns={COLUMNS}
          minWidth="min-w-[46rem]"
          caption="Loading the staff list"
        />
      </div>
    </>
  );
}
