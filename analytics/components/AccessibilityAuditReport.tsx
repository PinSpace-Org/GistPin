'use client';

type Severity = 'critical' | 'serious' | 'moderate' | 'minor';

interface AuditIssue {
  id: string;
  rule: string;
  description: string;
  severity: Severity;
  count: number;
}

const MOCK_ISSUES: AuditIssue[] = [
  { id: 'img-alt',        rule: 'image-alt',         description: 'Images must have alternate text',                severity: 'critical',  count: 3  },
  { id: 'color-contrast', rule: 'color-contrast',    description: 'Elements must have sufficient color contrast',   severity: 'serious',   count: 7  },
  { id: 'label',          rule: 'label',             description: 'Form elements must have labels',                 severity: 'critical',  count: 2  },
  { id: 'aria-roles',     rule: 'aria-allowed-role', description: 'ARIA roles must conform to valid values',        severity: 'moderate',  count: 4  },
  { id: 'link-name',      rule: 'link-name',         description: 'Links must have discernible text',               severity: 'serious',   count: 5  },
  { id: 'focus-visible',  rule: 'focus-visible',     description: 'Focus indicator must be visible',               severity: 'minor',     count: 9  },
];

const severityConfig: Record<Severity, { label: string; cls: string }> = {
  critical: { label: 'Critical', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  serious:  { label: 'Serious',  cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  moderate: { label: 'Moderate', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  minor:    { label: 'Minor',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

export default function AccessibilityAuditReport() {
  const total = MOCK_ISSUES.reduce((s, i) => s + i.count, 0);
  const criticalCount = MOCK_ISSUES.filter((i) => i.severity === 'critical').reduce((s, i) => s + i.count, 0);
  const score = Math.max(0, 100 - total * 2);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Accessibility Audit Report</h1>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Accessibility Score', value: `${score}/100`, color: score >= 80 ? 'text-green-600' : 'text-red-600' },
          { label: 'Total Issues',         value: total,          color: 'text-gray-800 dark:text-gray-100' },
          { label: 'Critical Issues',      value: criticalCount,  color: 'text-red-600 dark:text-red-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              {['Rule', 'Description', 'Severity', 'Count'].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {MOCK_ISSUES.map((issue) => {
              const { label, cls } = severityConfig[issue.severity];
              return (
                <tr key={issue.id} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{issue.rule}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{issue.description}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">{issue.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
