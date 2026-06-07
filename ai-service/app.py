from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from pymongo import MongoClient
from bson import ObjectId

from modules.duplicate_detection  import check_duplicate
from modules.severity_classifier  import classify_severity
from modules.false_report_scorer  import calculate_report_trust_score, update_reputation_score
from modules.heatmap_analytics    import generate_risk_heatmap, generate_trend_analysis

load_dotenv()

app    = Flask(__name__)
CORS(app)

# MongoDB connection
client = MongoClient(os.getenv('MONGO_URI'))
db     = client.get_default_database()


# ── 1. Duplicate check ────────────────────────────────────────────
@app.route('/api/ai/check-duplicate', methods=['POST'])
def route_check_duplicate():
    data       = request.json
    new_report = data.get('new_report', {})

    recent = list(db.incidents.find(
        {'status': {'$ne': 'rejected'}},
        {'_id': 1, 'location': 1, 'reportedAt': 1}
    ).sort('reportedAt', -1).limit(200))

    # Flatten location fields for the module
    flattened = []
    for r in recent:
        try:
            flattened.append({
                '_id':         str(r['_id']),
                'lat':         r['location']['lat'],
                'lng':         r['location']['lng'],
                'reported_at': r['reportedAt'].isoformat()
            })
        except (KeyError, AttributeError):
            continue

    result = check_duplicate(new_report, flattened)
    return jsonify(result)


# ── 2. Severity classification ────────────────────────────────────
@app.route('/api/ai/classify-severity', methods=['POST'])
def route_classify_severity():
    data      = request.json
    result    = classify_severity(
        data.get('description', ''),
        data.get('fire_type', '')
    )
    return jsonify(result)


# ── 3. Trust score ────────────────────────────────────────────────
@app.route('/api/ai/score-report', methods=['POST'])
def route_score_report():
    result = calculate_report_trust_score(request.json)
    return jsonify(result)


# ── 4. Reputation update ──────────────────────────────────────────
@app.route('/api/ai/update-reputation', methods=['POST'])
def route_update_reputation():
    data      = request.json
    new_score = update_reputation_score(
        data.get('current_score', 50),
        data.get('outcome', '')
    )
    return jsonify({'new_reputation_score': new_score})


# ── 5. Heatmap ────────────────────────────────────────────────────
@app.route('/api/ai/heatmap', methods=['GET'])
def route_heatmap():
    incidents = list(db.incidents.find(
        {},
        {'_id': 0, 'location': 1, 'severity': 1, 'reportedAt': 1}
    ))
    flattened = []
    for i in incidents:
        try:
            flattened.append({
                'lat':         i['location']['lat'],
                'lng':         i['location']['lng'],
                'severity':    i.get('severity', 'Medium'),
                'reported_at': i['reportedAt'].isoformat()
            })
        except (KeyError, AttributeError):
            continue

    result = generate_risk_heatmap(flattened)
    return jsonify(result)


# ── 6. Trends ─────────────────────────────────────────────────────
@app.route('/api/ai/trends', methods=['GET'])
def route_trends():
    incidents = list(db.incidents.find(
        {},
        {'_id': 0, 'fire_type': 1, 'severity': 1, 'reportedAt': 1}
    ))
    flattened = []
    for i in incidents:
        try:
            flattened.append({
                'fire_type':   i.get('fire_type', 'unknown'),
                'severity':    i.get('severity', 'Medium'),
                'reported_at': i['reportedAt'].isoformat()
            })
        except (KeyError, AttributeError):
            continue

    result = generate_trend_analysis(flattened)
    return jsonify(result)


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    print(f'AI microservice running on port {port}')
    app.run(port=port, debug=True)