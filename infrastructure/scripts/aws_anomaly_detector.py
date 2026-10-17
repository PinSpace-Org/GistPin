import boto3

def get_cost_anomalies():
    """Integrates with AWS Cost Anomaly Detection to fetch alerts."""
    client = boto3.client('ce')
    try:
        response = client.get_anomalies(
            MonitorArn='arn:aws:ce:us-east-1:123456789012:anomalymonitor/cost-monitor',
            DateInterval={'StartDate': '2026-08-01', 'EndDate': '2026-08-28'}
        )
        return response.get('Anomalies', [])
    except Exception as e:
        print(f"Failed to fetch cost anomalies: {e}")
        return []
