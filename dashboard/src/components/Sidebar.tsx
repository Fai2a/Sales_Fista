"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, LayoutDashboard, Users, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen border-r border-[#1e2d45] bg-[#0f1623]/80 backdrop-blur-xl flex flex-col pt-8 pb-4 shrink-0 shadow-2xl z-40 fixed">
      <div className="flex items-center gap-3 px-6 mb-12">
        <div className="bg-gradient-to-tr from-[#3b82f6] to-[#f59e0b] p-2 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          <Zap className="w-6 h-6 text-white" fill="white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
          Lead<span className="text-gold">Vault</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                isActive 
                  ? "bg-[#3b82f6]/10 text-white shadow-[inset_2px_0_0_rgba(59,130,246,1)]" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-[#3b82f6]" : "text-slate-500 group-hover:text-slate-300")} />
              <span className="font-medium text-sm">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 mt-auto">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800 mt-6 cursor-pointer hover:bg-slate-800 transition-colors">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center border-2 border-[#1e2d45]">
             <span className="text-white font-bold text-sm">JS</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">John Smith</p>
            <p className="text-xs text-slate-400">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
