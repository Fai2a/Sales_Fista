import { BarChart3, TrendingUp, Users, Target, ArrowUpRight } from 'lucide-react';
import prisma from '@/lib/prisma';

export default async function AnalyticsPage() {
  const totalLeads = await prisma.lead.count();

  // Aggregate statuses
  const statusGroup = await prisma.lead.groupBy({
    by: ['status'],
    _count: { id: true }
  });

  const statusesMap: Record<string, number> = {};
  statusGroup.forEach(s => { statusesMap[s.status] = s._count.id });

  const contacted = statusesMap['CONTACTED'] || 0;
  const qualified = statusesMap['QUALIFIED'] || 0;
  const newLeads = statusesMap['NEW'] || 0;
  const rejected = statusesMap['REJECTED'] || 0;

  const conversionRate = totalLeads > 0 ? ((qualified / totalLeads) * 100).toFixed(1) : '0.0';
  const activeLeads = newLeads + contacted;

  const metrics = [
    { name: 'Total Leads', value: totalLeads.toString(), change: '+Active', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { name: 'Qualification Rate', value: `${conversionRate}%`, change: '+Growth', icon: Target, color: 'text-green-400', bg: 'bg-green-500/10' },
    { name: 'Active Leads', value: activeLeads.toString(), change: 'In Pipeline', icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  const locationsData = await prisma.lead.groupBy({
    by: ['city'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  });

  const locations = locationsData.filter(l => l.city).map(l => ({
    name: l.city || 'Unknown',
    value: l._count.id
  }));

  const maxLoc = locations.length > 0 ? Math.max(...locations.map(l => l.value)) : 1;

  const statuses = [
    { name: 'New', count: newLeads, color: 'bg-blue-500' },
    { name: 'Contacted', count: contacted, color: 'bg-yellow-500' },
    { name: 'Qualified', count: qualified, color: 'bg-green-500' },
    { name: 'Rejected', count: rejected, color: 'bg-red-500' },
  ];

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-white font-heading tracking-tight mb-2">Analytics</h1>
        <p className="text-slate-400 text-lg">In-depth insights into your real-time lead generation performance.</p>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.name} className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-6 hover:bg-[#151e2e]/80 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${metric.bg}`}>
                  <Icon className={`w-6 h-6 ${metric.color}`} />
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-slate-400">
                   {metric.change}
                </div>
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">{metric.name}</h3>
              <p className="text-3xl font-bold text-white font-heading">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Lead Status Breakdown */}
        <div className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white font-heading mb-6">Pipeline Breakdown</h2>
          
          <div className="space-y-6">
            {statuses.map((status) => {
              const percentage = totalLeads > 0 ? Math.round((status.count / totalLeads) * 100) : 0;
              return (
                <div key={status.name}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-white">{status.name}</span>
                    <span className="text-slate-400">{status.count} ({percentage}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${status.color} rounded-full transition-all duration-1000 ease-out`} 
                      style={{ width: '0%', animation: 'fill-bar 1s ease-out forwards', animationDelay: '0.2s' }}
                    >
                      <style>{`
                        @keyframes fill-bar {
                          to { width: ${percentage}%; }
                        }
                      `}</style>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Locations */}
        <div className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white font-heading mb-6">Top Locations</h2>
          <div className="space-y-6">
            {locations.length > 0 ? locations.map((loc, index) => {
              const width = Math.round((loc.value / maxLoc) * 100);
              return (
                <div key={loc.name} className="flex items-center gap-4">
                  <span className="w-8 text-sm font-black text-slate-600">0{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-300">{loc.name}</span>
                      <span className="font-bold text-blue-400">{loc.value} Leads</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-blue-500 rounded-full" 
                         style={{ width: `${width}%` }}
                       />
                    </div>
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-slate-500 text-center py-6">No location data available yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
