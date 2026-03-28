import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Briefcase, MapPin, Mail, Phone, ExternalLink, Calendar, Users, Edit3, Trash2, Award } from 'lucide-react';
import { format } from 'date-fns';
import { StatusUpdater } from '@/components/StatusUpdater';

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
  });

  if (!lead) {
    notFound();
  }

  const skills = JSON.parse(lead.skills || '[]');

  return (
    <div className="animate-[fade-in_0.5s_ease-out] max-w-5xl mx-auto">
      <div className="mb-8">
        <Link href="/leads" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0f1623]/40 backdrop-blur-md border border-[#1e2d45] rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-gold/30"></div>
          <div className="flex-1">
            <h1 className="text-4xl md:text-6xl font-bold text-white font-heading tracking-tight mb-3 group-hover:text-gold transition-colors">{lead.name}</h1>
            <p className="text-xl md:text-2xl text-blue-400 font-semibold mb-5 tracking-tight">{lead.designation}</p>
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
              {lead.company && (
                <span className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-xl border border-[#1e2d45]"><Briefcase className="w-4 h-4 text-slate-500" /> {lead.company}</span>
              )}
              {(lead.city || lead.location) && (
                <span className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-xl border border-[#1e2d45]"><MapPin className="w-4 h-4 text-slate-500" /> {lead.city || lead.location}</span>
              )}
              <span className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-xl border border-[#1e2d45]"><Calendar className="w-4 h-4 text-slate-500" /> Added {format(new Date(lead.saved_at), 'MMM dd, yyyy')}</span>
            </div>
          </div>

           <div className="flex items-center gap-3 shrink-0">
             <StatusUpdater leadId={lead.id} initialStatus={lead.status} />
             {lead.linkedin_url && (
               <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]" title="View LinkedIn Profile">
                 <ExternalLink className="w-5 h-5" />
               </a>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-8">
          
          <section className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
            <h2 className="text-xl font-bold text-white font-heading mb-6 flex items-center gap-2">
              <span className="w-8 h-px bg-gold/50"></span> Profile Bio
            </h2>
            <p className="text-slate-300 leading-relaxed max-w-3xl whitespace-pre-wrap">
              {lead.bio || <span className="text-slate-500 italic">No bio provided.</span>}
            </p>
          </section>

          {skills.length > 0 && (
            <section className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white font-heading mb-6 flex items-center gap-2">
                <span className="w-8 h-px bg-gold/50"></span> Top Skills
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {skills.map((skill: string, idx: number) => (
                  <span 
                    key={idx} 
                    className="px-4 py-1.5 bg-slate-800/60 text-sm font-medium text-slate-200 rounded-xl border border-[#1e2d45] hover:border-gold/30 hover:bg-slate-800 transition-all flex items-center gap-2"
                  >
                    <Award className="w-3.5 h-3.5 text-gold/70" /> {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-8 shadow-xl">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white font-heading flex items-center gap-2">
                  <span className="w-8 h-px bg-blue-500/50"></span> Lead Notes
                </h2>
                <button className="text-sm font-medium text-slate-400 hover:text-white flex items-center gap-1">
                   <Edit3 className="w-4 h-4" /> Edit
                </button>
             </div>
             
             <textarea 
               className="w-full h-32 bg-slate-900/50 border border-[#1e2d45] rounded-xl p-4 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
               placeholder="Add internal some notes about this prospect..."
               defaultValue={lead.notes || ''}
             />
             <div className="mt-3 flex justify-end">
                <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors border border-[#1e2d45]">
                  Save Notes
                </button>
             </div>
          </section>

        </div>

        {/* Right Column - Contact & Metadata */}
        <div className="space-y-6">
          <div className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white font-heading mb-4">Contact Information</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="p-2 bg-slate-900 rounded-lg shrink-0 border border-[#1e2d45]">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Email</p>
                  <p className="text-sm text-slate-300 font-medium">{lead.email || 'Not available'}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-2 bg-slate-900 rounded-lg shrink-0 border border-[#1e2d45]">
                  <Phone className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Phone</p>
                  <p className="text-sm text-slate-300 font-medium">{lead.phone || 'Not available'}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-2 bg-slate-900 rounded-lg shrink-0 border border-[#1e2d45]">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Connections</p>
                  <p className="text-sm text-slate-300 font-medium">{lead.connectionCount || '500+'}</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-[#0f1623]/80 backdrop-blur-md border border-[#1e2d45] rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white font-heading mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-4">
               {/* Just mocking tags for now based on the JSON array format */}
               <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded-full border border-slate-700">Enterprise</span>
               <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded-full border border-slate-700">Q3 Target</span>
               <button className="px-3 py-1 border border-dashed border-slate-600 text-slate-500 hover:text-slate-300 text-xs font-medium rounded-full hover:bg-slate-800 transition-colors">
                 + Add Tag
               </button>
            </div>
          </div>

          <button className="w-full py-3 px-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-sm font-medium transition-colors flex items-center justify-center gap-2 group">
            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> Delete Lead
          </button>
        </div>
      </div>
    </div>
  );
}
