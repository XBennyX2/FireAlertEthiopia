import torch
import clip
from PIL import Image
import io

print("Loading CLIP image classification model... (first run downloads ~600MB, please wait)")

_device = "cpu"  # change to "cuda" if you have a GPU
_model, _preprocess = clip.load("ViT-B/32", device=_device)

print("CLIP image model loaded successfully.")

# ── Candidate labels CLIP will compare the image against ───────────
CANDIDATE_LABELS = [
    "a real fire with visible flames",
    "smoke from a fire or burning building",
    "a person posing for a photo or selfie",
    "people socializing or having fun indoors",
    "an unrelated everyday scene with no fire",
    "a dark or blurry photo with nothing identifiable",
]

FIRE_RELATED_LABELS = {
    "a real fire with visible flames",
    "smoke from a fire or burning building",
}


def analyze_fire_image(image_bytes):
    """
    Use real CLIP vision-language understanding to determine
    if an image genuinely shows fire/smoke vs something else.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        image_input = _preprocess(image).unsqueeze(0).to(_device)
        text_inputs = clip.tokenize(CANDIDATE_LABELS).to(_device)

        with torch.no_grad():
            image_features = _model.encode_image(image_input)
            text_features  = _model.encode_text(text_inputs)

            image_features /= image_features.norm(dim=-1, keepdim=True)
            text_features  /= text_features.norm(dim=-1, keepdim=True)

            similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
            probs = similarity[0].cpu().numpy()

        scores = {
            label: round(float(prob), 4)
            for label, prob in zip(CANDIDATE_LABELS, probs)
        }

        top_label = max(scores, key=scores.get)
        top_score = scores[top_label]

        fire_confidence = sum(
            scores[label] for label in FIRE_RELATED_LABELS
        )

        fire_detected = top_label in FIRE_RELATED_LABELS and top_score > 0.35

        flags = []
        if top_label == "a person posing for a photo or selfie":
            flags.append('IMAGE_SHOWS_PERSON_NOT_FIRE')
        if top_label == "people socializing or having fun indoors":
            flags.append('IMAGE_SHOWS_SOCIAL_SCENE_NOT_EMERGENCY')
        if top_label == "an unrelated everyday scene with no fire":
            flags.append('IMAGE_UNRELATED_TO_FIRE')
        if top_label == "a dark or blurry photo with nothing identifiable":
            flags.append('IMAGE_UNCLEAR_OR_LOW_QUALITY')
        if not fire_detected:
            flags.append('NO_FIRE_VISUAL_SIGNATURE')

        return {
            'fire_detected':      bool(fire_detected),
            'fire_confidence':    round(float(fire_confidence) * 100, 1),
            'top_label':          top_label,
            'top_label_score':    round(float(top_score), 3),
            'all_scores':         scores,
            'overall_verified':   bool(fire_detected),
            'flags':              flags,
        }

    except Exception as e:
        return {
            'fire_detected':    False,
            'fire_confidence':  0,
            'top_label':        'analysis_failed',
            'overall_verified': False,
            'flags':            ['IMAGE_ANALYSIS_FAILED'],
            'error':            str(e),
        }

