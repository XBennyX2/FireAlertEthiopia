from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

TRAINING_DATA = [
    ("small fire smoke kitchen stove minor", "residential", "Low"),
    ("large building engulfed flames multiple floors spreading", "residential", "High"),
    ("vehicle car fire engine smoke", "vehicle", "Medium"),
    ("warehouse industrial fire explosions hazardous materials", "industrial", "High"),
    ("trash bin garbage small contained", "other", "Low"),
    ("forest wildland fire spreading wind uncontrolled", "wildland", "High"),
    ("electrical fire short circuit fuse box", "residential", "Medium"),
    ("candle curtain small room contained", "residential", "Low"),
    ("gas explosion fire apartment entire floor", "residential", "High"),
    ("restaurant kitchen fire extinguisher controlled", "commercial", "Medium"),
    ("abandoned building fire no injuries minor", "other", "Low"),
    ("school fire children trapped multiple exits blocked", "commercial", "High"),
    ("bus vehicle fire passengers evacuated", "vehicle", "High"),
    ("campfire out of control nearby houses", "wildland", "Medium"),
    ("factory fire chemical smoke workers trapped", "industrial", "High"),
]

texts  = [f"{item[0]} {item[1]}" for item in TRAINING_DATA]
labels = [item[2] for item in TRAINING_DATA]

pipeline = Pipeline([
    ('tfidf',       TfidfVectorizer()),
    ('classifier',  MultinomialNB())
])
pipeline.fit(texts, labels)


def classify_severity(description, fire_type):
    input_text   = f"{description} {fire_type}"
    prediction   = pipeline.predict([input_text])[0]
    probabilities = pipeline.predict_proba([input_text])[0]
    classes      = pipeline.classes_

    confidence = {
        cls: round(float(prob), 2)
        for cls, prob in zip(classes, probabilities)
    }

    return {
        'predicted_severity': prediction,
        'confidence_scores':  confidence
    }