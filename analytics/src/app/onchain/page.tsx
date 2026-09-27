'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';

export default function OnchainPage() {
  return (
    <DashboardLayout title="On-chain" description="On-chain activity and contract health">
      <Card>
        <EmptyState
          title="On-chain Analytics"
          description="This section will show contract events, transaction metrics, and on-chain health. Coming soon."
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
      </Card>
    </DashboardLayout>
  );
}