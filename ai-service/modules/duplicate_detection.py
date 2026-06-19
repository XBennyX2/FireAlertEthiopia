import math
from datetime import datetime, timedelta, timezone


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)
    a = (math.sin(d_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _parse_to_utc(value):
    """
    Safely parse any incoming timestamp string into a timezone-aware
    UTC datetime, regardless of whether it includes timezone info.
    This prevents the offset-naive vs offset-aware comparison crash.
    """
    if not value:
        return None

    text = str(value).strip()

    # Handle JS-style 'Z' suffix which Python's fromisoformat doesn't
    # always accept depending on version
    if text.endswith('Z'):
        text = text[:-1] + '+00:00'

    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None

    # If the parsed datetime has no timezone info, assume UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt


def check_duplicate(new_report, existing_reports, radius_meters=500, time_window_minutes=30):
    try:
        new_lat  = float(new_report['lat'])
        new_lng  = float(new_report['lng'])
        new_time = _parse_to_utc(new_report.get('reported_at'))

        if new_time is None:
            return {'is_duplicate': False, 'matching_incidents': [], 'error': 'Invalid reported_at on new report'}

        cutoff = new_time - timedelta(minutes=time_window_minutes)

    except (KeyError, ValueError, TypeError) as e:
        return {'is_duplicate': False, 'matching_incidents': [], 'error': str(e)}

    matches = []
    for report in existing_reports:
        try:
            report_time = _parse_to_utc(report.get('reported_at'))
            if report_time is None:
                continue

            if report_time < cutoff:
                continue

            dist = haversine_distance(
                new_lat, new_lng,
                float(report['lat']), float(report['lng'])
            )

            if dist <= radius_meters:
                matches.append({
                    'incident_id':     str(report.get('_id', '')),
                    'distance_meters': round(dist, 1)
                })
        except (KeyError, ValueError, TypeError):
            continue

    return {
        'is_duplicate':       len(matches) > 0,
        'matching_incidents': matches
    }