import numpy as np
from sklearn.cluster import KMeans
from collections import Counter
from datetime import datetime


def generate_risk_heatmap(incidents, n_clusters=5):
    if len(incidents) < n_clusters:
        return {
            'error': 'Not enough data to generate heatmap',
            'minimum_required': n_clusters,
            'current_count': len(incidents)
        }

    coords = np.array([[float(i['lat']), float(i['lng'])] for i in incidents])
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    kmeans.fit(coords)

    labels  = kmeans.labels_
    centers = kmeans.cluster_centers_
    zones   = []

    for cid in range(n_clusters):
        cluster = [inc for inc, lbl in zip(incidents, labels) if lbl == cid]
        if not cluster:
            continue

        severity_counts = Counter(i.get('severity', 'Medium') for i in cluster)
        weights         = {'High': 3, 'Medium': 2, 'Low': 1}
        weighted_sum    = sum(weights.get(s, 1) * c for s, c in severity_counts.items())
        max_possible    = len(cluster) * 3
        risk_score      = round((weighted_sum / max_possible) * 100) if max_possible else 0

        zones.append({
            'zone_id':            cid + 1,
            'center_lat':         round(float(centers[cid][0]), 6),
            'center_lng':         round(float(centers[cid][1]), 6),
            'total_incidents':    len(cluster),
            'severity_breakdown': dict(severity_counts),
            'risk_score':         risk_score,
            'risk_level':         'High' if risk_score >= 70 else ('Medium' if risk_score >= 40 else 'Low')
        })

    zones.sort(key=lambda z: z['risk_score'], reverse=True)
    return {'risk_zones': zones}


def generate_trend_analysis(incidents):
    if not incidents:
        return {'error': 'No incident data available'}

    monthly_counts = Counter()
    fire_types     = Counter()
    hours          = Counter()

    for inc in incidents:
        try:
            dt        = datetime.fromisoformat(str(inc.get('reported_at', '')))
            month_key = dt.strftime('%Y-%m')
            monthly_counts[month_key] += 1
            hours[dt.hour]            += 1
        except (ValueError, TypeError):
            pass
        fire_types[inc.get('fire_type', 'unknown')] += 1

    return {
        'monthly_trends':         dict(sorted(monthly_counts.items())),
        'fire_type_distribution': dict(fire_types.most_common()),
        'peak_hours':             dict(hours.most_common(5)),
        'total_analyzed':         len(incidents)
    }