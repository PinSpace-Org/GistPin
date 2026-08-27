-- analyze-flow-logs.sql
-- Athena queries for VPC flow log security analysis

-- 1. Rejected traffic in the last hour (anomaly detection)
SELECT
  srcaddr,
  dstaddr,
  dstport,
  protocol,
  COUNT(*) AS rejected_count,
  SUM(bytes)  AS total_bytes
FROM vpc_flow_logs.flow_logs
WHERE action = 'REJECT'
  AND from_unixtime(CAST(start AS bigint)) > current_timestamp - interval '1' hour
GROUP BY srcaddr, dstaddr, dstport, protocol
ORDER BY rejected_count DESC
LIMIT 50;

-- 2. Top talkers (bytes) — weekly traffic report
SELECT
  srcaddr,
  dstaddr,
  SUM(bytes)   AS total_bytes,
  SUM(packets) AS total_packets
FROM vpc_flow_logs.flow_logs
WHERE from_unixtime(CAST(start AS bigint)) > current_timestamp - interval '7' day
GROUP BY srcaddr, dstaddr
ORDER BY total_bytes DESC
LIMIT 100;

-- 3. Port scan detection: single source hitting many distinct ports
SELECT
  srcaddr,
  COUNT(DISTINCT dstport) AS distinct_ports,
  COUNT(*)                AS attempts
FROM vpc_flow_logs.flow_logs
WHERE from_unixtime(CAST(start AS bigint)) > current_timestamp - interval '1' hour
  AND action = 'REJECT'
GROUP BY srcaddr
HAVING COUNT(DISTINCT dstport) > 20
ORDER BY distinct_ports DESC;

-- 4. Unusual protocol traffic (non-TCP/UDP/ICMP)
SELECT
  srcaddr,
  dstaddr,
  protocol,
  COUNT(*) AS flow_count
FROM vpc_flow_logs.flow_logs
WHERE protocol NOT IN ('6', '17', '1')
  AND from_unixtime(CAST(start AS bigint)) > current_timestamp - interval '1' hour
GROUP BY srcaddr, dstaddr, protocol
ORDER BY flow_count DESC;
