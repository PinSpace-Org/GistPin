#!/usr/bin/env python3
"""
Generate comprehensive cost optimization opportunity reports from scan data.
Takes the JSON output from find-optimizations.sh and generates a detailed markdown report.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

def load_opportunities(json_path):
    """Load opportunity data from JSON file"""
    with open(json_path, 'r') as f:
        return json.load(f)

def calculate_priority_summary(opportunities):
    """Calculate summary statistics by priority"""
    summary = {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
    savings_by_priority = {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
    
    for opp in opportunities:
        priority = opp['priority']
        if priority in summary:
            summary[priority] += 1
            savings_by_priority[priority] += opp['potential_savings']
    
    return summary, savings_by_priority

def calculate_category_summary(opportunities):
    """Calculate summary statistics by category"""
    categories = {}
    for opp in opportunities:
        cat = opp['category']
        if cat not in categories:
            categories[cat] = {'count': 0, 'savings': 0}
        categories[cat]['count'] += 1
        categories[cat]['savings'] += opp['potential_savings']
    
    return categories

def generate_markdown_report(data, output_path):
    """Generate markdown report from opportunity data"""
    opportunities = data['opportunities']
    total_savings = data['total_estimated_savings']
    scan_timestamp = data['scan_timestamp']
    
    # Calculate summaries
    priority_summary, savings_by_priority = calculate_priority_summary(opportunities)
    category_summary = calculate_category_summary(opportunities)
    
    # Category display names
    category_names = {
        'idle_resource': 'Idle Resources',
        'over_provisioned': 'Over-provisioned Instances',
        'reserved_instance': 'Reserved Instance Opportunities',
        'savings_plan': 'Savings Plan Recommendations'
    }
    
    # Priority emojis
    priority_icons = {
        'HIGH': '🔴',
        'MEDIUM': '🟡',
        'LOW': '🟢'
    }
    
    report_content = []
    report_content.append("# Infrastructure Cost Optimization Opportunities")
    report_content.append(f"\nScan performed: {scan_timestamp}")
    report_content.append(f"\n## Summary")
    report_content.append(f"\n**Total estimated monthly savings: ${total_savings:,.2f}**")
    report_content.append(f"\n### Opportunities by Priority")
    report_content.append("\n| Priority | Count | Potential Savings |")
    report_content.append("|----------|-------|-------------------|")
    for priority in ['HIGH', 'MEDIUM', 'LOW']:
        if priority_summary[priority] > 0:
            report_content.append(f"| {priority_icons[priority]} {priority} | {priority_summary[priority]} | ${savings_by_priority[priority]:,.2f} |")
    
    report_content.append("\n### Opportunities by Category")
    report_content.append("\n| Category | Count | Potential Savings |")
    report_content.append("|----------|-------|-------------------|")
    for cat, stats in category_summary.items():
        display_name = category_names.get(cat, cat.replace('_', ' ').title())
        report_content.append(f"| {display_name} | {stats['count']} | ${stats['savings']:,.2f} |")
    
    report_content.append("\n## Prioritized Opportunity List")
    report_content.append("\nAll opportunities are sorted by priority (HIGH first, then MEDIUM, then LOW).")
    report_content.append("\n---")
    
    for idx, opp in enumerate(opportunities, 1):
        cat_display = category_names.get(opp['category'], opp['category'].replace('_', ' ').title())
        report_content.append(f"\n### {idx}. {priority_icons[opp['priority']]} {opp['resource_id']}")
        report_content.append(f"- **Category**: {cat_display}")
        report_content.append(f"- **Resource Type**: {opp['resource_type']}")
        report_content.append(f"- **Current Monthly Cost**: ${opp['current_cost']:,.2f}")
        report_content.append(f"- **Potential Monthly Savings**: **${opp['potential_savings']:,.2f}**")
        report_content.append(f"- **Recommendation**: {opp['recommendation']}")
    
    report_content.append("\n---")
    report_content.append("\n## Implementation Guide")
    report_content.append("\n### Immediate Actions (High Priority - Complete within 1 week)")
    report_content.append("- Address all high priority idle resources first - these provide 100% savings if remediated")
    report_content.append("- Purchase reserved instances for database workloads that have consistent utilization")
    report_content.append("- Implement savings plans for steady-state compute spend across regions")
    
    report_content.append("\n### Short-term Actions (Medium Priority - Complete within 1 month)")
    report_content.append("- Right-size over-provisioned instances after verifying utilization patterns")
    report_content.append("- Delete unattached storage volumes (EBS, managed disks)")
    report_content.append("- Consolidate small workloads where possible to maximize reservation coverage")
    
    report_content.append("\n### Long-term Optimizations")
    report_content.append("- Rightsizing review: conduct monthly reviews of instance utilization")
    report_content.append("- Commitment optimization: review RI and savings plan utilization quarterly")
    report_content.append("- Automation: implement auto-scaling and auto-shutdown for non-production workloads")
    
    full_report = '\n'.join(report_content)
    
    with open(output_path, 'w') as f:
        f.write(full_report)
    
    print(f"Report generated: {output_path}")
    return full_report

def main():
    if len(sys.argv) != 2:
        print("Usage: python generate-opportunity-report.py <json_input_file>")
        sys.exit(1)
    
    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"Error: File {json_path} does not exist")
        sys.exit(1)
    
    # Load data
    data = load_opportunities(json_path)
    
    # Generate report in docs directory
    docs_path = Path(__file__).parent.parent / 'docs' / 'cost-opportunities.md'
    generate_markdown_report(data, docs_path)
    
    # Also create a dated version in the output directory
    dated_report = json_path.parent / f'report-{data["scan_timestamp"].replace(":", "-")}.md'
    generate_markdown_report(data, dated_report)

if __name__ == "__main__":
    main()