'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';

export default function TimePage() {
  return (
    <DashboardLayout title="Time" description="Time-series analytics and trends">
      <Card>
        <EmptyState
          title="Time Analytics"
          description="This section will show time-series analytics, trends, and temporal patterns. Coming soon."
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </Card>
    </DashboardLayout>
  );
}