'use client';

import EventsCalendar from '@/components/EventsCalendar';
import { exportRowsToCsv } from '@/lib/export';
import ExportButton from '@/components/ui/ExportButton';

const sampleEvents = [
  { date: '2026-07-01', title: 'v3.2 Release', description: 'Release of v3.2 with new map features and performance improvements', category: 'release' as const, impact: 'high' as const },
  { date: '2026-07-05', title: 'Summer Campaign Launch', description: 'Summer marketing campaign targeting new users in NA and EU regions', category: 'marketing' as const, impact: 'medium' as const },
  { date: '2026-07-08', title: 'Infrastructure Upgrade', description: 'Scheduled upgrade of Kubernetes cluster to v1.28', category: 'platform' as const, impact: 'high' as const },
  { date: '2026-07-12', title: 'Community AMA', description: 'Ask Me Anything session with the engineering team', category: 'milestone' as const, impact: 'medium' as const },
  { date: '2026-07-15', title: 'Database Migration', description: 'Migrate primary database to provisioned IOPS for better performance', category: 'platform' as const, impact: 'high' as const },
  { date: '2026-07-18', title: 'Feature Flag Toggle', description: 'Enable geo-fencing features for all users', category: 'release' as const, impact: 'medium' as const },
  { date: '2026-07-20', title: 'Q2 Review', description: 'Quarterly review of platform metrics and user growth', category: 'milestone' as const, impact: 'medium' as const },
  { date: '2026-07-22', title: 'SEO Optimization', description: 'Deploy SEO improvements across landing pages and gist listings', category: 'marketing' as const, impact: 'low' as const },
  { date: '2026-07-25', title: 'Load Testing Week', description: 'Scheduled load testing and capacity planning for Q3', category: 'platform' as const, impact: 'medium' as const },
  { date: '2026-07-29', title: 'Mobile App Beta', description: 'Beta launch of mobile companion app for iOS and Android', category: 'release' as const, impact: 'high' as const },
  { date: '2026-08-01', title: '10M Gists Milestone', description: 'Celebrating 10 million gists created on the platform', category: 'milestone' as const, impact: 'high' as const },
  { date: '2026-08-05', title: 'CDN Provider Switch', description: 'Switch CDN provider to reduce latency in APAC region', category: 'platform' as const, impact: 'high' as const },
  { date: '2026-08-10', title: 'Content Creator Webinar', description: 'Webinar for top creators on platform best practices', category: 'marketing' as const, impact: 'low' as const },
  { date: '2026-08-15', title: 'v3.3 Release', description: 'Release of v3.3 with collaboration features', category: 'release' as const, impact: 'high' as const },
];

export default function EventsCalendarPage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{
        background: 'linear-gradient(135deg,#ffffff 0%,#fdf2f8 100%)',
        borderRadius: 24, padding: '28px 28px 24px',
        boxShadow: '0 12px 40px rgba(15,23,42,0.07)', marginBottom: 28,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', borderRadius: 999,
          padding: '5px 12px', background: '#ec4899', color: '#fff',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>Events Calendar</div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 800 }}>Platform Events Calendar</h1>
            <p style={{ margin: 0, color: '#475569', fontSize: 15 }}>
              Track platform releases, infrastructure changes, marketing campaigns, and milestones.
            </p>
          </div>
          <ExportButton
            onExport={(onProgress) =>
              exportRowsToCsv({
                filenamePrefix: 'platform-events',
                rows: sampleEvents.map((e) => ({ date: e.date, title: e.title, description: e.description, category: e.category, impact: e.impact })),
                onProgress,
              })
            }
          />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <EventsCalendar events={sampleEvents} />
      </div>
    </main>
  );
}
