'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';

export default function ModerationPage() {
  return (
    <DashboardLayout title="Moderation" description="Moderation signals and actions">
      <Card>
        <EmptyState
          title="Moderation Analytics"
          description="This section will show moderation signals, reports, and moderator actions. See 'Moderation Action Mix' for a sample."
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </Card>
    </DashboardLayout>
  );
}