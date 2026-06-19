from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from pymongo import MongoClient
from bson import ObjectId

from modules.duplicate_detection  import check_duplicate
from modules.false_report_scorer  import calculate_report_trust_score, update_reputation_score
from modules.heatmap_analytics    import generate_risk_heatmap, generate_trend_analysis
from modules.text_classifier      import classify_description, classify_severity_from_text
from modules.image_classifier     import analyze_fire_image

load_dotenv()

app    = Flask(__name__)
CORS(app)

# MongoDB connection
client = MongoClient(os.getenv('MONGO_URI'))
db     = client.get_default_database()

print("All AI models loaded. Flask app ready.")


# ── 1. Duplicate check ────────────────────────────────────────────
@app.route('/api/ai/check-duplicate', methods=['POST'])
def route_check_duplicate():
    data       = request.json
    new_report = data.get('new_report', {})

    recent = list(db.incidents.find(
        {'status': {'$ne': 'rejected'}},
        {'_id': 1, 'location': 1, 'reportedAt': 1}
    ).sort('reportedAt', -1).limit(200))

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


# ── 2. Severity + description analysis (NOW REAL AI) ─────────────
@app.route('/api/ai/classify-severity', methods=['POST'])
def route_classify_severity():
    data        = request.json
    description = data.get('description', '')
    fire_type   = data.get('fire_type', '')

    # Real language understanding — not keyword matching
    emergency_result = classify_description(description)
    severity_result  = classify_severity_from_text(description)

    print(f"Description analysis -> emergency: {emergency_result['is_genuine_emergency']} "
          f"confidence: {emergency_result['emergency_confidence']} "
          f"severity: {severity_result['predicted_severity']}")

    return jsonify({
        'predicted_severity':       severity_result['predicted_severity'],
        'severity_confidence':      severity_result['confidence'],
        'is_genuine_emergency':     emergency_result['is_genuine_emergency'],
        'emergency_confidence':     emergency_result['emergency_confidence'],
        'top_label':                emergency_result['top_label'],
        'all_scores':               emergency_result['all_scores'],
        'credibility_adjustment':   _emergency_to_credibility(emergency_result),
        'is_vague':                 emergency_result['emergency_confidence'] < 0.2,
    })


def _emergency_to_credibility(emergency_result):
    """
    Convert the emergency classification confidence into a
    credibility score adjustment that feeds the trust scorer.
    """
    confidence = emergency_result['emergency_confidence']
    top_label  = emergency_result['top_label']

    # Strong genuine emergency signal
    if emergency_result['is_genuine_emergency'] and confidence > 0.6:
        return 20
    if emergency_result['is_genuine_emergency'] and confidence > 0.4:
        return 10

    # Explicitly non-emergency content
    if 'socializing' in top_label or 'having fun' in top_label:
        return -35
    if 'joke' in top_label or 'test' in top_label or 'unrelated' in top_label:
        return -30
    if 'minor' in top_label or 'under control' in top_label:
        return -10

    # Ambiguous — small penalty
    return -5


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


# ── 7. Image-based fire verification (NOW REAL CLIP AI) ──────────
@app.route('/api/ai/analyze-image', methods=['POST'])
def route_analyze_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file        = request.files['image']
    image_bytes = file.read()

    if len(image_bytes) == 0:
        return jsonify({'error': 'Empty image file'}), 400

    result = analyze_fire_image(image_bytes)

    print(f"Image analysis -> fire_detected: {result['fire_detected']} "
          f"confidence: {result['fire_confidence']}% "
          f"top_label: {result['top_label']}")

    return jsonify(result)


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    print(f'AI microservice running on port {port}')
    app.run(port=port, debug=True)