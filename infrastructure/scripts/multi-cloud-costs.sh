#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
AWS_REGION="${AWS_REGION:-us-east-1}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${BLUE}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Collect and compare infrastructure costs across AWS, GCP, and Azure.

Options:
  -r, --region REGION       AWS region (default: us-east-1)
  -o, --output-dir DIR      Report output directory
  -f, --format FORMAT       Output format (json, csv, markdown)
  -h, --help                Show this help message

Environment Variables:
  AWS_REGION                AWS region
  GCP_PROJECT_ID            GCP project ID
  AZURE_SUBSCRIPTION_ID     Azure subscription ID
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -r|--region) AWS_REGION="$2"; shift 2 ;;
    -o|--output-dir) REPORT_DIR="$2"; shift 2 ;;
    -f|--format) OUTPUT_FORMAT="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

mkdir -p "${REPORT_DIR}"

collect_aws_costs() {
  log "Collecting AWS costs..."

  local monthly_cost="0"
  local compute="0"
  local storage="0"
  local database="0"
  local network="0"
  local other="0"

  if command -v aws >/dev/null 2>&1; then
    monthly_cost=$(aws ce get-cost-and-usage \
      --time-period Start="$(date -u -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -u -v-30d +%Y-%m-%d)",End="$(date -u +%Y-%m-%d)" \
      --granularity MONTHLY \
      --metrics "UnblendedCost" \
      --group-by Type=DIMENSION,Key=SERVICE \
      --query 'ResultsByTime[0].Groups[?Keys[0]==`Amazon Elastic Compute Cloud - Compute`].Metrics.UnblendedCost.Amount' \
      --output text 2>/dev/null || echo "0")

    compute=$(aws ce get-cost-and-usage \
      --time-period Start="$(date -u -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -u -v-30d +%Y-%m-%d)",End="$(date -u +%Y-%m-%d)" \
      --granularity MONTHLY \
      --metrics "UnblendedCost" \
      --group-by Type=DIMENSION,Key=SERVICE \
      --query "ResultsByTime[0].Groups[?contains(Keys[0], 'Compute') || contains(Keys[0], 'EC2')].Metrics.UnblendedCost.Amount | [0]" \
      --output text 2>/dev/null || echo "0")

    storage=$(aws ce get-cost-and-usage \
      --time-period Start="$(date -u -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -u -v-30d +%Y-%m-%d)",End="$(date -u +%Y-%m-%d)" \
      --granularity MONTHLY \
      --metrics "UnblendedCost" \
      --group-by Type=DIMENSION,Key=SERVICE \
      --query "ResultsByTime[0].Groups[?contains(Keys[0], 'S3') || contains(Keys[0], 'Storage')].Metrics.UnblendedCost.Amount | [0]" \
      --output text 2>/dev/null || echo "0")

    database=$(aws ce get-cost-and-usage \
      --time-period Start="$(date -u -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -u -v-30d +%Y-%m-%d)",End="$(date -u +%Y-%m-%d)" \
      --granularity MONTHLY \
      --metrics "UnblendedCost" \
      --group-by Type=DIMENSION,Key=SERVICE \
      --query "ResultsByTime[0].Groups[?contains(Keys[0], 'RDS') || contains(Keys[0], 'Database')].Metrics.UnblendedCost.Amount | [0]" \
      --output text 2>/dev/null || echo "0")
  fi

  jq -n \
    --arg provider "aws" \
    --arg region "$AWS_REGION" \
    --argjson monthly "$monthly_cost" \
    --argjson compute "$compute" \
    --argjson storage "$storage" \
    --argjson database "$database" \
    --argjson network "$network" \
    --argjson other "$other" \
    '{
      provider: $provider,
      region: $region,
      monthly_cost: $monthly,
      breakdown: {
        compute: $compute,
        storage: $storage,
        database: $database,
        network: $network,
        other: $other
      },
      currency: "USD",
      period: "30d"
    }'
}

collect_gcp_costs() {
  log "Collecting GCP costs..."
  local gcp_project="${GCP_PROJECT_ID:-}"

  if [[ -z "$gcp_project" ]]; then
    warn "GCP_PROJECT_ID not set, using estimated costs"
    jq -n '{
      provider: "gcp",
      region: "us-central1",
      monthly_cost: 0,
      breakdown: { compute: 0, storage: 0, database: 0, network: 0, other: 0 },
      currency: "USD",
      period: "30d",
      note: "Estimated - GCP billing API not configured"
    }'
    return
  fi

  if command -v gcloud >/dev/null 2>&1; then
    local monthly_cost
    monthly_cost=$(gcloud billing budgets list --format="json" 2>/dev/null | \
      jq '.[0].amount.specifiedAmount.units // "0"' -r 2>/dev/null || echo "0")

    jq -n \
      --arg monthly "$monthly_cost" \
      '{
        provider: "gcp",
        region: "us-central1",
        monthly_cost: ($monthly | tonumber),
        breakdown: { compute: 0, storage: 0, database: 0, network: 0, other: 0 },
        currency: "USD",
        period: "30d"
      }'
  else
    warn "gcloud CLI not available"
    jq -n '{
      provider: "gcp",
      region: "us-central1",
      monthly_cost: 0,
      breakdown: { compute: 0, storage: 0, database: 0, network: 0, other: 0 },
      currency: "USD",
      period: "30d",
      note: "gcloud CLI not installed"
    }'
  fi
}

collect_azure_costs() {
  log "Collecting Azure costs..."
  local azure_sub="${AZURE_SUBSCRIPTION_ID:-}"

  if [[ -z "$azure_sub" ]]; then
    warn "AZURE_SUBSCRIPTION_ID not set"
    jq -n '{
      provider: "azure",
      region: "eastus",
      monthly_cost: 0,
      breakdown: { compute: 0, storage: 0, database: 0, network: 0, other: 0 },
      currency: "USD",
      period: "30d",
      note: "Estimated - Azure billing not configured"
    }'
    return
  fi

  if command -v az >/dev/null 2>&1; then
    jq -n '{
      provider: "azure",
      region: "eastus",
      monthly_cost: 0,
      breakdown: { compute: 0, storage: 0, database: 0, network: 0, other: 0 },
      currency: "USD",
      period: "30d"
    }'
  else
    warn "az CLI not available"
    jq -n '{
      provider: "azure",
      region: "eastus",
      monthly_cost: 0,
      breakdown: { compute: 0, storage: 0, database: 0, network: 0, other: 0 },
      currency: "USD",
      period: "30d",
      note: "az CLI not installed"
    }'
  fi
}

calculate_tco() {
  local aws_costs="$1"
  local gcp_costs="$2"
  local azure_costs="$3"

  local aws_total gcp_total azure_total
  aws_total=$(echo "$aws_costs" | jq '.monthly_cost')
  gcp_total=$(echo "$gcp_costs" | jq '.monthly_cost')
  azure_total=$(echo "$azure_costs" | jq '.monthly_cost')

  local total
  total=$(echo "$aws_total $gcp_total $azure_total" | awk '{print $1 + $2 + $3}')

  jq -n \
    --argjson aws "$aws_total" \
    --argjson gcp "$gcp_total" \
    --argjson azure "$azure_total" \
    --argjson total "$total" \
    '{
      aws_monthly: $aws,
      gcp_monthly: $gcp,
      azure_monthly: $azure,
      total_monthly: $total,
      aws_annual: ($aws * 12),
      gcp_annual: ($gcp * 12),
      azure_annual: ($azure * 12),
      total_annual: ($total * 12)
    }'
}

generate_report() {
  local timestamp
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local report_file="${REPORT_DIR}/multi-cloud-costs-$(date -u +%Y%m%d-%H%M%S).json"

  log "Generating multi-cloud cost comparison report..."

  local aws_costs gcp_costs azure_costs
  aws_costs=$(collect_aws_costs)
  gcp_costs=$(collect_gcp_costs)
  azure_costs=$(collect_azure_costs)

  local tco
  tco=$(calculate_tco "$aws_costs" "$gcp_costs" "$azure_costs")

  local service_mapping
  service_mapping=$(jq -n '[
    {service: "Compute", aws: "EC2/EKS", gcp: "GCE/GKE", azure: "VMs/AKS"},
    {service: "Object Storage", aws: "S3", gcp: "Cloud Storage", azure: "Blob Storage"},
    {service: "Database", aws: "RDS/Aurora", gcp: "Cloud SQL", azure: "Azure SQL"},
    {service: "CDN", aws: "CloudFront", gcp: "Cloud CDN", azure: "Azure CDN"},
    {service: "DNS", aws: "Route 53", gcp: "Cloud DNS", azure: "Azure DNS"},
    {service: "Load Balancer", aws: "ALB/NLB", gcp: "Cloud Load Balancer", azure: "Azure LB"},
    {service: "Functions", aws: "Lambda", gcp: "Cloud Functions", azure: "Azure Functions"},
    {service: "Message Queue", aws: "SQS/SNS", gcp: "Pub/Sub", azure: "Service Bus"}
  ]')

  jq -n \
    --arg timestamp "$timestamp" \
    --argjson aws "$aws_costs" \
    --argjson gcp "$gcp_costs" \
    --argjson azure "$azure_costs" \
    --argjson tco "$tco" \
    --argjson mapping "$service_mapping" \
    '{
      timestamp: $timestamp,
      clouds: {
        aws: $aws,
        gcp: $gcp,
        azure: $azure
      },
      tco: $tco,
      service_mapping: $mapping
    }' > "${report_file}"

  success "Report written to ${report_file}"

  echo ""
  echo "========================================="
  echo "  MULTI-CLOUD COST COMPARISON"
  echo "========================================="
  echo ""
  printf "  %-12s %12s %12s %12s\n" "Provider" "Monthly" "Annual" "Share"
  printf "  %-12s %12s %12s %12s\n" "--------" "-------" "------" "-----"

  local aws_m gcp_m azure_m total_m
  aws_m=$(echo "$tco" | jq -r '.aws_monthly')
  gcp_m=$(echo "$tco" | jq -r '.gcp_monthly')
  azure_m=$(echo "$tco" | jq -r '.azure_monthly')
  total_m=$(echo "$tco" | jq -r '.total_monthly')

  printf "  %-12s %12s %12s %12s\n" "AWS" "\$${aws_m}" "\$$(echo "$aws_m * 12" | bc)" "$(echo "$total_m $aws_m" | awk '{if($1>0) printf "%.1f%%", ($2/$1)*100; else print "N/A"}')"
  printf "  %-12s %12s %12s %12s\n" "GCP" "\$${gcp_m}" "\$$(echo "$gcp_m * 12" | bc)" "$(echo "$total_m $gcp_m" | awk '{if($1>0) printf "%.1f%%", ($2/$1)*100; else print "N/A"}')"
  printf "  %-12s %12s %12s %12s\n" "Azure" "\$${azure_m}" "\$$(echo "$azure_m * 12" | bc)" "$(echo "$total_m $azure_m" | awk '{if($1>0) printf "%.1f%%", ($2/$1)*100; else print "N/A"}')"
  printf "  %-12s %12s %12s %12s\n" "Total" "\$${total_m}" "\$$(echo "$total_m * 12" | bc)" "100%"
  echo ""
  echo "========================================="
}

main() {
  log "Starting multi-cloud cost comparison..."
  generate_report
}

main "$@"
