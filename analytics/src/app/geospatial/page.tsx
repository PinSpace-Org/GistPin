'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';

export default function GeospatialPage() {
  return (
    <DashboardLayout title="Geospatial" description="Geospatial activity and heatmaps">
      <Card>
        <EmptyState
          title="Geospatial Analytics"
          description="This section will show geospatial activity, heatmaps, and location-based analytics. Coming soon."
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </Card>
    </DashboardLayout>
  );
}