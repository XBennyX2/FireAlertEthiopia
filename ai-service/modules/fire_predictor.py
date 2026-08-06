import csv
import os
from collections import Counter
from datetime import datetime, timedelta

STATION_MAP = {
    'ቦሌ': 'Bole Fire Station', 'ኮልፌ': 'Kolfe Keranio Fire Station',
    'ኮ/ቃራኒዮ': 'Kolfe Keranio Fire Station', 'አ/ከተማ': 'Addis Ketema Fire Station',
    'አ/ቃሊቲ': 'Akaki Kaliti Fire Station', 'አቃቂ': 'Akaki Kaliti Fire Station',
    'ጉለሌ': 'Gulele Fire Station', 'ን/ስልክ': 'Nifas Silk-Lafto Fire Station',
    'ን/ላፍቶ': 'Nifas Silk-Lafto Fire Station', 'የካ': 'Yeka Fire Station',
    'አራዳ': 'Arada Fire Station', 'ቂርቆስ': 'Kirkos Fire Station',
    'ልደታ': 'Lideta Fire Station', 'ለሚኩራ': 'Nifas Silk-Lafto Fire Station',
    'ለሚ ኩራ': 'Nifas Silk-Lafto Fire Station', 'ኦሮሚያ': 'Akaki Kaliti Fire Station',
    'ሸገር ሲቲ': 'Akaki Kaliti Fire Station', 'ሸገርሲቲ': 'Akaki Kaliti Fire Station',
    'ሸገር': 'Akaki Kaliti Fire Station', 'ቡራዩ': 'Akaki Kaliti Fire Station',
}

FIRE_TYPE_MAP = {
    'የቤት ቃጠሎ': 'residential', 'የቤትቃጠሎ': 'residential', 'የመኖሪያ ቤት ቃጠሎ': 'residential',
    'የፎቅ ቃጠሎ': 'residential', 'የህንፃ ቃጠሎ': 'residential', 'የእንጨት ቤት ቃጠሎ': 'residential',
    'የፔንስዮን ቃጠሎ': 'residential', 'የቤትና ሱቅ ቃጠሎ': 'residential',
    'የመኖሪያ ቤትና የሱቅ ቃጠሎ': 'residential', 'የመኖሪያናስቶር ቃጠሎ': 'residential',
    'የኩሽና ቃጠሎ': 'residential', 'የኩሽ ቃጠሎ': 'residential',
    'የኪችን ቃጠሎ': 'residential', 'የክችን ቃጠሎ': 'residential',
    'የሱቅ ቃጠሎ': 'commercial', 'የሱቆች ቃጠሎ': 'commercial', 'የንግድ ቤት ቃጠሎ': 'commercial',
    'የሆቴል ቃጠሎ': 'commercial', 'የሻይ ቤት ቃጠሎ': 'commercial', 'የምግብቤት ቃጠሎ': 'commercial',
    'የሬስቶራንት ቃጠሎ': 'commercial', 'የእስቶር ቃጠሎ': 'commercial',
    'መጋዘን ቃጠሎ': 'commercial', 'የመጋዘን ቃጠሎ': 'commercial', 'የሼድ ቃጠሎ': 'commercial',
    'የፋብሪካ ቃጠሎ': 'industrial', 'የጥጥ ፋብሪካ ቃጠሎ': 'industrial',
    'የፈርኒቸርተረፈምርት ቃጠሎ': 'industrial', 'የወፍጮ ቤት ቃጠሎ': 'industrial',
    'ትራንስፎርመር ቃጠሎ': 'industrial', 'የትራንስፎርመር ቃጠሎ': 'industrial', 'የፖል ቃጠሎ': 'industrial',
    'የጫካ ቃጠሎ': 'wildland', 'የሳር ክምር ቃጠሎ': 'wildland', 'የጭድ ክምር ቃጠሎ': 'wildland',
    'የዛፍ ቃጠሎ': 'wildland', 'የቅጠል ክምር ቃጠሎ': 'wildland', 'የሰደድ እሳት': 'wildland',
    'የጤፍ ክምር ቃጠሎ': 'wildland', 'የእህል ክምር ቃጠሎ': 'wildland', 'የእንጨት ክምር ቃጠሎ': 'wildland',
    'የመኪና ቃጠሎ': 'vehicle', 'የጎማ ቃጠሎ': 'vehicle', 'የመኪና አደጋ': 'vehicle',
    'የመኪና መገልበጥ': 'vehicle', 'የመኪና መገልበጥ አደጋ': 'vehicle',
}

DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
             'July', 'August', 'September', 'October', 'November', 'December']

TIPS = {
    'residential': [
        'Residential fires dominate — inspect kitchens in high-density kebeles on peak days.',
        'Distribute fire safety pamphlets door-to-door in the station coverage zone.',
        'Verify homes have working smoke detectors before peak season.',
        'Run community sessions on safe cooking and charcoal handling.',
    ],
    'commercial': [
        'Inspect commercial kitchens and markets for fire code compliance.',
        'Ensure all shops have accessible extinguishers and clear exit routes.',
        'Coordinate with trade bureau to enforce fire safety certificates.',
    ],
    'vehicle': [
        'Deploy vehicle inspection checkpoints on major roads in the coverage zone.',
        'Educate drivers on fuel system maintenance and safe parking distances.',
    ],
    'wildland': [
        'Pre-position resources near green belt areas before the dry season (Oct-Feb).',
        'Clear 10m vegetation buffers around the urban-wildland interface.',
        'Monitor wind forecasts daily during peak months.',
    ],
    'industrial': [
        'Schedule transformer and electrical infrastructure inspections monthly.',
        'Verify sprinkler systems in all large warehouses in the coverage area.',
        'Report overloaded power lines to Ethiopian Electric Power (EEP).',
    ],
    'other': [
        'Ensure all station equipment is serviced before peak risk periods.',
        'Run monthly community fire drills in highest-density areas.',
        'Increase patrols during peak day/time windows.',
    ],
}

_DATA = None


def _load():
    global _DATA
    if _DATA is not None:
        return _DATA
    path = os.path.join(os.path.dirname(__file__), '..', 'ml_dataset_readable.csv')
    rows = []
    with open(path, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            r['station'] = STATION_MAP.get(r['sub_city'].strip(), 'Unknown')
            r['fire_type_en'] = FIRE_TYPE_MAP.get(r['fire_type'].strip(), 'other')
            rows.append(r)
    _DATA = rows
    return rows


def predict_station(station=None):
    rows = _load()
    data = [r for r in rows if station is None or r['station'] == station]
    if not data:
        return None

    n = len(data)
    by_day, by_month = [0] * 7, [0] * 12
    fire_types, severity = Counter(), Counter()
    responses, damages = [], []
    woreda_counts = Counter()

    for r in data:
        try:
            by_day[int(r['weekday'])] += 1
        except Exception:
            pass
        try:
            by_month[int(r['month']) - 1] += 1
        except Exception:
            pass
        fire_types[r['fire_type_en']] += 1
        severity[r['severity']] += 1
        try:
            responses.append(float(r['response_minutes']))
        except Exception:
            pass
        try:
            damages.append(float(r['property_damage']))
        except Exception:
            pass
        if r.get('woreda'):
            woreda_counts[r['woreda'].strip()] += 1

    peak_day = by_day.index(max(by_day))
    peak_month = by_month.index(max(by_month))
    top_type = fire_types.most_common(1)[0][0] if fire_types else 'residential'

    avg_per_day = n / 730
    day_avg = n / 7
    mults = [(c / day_avg if day_avg > 0 else 1) for c in by_day]

    today = datetime.now()
    forecast = []
    for i in range(7):
        d = today + timedelta(days=i + 1)
        dow = d.weekday()
        pred = round(avg_per_day * mults[dow] * 10) / 10
        risk = 'High' if pred >= avg_per_day * 1.5 else 'Medium' if pred >= avg_per_day else 'Low'
        forecast.append({
            'date': d.strftime('%a %b %d').replace(' 0', ' '),
            'dayOfWeek': DAYS[dow],
            'predicted': max(0, pred),
            'riskLevel': risk,
        })

    risk_score = min(100, round(
        (by_day[peak_day] / max(max(by_day), 1)) * 40 +
        (by_month[peak_month] / max(max(by_month), 1)) * 40 +
        (n / 730) * 20
    ))

    tips = TIPS.get(top_type, TIPS['other']).copy()
    tips[0] = (f"Peak: {DAYS[peak_day]}s in {MONTHS_EN[peak_month]} "
               f"({by_month[peak_month]} incidents historically). " + tips[0])

    return {
        'station': station or 'All Stations (City-wide)',
        'totalIncidents': n,
        'period': '2016–2017 Addis Ababa Fire Records',
        'dataSource': 'Historical dataset — 535 verified incidents',
        'peakDay': DAYS[peak_day],
        'peakMonth': MONTHS_EN[peak_month],
        'dominantType': top_type,
        'severityBreakdown': dict(severity),
        'fireTypeBreakdown': dict(fire_types.most_common()),
        'avgResponseMinutes': round(sum(responses) / len(responses), 1) if responses else 0,
        'avgPropertyDamage': round(sum(damages) / len(damages), 1) if damages else 0,
        'topWoredas': [w for w, _ in woreda_counts.most_common(3) if w],
        'byDay': by_day,
        'byMonth': by_month,
        'forecast': forecast,
        'preventionTips': tips,
        'riskScore': risk_score,
    }
