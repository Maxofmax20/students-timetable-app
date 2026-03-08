'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "How it works", href: "#how-it-works" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "Pricing", href: "#pricing" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--gold)]/30 font-sans overflow-x-hidden selection:text-[var(--gold-fg)]">
      
      {/* Navigation */}
      <header className={cn(
        "fixed top-0 w-full z-[100] transition-all duration-300 border-b",
        scrolled 
          ? "h-16 bg-[var(--bg-raised)]/90 backdrop-blur-md border-[var(--border)]" 
          : "h-20 bg-transparent border-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-hover)] flex items-center justify-center shadow-[var(--shadow-glow)] group-hover:scale-105 transition-transform duration-300">
              <span className="material-symbols-outlined font-bold text-[var(--gold-fg)] text-xl">calendar_month</span>
            </div>
            <span className="font-bold tracking-tight text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-[var(--text-secondary)]">Timetable</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors tracking-wide"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/auth" className="hidden sm:block text-sm font-bold text-[var(--text-secondary)] hover:text-white transition-colors">
              Log in
            </Link>
            <Link 
              href="/auth" 
              className="px-6 py-2.5 rounded-xl bg-[var(--gold)] text-[var(--gold-fg)] font-bold text-sm hover:bg-[var(--gold-hover)] transition-all shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
            >
              Get Started
            </Link>
            <button 
              className="md:hidden p-2 text-[var(--text-secondary)] hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="material-symbols-outlined text-2xl">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={cn(
        "fixed inset-0 z-[90] md:hidden transition-all duration-500",
        mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        <div className="absolute inset-0 bg-[var(--bg)]/95 backdrop-blur-xl flex flex-col pt-32 px-8 gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href} 
              onClick={() => setMobileMenuOpen(false)}
              className="text-4xl font-bold text-white hover:text-[var(--gold)] transition-colors"
            >
              {link.name}
            </Link>
          ))}
          <div className="h-px bg-[var(--border)] my-4 w-full" />
          <Link 
            href="/auth" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-2xl font-bold text-[var(--gold)]"
          >
            Go to Workspace →
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 lg:pt-56 lg:pb-32 overflow-hidden px-4">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-[var(--gold-muted)] to-transparent rounded-full blur-[140px] pointer-events-none opacity-40"></div>
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-[var(--info-muted)] rounded-full blur-[100px] pointer-events-none opacity-30"></div>
        
        <div className="max-w-[1400px] mx-auto flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] mb-8 shadow-[var(--shadow-glow)]">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--gold)] animate-pulse"></span>
            <span className="text-[10px] font-black text-[var(--gold)] uppercase tracking-[0.2em]">Next-Gen Timetable Engine v2.0</span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl lg:text-[100px] font-black tracking-tight mb-8 leading-[0.9] text-white">
            Structure your <br className="hidden md:block"/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--gold)] via-white to-[var(--gold-hover)]">Time with Intent.</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-[var(--text-secondary)] max-w-3xl mb-12 leading-relaxed font-medium">
            The world's most intuitive platform for higher education scheduling. Manage complex courses, resolve conflicts instantly, and publish in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
            <Link 
              href="/auth" 
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-[var(--gold)] text-[var(--gold-fg)] font-bold text-xl hover:bg-[var(--gold-hover)] transition-all shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-glow)] hover:-translate-y-1 active:scale-[0.98]"
            >
              Start Building Now
            </Link>
            <Link 
              href="#features" 
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-white font-bold text-xl hover:bg-[var(--surface-2)] transition-all group"
            >
              Watch Demo <span className="material-symbols-outlined align-middle ml-2 group-hover:translate-x-1 transition-transform">play_circle</span>
            </Link>
          </div>

          {/* Product Showcase */}
          <div className="mt-28 w-full max-w-6xl relative group">
             <div className="absolute inset-0 bg-[var(--gold)]/10 blur-[100px] -z-10 group-hover:bg-[var(--gold)]/20 transition-all duration-1000"></div>
             <div className="relative rounded-[2rem] border border-[var(--border)] bg-[var(--bg-raised)]/80 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                {/* Simulated UI Header */}
                <div className="h-16 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--surface)]/50">
                   <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                         <div className="w-3 h-3 rounded-full bg-[var(--danger)]/50"></div>
                         <div className="w-3 h-3 rounded-full bg-[var(--warning)]/50"></div>
                         <div className="w-3 h-3 rounded-full bg-[var(--success)]/50"></div>
                      </div>
                      <div className="h-6 w-px bg-[var(--border)] mx-2"></div>
                      <div className="flex items-center gap-2">
                         <span className="material-symbols-outlined text-sm text-[var(--text-muted)]">folder</span>
                         <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Main Campus / 2024 Fall</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-[var(--surface-3)]"></div>
                   </div>
                </div>
                {/* Simulated Grid Content */}
                <div className="p-8 grid grid-cols-6 gap-6 h-[500px]">
                   <div className="col-span-1 border-r border-[var(--border-soft)] flex flex-col gap-6">
                      {[...Array(4)].map((_, i) => (
                         <div key={i} className="h-10 rounded-xl bg-[var(--surface-2)]/50 flex items-center px-3 gap-2">
                            <div className="w-3 h-3 rounded bg-[var(--gold)]/30"></div>
                            <div className="h-2 w-12 bg-[var(--text-muted)]/20 rounded-full"></div>
                         </div>
                      ))}
                   </div>
                   <div className="col-span-5 grid grid-cols-5 gap-4">
                      {[...Array(5)].map((_, day) => (
                         <div key={day} className="flex flex-col gap-4">
                            <div className="h-4 w-12 bg-[var(--text-muted)]/20 rounded-full mb-2 self-center"></div>
                            {day % 2 === 0 ? (
                               <>
                                 <div className="h-32 rounded-3xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 p-4 flex flex-col justify-end">
                                    <div className="h-2 w-16 bg-[var(--gold)]/40 rounded-full mb-2"></div>
                                    <div className="h-3 w-8 bg-[var(--gold)]/20 rounded-full"></div>
                                 </div>
                                 <div className="h-40 rounded-3xl bg-[var(--surface-2)] border border-[var(--border-soft)] p-4"></div>
                               </>
                            ) : (
                               <>
                                 <div className="h-56 rounded-3xl bg-[var(--surface-3)] border border-[var(--border)] p-4 relative overflow-hidden">
                                     <div className="absolute top-4 right-4 w-6 h-6 rounded-lg bg-[var(--danger-muted)] flex items-center justify-center text-[var(--danger)]">
                                        <span className="material-symbols-outlined text-xs">warning</span>
                                     </div>
                                 </div>
                                 <div className="h-24 rounded-3xl bg-[var(--gold)]/5 border border-[var(--gold)]/10"></div>
                               </>
                            )}
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-32 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
              <div className="max-w-2xl">
                 <h2 className="text-4xl sm:text-6xl font-black text-white leading-none mb-6">Built for scale. <br/> <span className="text-[var(--gold)]">Obsessed with detail.</span></h2>
                 <p className="text-xl text-[var(--text-secondary)]">Stop manual scheduling. Let our engine handle the complexity while you focus on academics.</p>
              </div>
              <Button variant="secondary" className="hidden md:flex">View Feature List →</Button>
           </div>

           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon="account_tree" 
                title="Visual Conflict Graph" 
                desc="Instantly identify room double-bookings and instructor overlaps with a color-coded conflict overlay." 
              />
              <FeatureCard 
                icon="bolt" 
                title="Instant Snap-to-Grid" 
                desc="Courses snap perfectly to your defined time intervals. No more messy 08:43 starting times." 
              />
              <FeatureCard 
                icon="groups" 
                title="Departmental Sync" 
                desc="Work together in real-time. Changes sync across all coordinators instantly with no page reloads." 
              />
              <FeatureCard 
                icon="share_windows" 
                title="Dynamic Public Views" 
                desc="Publish live timetables that students can access on any device without logging in." 
              />
              <FeatureCard 
                icon="print" 
                title="Pixel-Perfect Prints" 
                desc="Generate beautiful PDF versions of your timetable optimized for both A4 and large posters." 
              />
              <FeatureCard 
                icon="security" 
                title="Enterprise Security" 
                desc="Full RBAC permissions and session security to keep your sensitive scheduling data safe." 
              />
           </div>
        </div>
      </section>

      {/* Social Proof */}
      <section id="testimonials" className="py-32 bg-[var(--bg-raised)]">
         <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-20">
               <h3 className="text-[10px] font-black tracking-[0.3em] text-[var(--gold)] uppercase mb-4">Trusted by Institutions</h3>
               <p className="text-3xl font-bold text-white">Powering the world's leading departments.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <TestimonialCard 
                 text="Timetable transformed our semester launch. What used to take weeks of back-and-forth now happens in two days."
                 author="Dr. Sarah Jenkins"
                 role="Academic Director, MIT"
               />
               <TestimonialCard 
                 text="The interface is just... beautiful. It doesn't feel like enterprise software. It feels like a boutique tool built by people who care."
                 author="Prof. Alan Miller"
                 role="Computer Science Dept"
               />
               <TestimonialCard 
                 text="The conflict detection is a lifesaver. It literally paid for itself in the first hour when it caught a major room overlap."
                 author="Elena Rodriguez"
                 role="Scheduling Coordinator"
               />
            </div>
         </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 bg-[var(--bg)]">
         <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-5xl font-black text-white mb-6">Simple, fair pricing.</h2>
            <p className="text-[var(--text-secondary)] text-xl mb-16">Free for early adopters. No credit card required.</p>
            
            <div className="relative p-12 rounded-[3rem] border-2 border-[var(--gold)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg-raised)] shadow-[var(--shadow-glow)]">
               <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[var(--gold)] text-[var(--gold-fg)] px-6 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">Beta Early Access</div>
               <div className="text-sm font-bold text-[var(--gold)] uppercase tracking-widest mb-4">Unlimited Plan</div>
               <div className="text-7xl font-black text-white mb-8">$0<span className="text-2xl font-medium text-[var(--text-muted)] ml-2">/ lifetime</span></div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 text-left">
                  {['Unlimited Workspaces', 'Unlimited Courses', 'Real-time Collaboration', 'ICS Sync', 'Premium Export', 'Custom Branded Links'].map((f) => (
                    <div key={f} className="flex items-center gap-3">
                       <span className="material-symbols-outlined text-[var(--gold)]">check_circle</span>
                       <span className="text-white font-medium">{f}</span>
                    </div>
                  ))}
               </div>

               <Link href="/auth" className="block w-full py-6 rounded-[2rem] bg-white text-black font-black text-2xl hover:bg-[var(--gold)] hover:text-[var(--gold-fg)] transition-all shadow-xl hover:-translate-y-1">
                  Claim Your Free Workspace →
               </Link>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-[var(--border)] bg-[var(--bg-raised)]">
         <div className="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
            <div className="col-span-1 md:col-span-2">
               <div className="flex items-center gap-3 justify-center md:justify-start mb-6">
                 <div className="w-8 h-8 rounded-lg bg-[var(--gold)] flex items-center justify-center">
                   <span className="material-symbols-outlined font-bold text-[var(--gold-fg)] text-lg">calendar_month</span>
                 </div>
                 <span className="font-bold text-white tracking-tight text-xl">Timetable</span>
               </div>
               <p className="text-[var(--text-secondary)] max-w-sm leading-relaxed">
                 The premium choice for academic scheduling. Built with love for educators who demand better tools.
               </p>
            </div>
            <div className="flex flex-col gap-4">
               <h4 className="font-bold text-white text-sm uppercase tracking-widest">Platform</h4>
               <Link href="#features" className="text-[var(--text-secondary)] hover:text-white transition-colors">Features</Link>
               <Link href="#pricing" className="text-[var(--text-secondary)] hover:text-white transition-colors">Pricing</Link>
               <Link href="/auth" className="text-[var(--text-secondary)] hover:text-white transition-colors">Get Started</Link>
            </div>
            <div className="flex flex-col gap-4">
               <h4 className="font-bold text-white text-sm uppercase tracking-widest">Connect</h4>
               <a href="#" className="text-[var(--text-secondary)] hover:text-white transition-colors">X / Twitter</a>
               <a href="#" className="text-[var(--text-secondary)] hover:text-white transition-colors">GitHub</a>
               <a href="#" className="text-[var(--text-secondary)] hover:text-white transition-colors">Discord</a>
            </div>
         </div>
         <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-20 pt-10 border-t border-[var(--border-soft)] flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
            <div>&copy; 2024 Timetable Workspace. All rights reserved.</div>
            <div className="flex gap-8">
               <a href="#">Privacy</a>
               <a href="#">Terms</a>
               <a href="#">Cookie Policy</a>
            </div>
         </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="p-10 rounded-[2.5rem] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--gold)]/50 hover:bg-[var(--surface-2)] transition-all group">
       <div className="w-14 h-14 rounded-2xl bg-[var(--surface-3)] flex items-center justify-center mb-8 border border-[var(--border)] group-hover:scale-110 transition-transform duration-500">
          <span className="material-symbols-outlined text-[var(--gold)] text-3xl">{icon}</span>
       </div>
       <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">{title}</h3>
       <p className="text-[var(--text-secondary)] leading-relaxed">{desc}</p>
    </div>
  );
}

function TestimonialCard({ text, author, role }: { text: string, author: string, role: string }) {
  return (
    <div className="p-8 rounded-[2rem] bg-[var(--surface)] border border-[var(--border-soft)] relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-6 text-[var(--gold)]/5">
          <span className="material-symbols-outlined text-8xl">format_quote</span>
       </div>
       <p className="text-xl text-white font-medium mb-8 relative z-10 leading-relaxed italic">"{text}"</p>
       <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--surface-3)] to-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-center font-bold text-[var(--gold)]">
             {author.charAt(0)}{author.split(' ')[1]?.charAt(0)}
          </div>
          <div>
             <h4 className="text-sm font-bold text-white tracking-tight">{author}</h4>
             <p className="text-[11px] font-bold text-[var(--gold)] uppercase tracking-wider">{role}</p>
          </div>
       </div>
    </div>
  );
}
