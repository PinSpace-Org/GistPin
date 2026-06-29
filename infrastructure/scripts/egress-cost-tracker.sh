#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
LOG_GROUP="${LOG_GROUP:-/aws/vpc/flow-logs/gistpin}"
REPORT_DIR="${REPORT_DIR:-/tmp/egress-reports}"
CROSS_REGION_THRESHOLD_GB="${CROSS_REGION_THRESHOLD_GB:-10}"
COST_PER_GB="${COST_PER_GB:-0.09}"
OUTPUT_FILE="${REPORT_DIR}/egress-cost-$(date +%Y%m%d-%H%M%S).txt"

log() { echo "[$(date +%H:%M:%S)] $*"; }

mkdir -p "${REPORT_DIR}"
echo "" > "${OUTPUT_FILE}"

log "=== GistPin Egress Cost Tracker ==="
log "Region: ${AWS_REGION} | Log group: ${LOG_GROUP}"
log "Report: ${OUTPUT_FILE}"
echo "" >> "${OUTPUT_FILE}"

analyze_vpc_flow_logs() {
    log "Analyzing VPC flow logs from ${LOG_GROUP}..."

    local end_time
    local start_time
    if date -v -1h > /dev/null 2>&1; then
        end_time=$(date -u +%s)
        start_time=$(date -u -v-1h +%s)
    else
        end_time=$(date -u +%s)
        start_time=$(date -u -d '1 hour ago' +%s)
    fi

    aws logs filter-log-events \
        --region "${AWS_REGION}" \
        --log-group-name "${LOG_GROUP}" \
        --start-time "${start_time}000" \
        --end-time "${end_time}000" \
        --filter-pattern '[version, account, eni, srcaddr, dstaddr, srcport, dstport, protocol, packets, bytes, start, end, action, log_status]' \
        --query 'events[].message' \
        --output text 2>/dev/null | while IFS=' ' read -r line; do
        echo "${line}" >> "${REPORT_DIR}/raw-flow-logs.txt"
    done

    log "Flow log analysis complete."
}

attribute_costs_by_service() {
    log "Attributing egress costs by service..."

    awk '{
        split($0, fields, " ")
        srcaddr = fields[4]
        dstaddr = fields[5]
        bytes = fields[10]
        action = fields[13]

        if (action != "ACCEPT") next
        if (bytes == 0 || bytes == "-") next
        if (srcaddr ~ /^10\.|^172\.1[6-9]\.|^172\.2[0-9]\.|^172\.3[0-1]\.|^192\.168\./) next

        gb = bytes / 1e9
        cost = gb * '"${COST_PER_GB}"'

        if (dstaddr ~ /^10\./) {
            region = "cross-vpc"
        } else {
            region = "internet"
        }

        totals[region] += gb
        costs[region] += cost
    } END {
        for (r in totals) {
            printf "%s: %.4f GB, $%.4f\n", r, totals[r], costs[r]
        }
    }' "${REPORT_DIR}/raw-flow-logs.txt" >> "${OUTPUT_FILE}"

    log "Cost attribution complete."
}

detect_cross_region_transfers() {
    log "Detecting cross-region data transfers..."

    aws logs filter-log-events \
        --region "${AWS_REGION}" \
        --log-group-name "${LOG_GROUP}" \
        --filter-pattern "" \
        --query 'events[].message' \
        --output text 2>/dev/null | awk -v threshold="${CROSS_REGION_THRESHOLD_GB}" '
    {
        split($0, fields, " ")
        dstaddr = fields[5]
        bytes = fields[10]
        action = fields[13]

        if (action != "ACCEPT") next
        if (bytes == 0 || bytes == "-") next
        if (dstaddr !~ /^10\./) next

        gb = bytes / 1e9
        total[ip] += gb
    } END {
        for (ip in total) {
            if (total[ip] >= threshold) {
                printf "WARNING: Cross-region transfer to %s: %.2f GB\n", ip, total[ip]
            }
        }
    }' >> "${OUTPUT_FILE}"

    log "Cross-region detection complete."
}

generate_report() {
    log "Generating cost attribution report..."

    {
        echo "=== Egress Cost Report ==="
        echo "Generated: $(date -u)"
        echo "Region: ${AWS_REGION}"
        echo ""

        echo "--- Cost by Destination ---"
        grep -E "^(cross-vpc|internet):" "${OUTPUT_FILE}" || echo "No data available"

        echo ""
        echo "--- Top Source IPs by Egress Volume ---"
        awk '{
            split($0, fields, " ")
            srcaddr = fields[4]
            bytes = fields[10]
            action = fields[13]
            if (action == "ACCEPT" && bytes ~ /^[0-9]+$/) {
                src[srcaddr] += bytes
            }
        } END {
            for (s in src) {
                printf "%s %.2f GB\n", s, src[s] / 1e9
            }
        }' "${REPORT_DIR}/raw-flow-logs.txt" | sort -k2 -rn | head -10

        echo ""
        echo "--- Cross-Region Transfers ---"
        grep "WARNING:" "${OUTPUT_FILE}" || echo "None detected"

        echo ""
        echo "--- Recommendations ---"
        echo "- Review top egress sources for cost optimization opportunities"
        echo "- Consider VPC endpoints for AWS service traffic to avoid NAT costs"
        echo "- Consolidate cross-region traffic with Direct Connect or Transit Gateway"
        echo "- Set up budget alerts for unexpected egress spikes"
    } > "${OUTPUT_FILE}.tmp"

    mv "${OUTPUT_FILE}.tmp" "${OUTPUT_FILE}"
    log "Report saved to ${OUTPUT_FILE}"
}

cleanup() {
    log "Cleaning up temporary files..."
    rm -f "${REPORT_DIR}/raw-flow-logs.txt"
}

analyze_vpc_flow_logs
attribute_costs_by_service
detect_cross_region_transfers
generate_report
cleanup

log "Egress cost tracking complete. Cost attribution report at ${OUTPUT_FILE}"
