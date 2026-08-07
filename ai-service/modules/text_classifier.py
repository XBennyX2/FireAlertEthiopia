try:
    from transformers import pipeline
except Exception as exc:
    pipeline = None
    print(f"Transformers unavailable: {exc}")

print("Loading text classification model... (first run downloads ~1.6GB, please wait)")

# Zero-shot classification — understands meaning, not just keywords
if pipeline is not None:
    try:
        _classifier = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=-1  # -1 = CPU. Change to 0 if you have a CUDA GPU
        )
        print("Transformer-based text classifier loaded successfully.")
    except Exception as exc:
        print(f"Transformer-based text classifier unavailable: {exc}")
        _classifier = None
else:
    print("Transformer package not installed; using keyword fallback for text classification.")
    _classifier = None


def classify_description(description):
    """
    Use real language understanding when available, otherwise fall back to
    lightweight keyword heuristics so the service still responds.
    """
    if not description or len(description.strip()) < 3:
        return {
            'is_genuine_emergency': False,
            'emergency_confidence':  0.0,
            'top_label':             'empty_description',
            'all_scores':            {},
        }

    text = description.lower()
    if _classifier is None:
        if any(word in text for word in ['fire', 'smoke', 'burning', 'explosion', 'trapped', 'help', 'urgent']):
            return {
                'is_genuine_emergency': True,
                'emergency_confidence': 0.55,
                'top_label': 'fire_emergency_keyword_match',
                'all_scores': {'fire_emergency_keyword_match': 0.55},
            }
        if any(word in text for word in ['joke', 'test', 'haha', 'party', 'fun', 'social', 'selfie']):
            return {
                'is_genuine_emergency': False,
                'emergency_confidence': 0.15,
                'top_label': 'non_emergency_keyword_match',
                'all_scores': {'non_emergency_keyword_match': 0.15},
            }
        return {
            'is_genuine_emergency': False,
            'emergency_confidence': 0.2,
            'top_label': 'ambiguous_description',
            'all_scores': {'ambiguous_description': 0.2},
        }

    candidate_labels = [
        "a genuine fire emergency happening right now",
        "a joke, test message, or unrelated casual conversation",
        "people enjoying themselves with no danger",
        "a minor incident already under control",
    ]

    result = _classifier(description, candidate_labels)

    # result['labels'] and result['scores'] are sorted descending by confidence
    top_label      = result['labels'][0]
    top_score      = result['scores'][0]
    emergency_score = next(
        (score for label, score in zip(result['labels'], result['scores'])
         if label == candidate_labels[0]),
        0.0
    )

    is_genuine = top_label == candidate_labels[0] and top_score > 0.4

    all_scores = {label: round(float(score), 3) for label, score in zip(result['labels'], result['scores'])}

    return {
        'is_genuine_emergency':  bool(is_genuine),
        'emergency_confidence':  round(float(emergency_score), 3),
        'top_label':             top_label,
        'all_scores':            all_scores,
    }


def classify_severity_from_text(description):
    """
    Separately classify severity level using the same model
    with a different label set.
    """
    if not description or len(description.strip()) < 3:
        return {'predicted_severity': 'Medium', 'confidence': 0.0}

    severity_labels = [
        "a life-threatening high severity emergency with people trapped or injured",
        "a moderate fire that is spreading and needs urgent response",
        "a small, low severity, contained fire incident",
    ]

    result = _classifier(description, severity_labels)
    top_label = result['labels'][0]
    top_score = result['scores'][0]

    if 'life-threatening' in top_label or 'trapped' in top_label:
        severity = 'High'
    elif 'moderate' in top_label or 'spreading' in top_label:
        severity = 'Medium'
    else:
        severity = 'Low'

    return {
        'predicted_severity': severity,
        'confidence':          round(float(top_score), 3),
    }