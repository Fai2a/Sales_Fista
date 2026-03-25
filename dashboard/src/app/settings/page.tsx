"use client";

import { useState } from 'react';
import { User, Shield, Bell, Key, Check, Link as LinkIcon } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile Settings', icon: User },
    { id: 'extension', name: 'Extension Sync', icon: LinkIcon },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-white font-heading tracking-tight mb-2">Settings</h1>
        <p className="text-slate-400 text-lg">Manage your account and platform preferences.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-3 flex flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-blue-500/10 text-blue-400 font-bold' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-8 animate-[fade-in-up_0.3s_ease-out]">
              <h2 className="text-2xl font-bold text-white font-heading mb-6">Profile Settings</h2>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center border-4 border-[#1e2d45]">
                  <span className="text-white font-bold text-3xl">JS</span>
                </div>
                <button className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-[#1e2d45]">
                  Change Avatar
                </button>
              </div>

              <form className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">First Name</label>
                    <input type="text" defaultValue="John" className="w-full bg-slate-900/50 border border-[#1e2d45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Last Name</label>
                    <input type="text" defaultValue="Smith" className="w-full bg-slate-900/50 border border-[#1e2d45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Email Address</label>
                  <input type="email" defaultValue="john.smith@example.com" className="w-full bg-slate-900/50 border border-[#1e2d45] rounded-xl px-4 py-3 text-slate-400 cursor-not-allowed focus:outline-none" disabled />
                  <p className="text-xs text-slate-500 mt-1">Contact support to change your email address.</p>
                </div>

                <div className="pt-6 border-t border-[#1e2d45] flex justify-end">
                  <button type="button" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-[0_4px_20px_rgba(37,99,235,0.3)]">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'extension' && (
            <div className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-8 animate-[fade-in-up_0.3s_ease-out]">
              <h2 className="text-2xl font-bold text-white font-heading mb-6">Chrome Extension Sync</h2>
              <p className="text-slate-400 mb-8">Connect your LeadVault Chrome Extension to automatically sync parsed leads into your dashboard.</p>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1">Extension Connected</h3>
                    <p className="text-sm text-green-400/80">Last synced 2 minutes ago</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-[#1e2d45] text-slate-300 rounded-lg text-sm font-medium transition-colors">
                   Disconnect
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white font-heading mb-2">API Key</h3>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="password" 
                      value="lv_sk_test_8f92j28h4b3m20f8g7h6" 
                      readOnly
                      className="w-full bg-slate-900/80 border border-[#1e2d45] rounded-xl py-3 pl-11 pr-4 text-slate-300 font-mono text-sm focus:outline-none" 
                    />
                  </div>
                  <button className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-[#1e2d45] text-white rounded-xl text-sm font-bold transition-colors shrink-0">
                    Copy Key
                  </button>
                </div>
                <p className="text-xs text-slate-500">Keep this key secret. Enter this in the extension options page to enable syncing.</p>
              </div>
            </div>
          )}

          {/* Placeholders for other tabs */}
          {['security', 'notifications'].includes(activeTab) && (
            <div className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-16 text-center animate-[fade-in-up_0.3s_ease-out]">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#1e2d45]">
                 <span className="text-2xl opacity-50">🚧</span>
              </div>
              <h2 className="text-xl font-bold text-white font-heading mb-2">Coming Soon</h2>
              <p className="text-slate-400">The {activeTab} settings module is currently under development.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
