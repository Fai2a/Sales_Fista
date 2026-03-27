'use client';

export function StatusUpdater({ leadId, initialStatus }: { leadId: string, initialStatus: string }) {
  return (
    <div className="relative border border-[#1e2d45] rounded-xl bg-slate-900/50 flex min-w-[140px]">
      <select 
        className={`appearance-none bg-transparent py-2.5 pl-4 pr-10 text-sm font-bold uppercase tracking-wider focus:outline-none cursor-pointer rounded-xl transition-colors w-full ${
          initialStatus === 'NEW' ? 'text-blue-400' :
          initialStatus === 'CONTACTED' ? 'text-yellow-400' :
          initialStatus === 'QUALIFIED' ? 'text-green-400' : 'text-red-400'
        }`}
        defaultValue={initialStatus}
        onChange={(e) => {
          fetch(`/api/leads/${leadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: e.target.value })
          }).then(() => window.location.reload());
        }}
      >
        <option value="NEW" className="bg-slate-900 text-blue-400">New</option>
        <option value="CONTACTED" className="bg-slate-900 text-yellow-400">Contacted</option>
        <option value="QUALIFIED" className="bg-slate-900 text-green-400">Qualified</option>
        <option value="REJECTED" className="bg-slate-900 text-red-400">Rejected</option>
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  );
}
