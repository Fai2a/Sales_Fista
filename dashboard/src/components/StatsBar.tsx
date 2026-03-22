import { Users, UserPlus, Send, CheckCircle2 } from 'lucide-react';
import prisma from '@/lib/prisma';

export async function StatsBar() {
  const [totalLeads, newToday, contacted, qualified] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({
      where: {
        savedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.lead.count({ where: { status: 'CONTACTED' } }),
    prisma.lead.count({ where: { status: 'QUALIFIED' } }),
  ]);

  const stats = [
    { name: 'Total Leads', value: totalLeads, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { name: 'New Today', value: newToday, icon: UserPlus, color: 'text-green-400', bg: 'bg-green-400/10' },
    { name: 'Contacted', value: contacted, icon: Send, color: 'text-gold', bg: 'bg-yellow-400/10' },
    { name: 'Qualified', value: qualified, icon: CheckCircle2, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.name} className="relative group overflow-hidden rounded-2xl bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] p-6 shadow-lg hover:border-[#3b82f6]/50 transition-all duration-300">
            <div className={`absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full ${stat.bg} blur-2xl group-hover:blur-xl transition-all`}></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-white font-heading tracking-tight">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
