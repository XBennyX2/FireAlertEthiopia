import math
from datetime import datetime, timedelta


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)
    a = (math.sin(d_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def check_duplicate(new_report, existing_reports, radius_meters=500, time_window_minutes=30):
    try:
        new_lat  = float(new_report['lat'])
        new_lng  = float(new_report['lng'])
        new_time = datetime.fromisoformat(str(new_report['reported_at']))
        cutoff   = new_time - timedelta(minutes=time_window_minutes)
    except (KeyError, ValueError) as e:
        return {'is_duplicate': False, 'matching_incidents': [], 'error': str(e)}

    matches = []
    for report in existing_reports:
        try:
            report_time = datetime.fromisoformat(str(report.get('reported_at', '')))
            if report_time < cutoff:
                continue
            dist = haversine_distance(new_lat, new_lng,
                                      float(report['lat']), float(report['lng']))
            if dist <= radius_meters:
                matches.append({
                    'incident_id':    str(report.get('_id', '')),
                    'distance_meters': round(dist, 1)
                })
        except (KeyError, ValueError):
            continue

    return {
        'is_duplicate':        len(matches) > 0,
        'matching_incidents':  matches
    }