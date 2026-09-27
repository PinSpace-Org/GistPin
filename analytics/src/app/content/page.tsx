'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';

export default function ContentPage() {
  return (
    <DashboardLayout title="Content" description="Content lifecycle and analysis">
      <Card>
        <EmptyState
          title="Content Analytics"
          description="This section will show content lifecycle, expiration, and content analysis. Coming soon."
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </Card>
    </DashboardLayout>
  );
}