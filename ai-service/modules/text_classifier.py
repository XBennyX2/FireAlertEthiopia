from transformers import pipeline

print("Loading text classification model... (first run downloads ~1.6GB, please wait)")

# Zero-shot classification — understands meaning, not just keywords
_classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli",
    device=-1  # -1 = CPU. Change to 0 if you have a CUDA GPU
)

print("Text classification model loaded successfully.")


def classify_description(description):
    """
    Use real language understanding to determine if a description
    genuinely describes a fire emergency vs something else entirely.
    """
    if not description or len(description.strip()) < 3:
        return {
            'is_genuine_emergency': False,
            'emergency_confidence':  0.0,
            'top_label':             'empty_description',
            'all_scores':            {},
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