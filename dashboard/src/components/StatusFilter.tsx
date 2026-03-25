"use client";

import { useRouter } from "next/navigation";

export function StatusFilter({ currentStatus, currentQuery }: { currentStatus: string, currentQuery: string }) {
  const router = useRouter();

  return (
    <select 
      name="status"
      defaultValue={currentStatus}
      className="bg-transparent text-sm text-slate-300 py-1 pr-6 cursor-pointer focus:outline-none appearance-none font-medium"
      onChange={(e) => {
        router.push(`/leads?status=${e.target.value}${currentQuery ? `&q=${currentQuery}` : ''}`);
      }}
    >
      <option value="" className="bg-slate-900">All Statuses</option>
      <option value="NEW" className="bg-slate-900">New</option>
      <option value="CONTACTED" className="bg-slate-900">Contacted</option>
      <option value="QUALIFIED" className="bg-slate-900">Qualified</option>
      <option value="REJECTED" className="bg-slate-900">Rejected</option>
    </select>
  );
}
