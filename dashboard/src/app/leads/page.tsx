"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, FileDown, Plus, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { StatusFilter } from '@/components/StatusFilter';
import { DeleteLeadButton } from '@/components/DeleteLeadButton';

interface Lead {
  id: string;
  name: string;
  headline?: string;
  company?: string;
  city?: string;
  location?: string;
  designation?: string;
  email?: string;
  phone?: string;
  saved_at: string;
  linkedin_url?: string;
  status?: string;
  notes?: string;
  connectionCount?: string;
  skills?: string;
}

export default function LeadsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string }
}) {
  const query = searchParams?.q || '';
  const statusFilter = searchParams?.status || '';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("Fetching leads for dashboard...");
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (statusFilter) params.append('status', statusFilter);
    
    fetch(`/api/leads?${params.toString()}`)
      .then(res => res.json())
      .then(json => setLeads(json.data || []))
      .catch(err => console.error("Error fetching dashboard leads:", err))
      .finally(() => setIsLoading(false));
  }, [query, statusFilter]);

  const handleExportCSV = () => {
    if (leads.length === 0) {
      alert("No leads to export.");
      return;
    }

    const headers = [
      "Name", "Headline", "Designation", "Company", "Location", "City", 
      "Email", "Phone", "LinkedIn URL", "Status", "Connections", "Saved At", "Notes"
    ];

    const csvRows = leads.map(lead => [
      `"${(lead.name || "").replace(/"/g, '""')}"`,
      `"${(lead.headline || "").replace(/"/g, '""')}"`,
      `"${(lead.designation || "").replace(/"/g, '""')}"`,
      `"${(lead.company || "").replace(/"/g, '""')}"`,
      `"${(lead.location || "").replace(/"/g, '""')}"`,
      `"${(lead.city || "").replace(/"/g, '""')}"`,
      `"${(lead.email || "").replace(/"/g, '""')}"`,
      `"${(lead.phone || "").replace(/"/g, '""')}"`,
      `"${(lead.linkedin_url || "").replace(/"/g, '""')}"`,
      `"${(lead.status || "NEW").replace(/"/g, '""')}"`,
      `"${(lead.connectionCount || "").replace(/"/g, '""')}"`,
      `"${new Date(lead.saved_at).toLocaleString()}"`,
      `"${(lead.notes || "").replace(/"/g, '""')}"`
    ].join(","));

    // Add BOM (\uFEFF) to ensure Excel opens with UTF-8 encoding
    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white font-heading tracking-tight mb-2">Vault Leads</h1>
          <p className="text-slate-400">Manage, qualify, and engage your parsed LinkedIn prospects.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-800 border border-[#1e2d45] transition-colors flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" /> Export CSV
          </button>
          <button className="px-4 py-2 rounded-xl text-sm font-bold text-navy bg-gradient-to-r from-gold to-yellow-600 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all flex items-center gap-2">
             <Plus className="w-4 h-4" /> New Lead
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-t-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form className="relative w-full sm:max-w-md" action="/leads">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            name="q"
            defaultValue={query}
            placeholder="Search by name, company, or designation..." 
            className="w-full bg-slate-900/50 border border-[#1e2d45] rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </form>

       <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-2 bg-slate-900/50 border border-[#1e2d45] rounded-xl px-2 py-1">
             <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
             <StatusFilter currentStatus={statusFilter} currentQuery={query} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f1623]/80 backdrop-blur-md border border-t-0 border-[#1e2d45] rounded-b-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d45] bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Headline</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4 text-center">Location</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Saved</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2d45]/50">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <p className="text-sm font-medium">Fetching leads for dashboard...</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && leads.map((lead: Lead, index: number) => (
                <tr 
                  key={lead.id} 
                  className="hover:bg-blue-500/5 transition-colors group"
                  style={{ animationDelay: `${index * 50}ms`, animation: 'fade-in-up 0.5s ease-out forwards', opacity: 0 }}
                >
                  <td className="px-6 py-4">
                    <Link href={`/leads/${lead.id}`} className="font-bold text-white hover:text-blue-400 text-sm transition-colors block whitespace-nowrap">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300 italic max-w-[180px] truncate">{lead.headline || '—'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-300">{lead.company || <span className="text-slate-600">—</span>}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <MapPin className="w-3.5 h-3.5 text-slate-600" />
                      <span className="truncate max-w-[140px]">{lead.city || lead.location || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 max-w-[140px] truncate">{lead.designation || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 max-w-[130px] truncate">{lead.email || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">{lead.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                    {format(new Date(lead.saved_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <Link href={`/leads/${lead.id}`} className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors uppercase tracking-tight">Edit</Link>
                      <DeleteLeadButton leadId={lead.id} />
                      <Link href={`/leads/${lead.id}`} className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors uppercase tracking-tight">View</Link>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && leads.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <Search className="w-8 h-8 text-slate-600 mb-2" />
                       <p className="font-medium text-slate-300">No leads found</p>
                       <p className="text-sm">Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination Placeholder */}
      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
         <p>Showing <span className="text-white font-medium">{leads.length}</span> results</p>
         <div className="flex items-center gap-2">
           <button disabled className="px-3 py-1 rounded-md bg-[#0f1623] border border-[#1e2d45] opacity-50 cursor-not-allowed">Previous</button>
           <button disabled className="px-3 py-1 rounded-md bg-[#0f1623] border border-[#1e2d45] opacity-50 cursor-not-allowed">Next</button>
         </div>
      </div>
    </div>
  );
}
