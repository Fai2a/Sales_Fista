import { StatsBar } from '@/components/StatsBar';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { ArrowRight, MapPin, Building2, ExternalLink } from 'lucide-react';

export default async function DashboardHome() {
  const recentLeads = await prisma.lead.findMany({
    orderBy: { savedAt: 'desc' },
    take: 6,
  });

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-white font-heading tracking-tight mb-2">Dashboard Overview</h1>
        <p className="text-slate-400 text-lg">Your high-level metrics and latest parsed prospects.</p>
      </header>

      <StatsBar />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-2xl font-bold text-white font-heading">Recently Added Members</h2>
             <Link href="/leads" className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
               View All <ArrowRight className="w-4 h-4" />
             </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="group bg-[#0f1623]/60 backdrop-blur-sm border border-[#1e2d45] rounded-2xl p-5 hover:bg-[#151e2e]/80 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md group-hover:bg-blue-500/40 transition-all"></div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lead.photoUrl || 'https://via.placeholder.com/150'} alt={lead.name} className="w-16 h-16 rounded-full border-2 border-[#1e2d45] object-cover relative z-10" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white font-heading truncate">{lead.name}</h3>
                    <p className="text-sm text-blue-400 font-medium truncate mb-2">{lead.designation}</p>
                    
                    <div className="flex flex-col gap-1 mt-2">
                       {lead.company && (
                         <div className="flex items-center gap-2 text-xs text-slate-400">
                           <Building2 className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{lead.company}</span>
                         </div>
                       )}
                       {lead.location && (
                         <div className="flex items-center gap-2 text-xs text-slate-400">
                           <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{lead.location}</span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 pt-4 border-t border-[#1e2d45] flex items-center justify-between">
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                      lead.status === 'NEW' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      lead.status === 'CONTACTED' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      lead.status === 'QUALIFIED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {lead.status}
                  </span>
                  
                  {lead.profileUrl && (
                    <a href={lead.profileUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors" title="Open LinkedIn">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}

            {recentLeads.length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed border-[#1e2d45] rounded-2xl bg-[#0f1623]/30">
                <p className="text-slate-400">No leads parsed yet. Use the extension on LinkedIn to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Placeholder for Activity Feed / Sidebar in home */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white font-heading">Recent Activity</h2>
          <div className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-6 h-[500px] flex items-center justify-center">
             <p className="text-sm text-slate-500 text-center px-8">Activity feed module will appear here showing notes added and status changes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
