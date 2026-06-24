import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  HelpCircle, 
  CheckCircle, 
  Clock, 
  Send, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { submitSupabaseSupportQuery, getSupabaseSupportQueries } from '../lib/supabase';
import { UserProfile, SupportQuery } from '../types';

interface ContactPageProps {
  user: UserProfile;
}

export default function ContactPage({ user }: ContactPageProps) {
  const [subject, setSubject] = useState('General Query');
  const [message, setMessage] = useState('');
  
  // Previous queries history
  const [previousQueries, setPreviousQueries] = useState<SupportQuery[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  
  // App status handlers
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // FAQ Accordion toggles
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({
    0: true, // First one open by default
  });

  const faqs = [
    {
      q: "How do I change my assigned faculty mentor?",
      a: "To re-assign your project to another faculty mentor, go to Support and raise a ticket with the subject 'Milestone/Faculty Adjustment'. Provide your current project title and the name of the new mentor you'd like to assign. Administrators will execute the transfer."
    },
    {
      q: "Can I add more team members after project submission?",
      a: "Yes! While you cannot edit the submission details directly from the dashboard, you can request your assigned mentor to make adjustments, or submit a support query here with your teammate's name and ID. We will update the metadata."
    },
    {
      q: "What file formats are supported for documentation attachments?",
      a: "Our portal supports standard academic and code archiving file extensions. You can upload PDF documents, ZIP archives containing source codes, Word Documents (.docx), or JPG/PNG mockup images up to 10MB in size."
    },
    {
      q: "How are milestones graded and checked off?",
      a: "Students can mark milestones as 'completed' in the Progress Tracker to alert their mentors that work has been done. The mentor then inspects the code or attachment, verifies the milestone, and issues an 'Approved' state with grades/feedback."
    }
  ];

  const fetchQueries = async () => {
    if (!user.email) return;
    setLoadingQueries(true);
    try {
      const items = await getSupabaseSupportQueries(user.email);
      setPreviousQueries(items);
    } catch (err) {
      console.warn("Failed to load support queries:", err);
    } finally {
      setLoadingQueries(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, [user.email]);

  const handleFAQToggle = (index: number) => {
    setFaqOpen(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please type in a detailed message describing your support query.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await submitSupabaseSupportQuery(
        user.displayName,
        user.email,
        subject,
        message
      );

      setSuccess('Query submitted successfully! Our help desk will respond via your university email.');
      setMessage('');
      fetchQueries();
    } catch (err: any) {
      setError(err.message || 'Error sending query. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">Help Desk & Contact Support</h2>
        <p className="text-xs text-slate-500">Raise technical support tickets, read portals guides, and track resolution statuses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Help query and previous logs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <h3 className="font-display font-extrabold text-lg text-slate-800">Submit Support Ticket</h3>

            {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}
            {success && <div className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">{success}</div>}

            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={user.displayName}
                    disabled
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">University Email</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Query Subject / Department</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                >
                  <option value="General Query">General Query</option>
                  <option value="Milestone/Faculty Adjustment">Milestone/Faculty Adjustment</option>
                  <option value="Technical System Bug">Technical System Bug</option>
                  <option value="Attachment/Upload Issue">Attachment/Upload Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Detailed Message</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or custom requests in detail. Mention project titles and IDs if applicable..."
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send Support Message
                </button>
              </div>
            </form>
          </div>

          {/* Previous Queries Log */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-display font-extrabold text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-500" /> Your Support History
            </h3>

            {loadingQueries ? (
              <div className="text-center py-6 text-slate-400 text-xs">Loading ticket logs...</div>
            ) : previousQueries.length === 0 ? (
              <div className="text-slate-400 text-xs py-6 text-center italic bg-slate-50 rounded-2xl border border-dashed">
                No tickets filed yet. All your support submissions will appear here with live resolution status.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {previousQueries.map((query) => (
                  <div key={query.id} className="p-3.5 bg-slate-50 border rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-slate-800">{query.subject}</span>
                      
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${
                        query.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {query.status === 'resolved' ? (
                          <>
                            <CheckCircle className="h-3 w-3" /> Resolved
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" /> Open
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed truncate">{query.message}</p>
                    <span className="block text-[9px] text-slate-400 font-mono">
                      Filed: {query.createdAt?.seconds ? new Date(query.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Portal FAQ guides */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg space-y-4">
            <h3 className="font-display font-extrabold text-base text-indigo-200 uppercase tracking-wide">Need Immediate Help?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Academic semesters move fast. If you need immediate administrative clearance or role upgrades, contact the registrar's help desk or read our precompiled knowledge base.
            </p>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
            <h3 className="font-display font-extrabold text-base text-slate-900">Frequently Asked Questions</h3>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = !!faqOpen[index];
                return (
                  <div key={index} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <button
                      onClick={() => handleFAQToggle(index)}
                      className="w-full flex items-center justify-between text-left font-bold text-xs text-slate-700 hover:text-indigo-600 transition-colors py-1 cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
                    </button>

                    {isOpen && (
                      <p className="text-xs text-slate-500 leading-relaxed mt-2 pl-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
