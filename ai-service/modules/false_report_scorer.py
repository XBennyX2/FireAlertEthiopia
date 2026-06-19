def calculate_report_trust_score(report_data):
    print("=" * 50)
    print("RECEIVED REPORT DATA:")
    print(report_data)
    print("=" * 50)

    trust_score = 70  # realistic neutral baseline
    flags       = []

    # ── Signal 1: Media presence ─────────────────────────────────
    has_media = report_data.get('has_media', False)
    if not has_media:
        trust_score -= 15
        flags.append('NO_MEDIA_ATTACHED')

    # ── Signal 2: Live capture ────────────────────────────────────
    media_is_live = report_data.get('media_is_live', False)
    if has_media and not media_is_live:
        trust_score -= 20
        flags.append('MEDIA_NOT_LIVE_CAPTURED')
    elif has_media and media_is_live:
        trust_score += 8
        flags.append('LIVE_MEDIA_CONFIRMED')

    # ── Signal 3: CLIP image analysis ─────────────────────────────
    image_analysis = report_data.get('image_analysis')
    if image_analysis:
        fire_detected   = image_analysis.get('fire_detected', False)
        fire_confidence = image_analysis.get('fire_confidence', 0)
        top_label       = image_analysis.get('top_label', '')

        if fire_detected and fire_confidence > 40:
            trust_score += 25
            flags.append('FIRE_VISUALLY_CONFIRMED')
        elif fire_detected and fire_confidence > 20:
            trust_score += 12
            flags.append('FIRE_POSSIBLY_VISIBLE')
        else:
            # Image was submitted but shows no fire — strong fake signal
            trust_score -= 30
            flags.append('NO_FIRE_VISUAL_SIGNATURE')

            # Add the specific label from CLIP so responders know exactly what was seen
            if 'person' in top_label or 'selfie' in top_label:
                trust_score -= 10
                flags.append('IMAGE_SHOWS_PERSON_NOT_FIRE')
            elif 'socializing' in top_label or 'having fun' in top_label:
                trust_score -= 15
                flags.append('IMAGE_SHOWS_SOCIAL_SCENE_NOT_EMERGENCY')
            elif 'unrelated' in top_label:
                trust_score -= 10
                flags.append('IMAGE_UNRELATED_TO_FIRE')

        # Image quality flags from CLIP
        for flag in image_analysis.get('flags', []):
            if flag not in flags and flag != 'NO_FIRE_VISUAL_SIGNATURE':
                flags.append(flag)

    # ── Signal 4: Real text AI emergency classification ───────────
    # This comes directly from the transformer model, not keyword matching
    credibility_adj = report_data.get('description_credibility_adjustment', 0)
    is_vague        = report_data.get('description_is_vague', False)
    is_genuine      = report_data.get('description_is_genuine_emergency', False)
    emergency_conf  = report_data.get('description_emergency_confidence', 0.0)

    # Apply the credibility adjustment from the real NLP model
    trust_score += credibility_adj

    if is_vague:
        trust_score -= 12
        flags.append('VAGUE_OR_AMBIGUOUS_DESCRIPTION')

    if not is_genuine and emergency_conf < 0.2:
        trust_score -= 15
        flags.append('DESCRIPTION_NOT_CONSISTENT_WITH_EMERGENCY')
    elif is_genuine and emergency_conf > 0.6:
        trust_score += 10
        flags.append('DESCRIPTION_CONFIRMS_EMERGENCY')

    # ── Signal 5: Description length ──────────────────────────────
    desc_length = report_data.get('description_length', 0)
    if desc_length < 15:
        trust_score -= 15
        flags.append('VERY_SHORT_DESCRIPTION')
    elif desc_length < 40:
        trust_score -= 5
        flags.append('SHORT_DESCRIPTION')
    elif desc_length > 100:
        trust_score += 5  # detailed descriptions are a positive signal

    # ── Signal 6: Reporter reputation ─────────────────────────────
    reputation = report_data.get('reporter_reputation_score', 50)
    if reputation < 30:
        trust_score -= 25
        flags.append('LOW_REPUTATION_REPORTER')
    elif reputation < 60:
        trust_score -= 8
        flags.append('MODERATE_REPUTATION_REPORTER')
    elif reputation >= 90:
        trust_score += 8
        flags.append('HIGH_TRUST_REPORTER')

    # ── Signal 7: GPS validation ───────────────────────────────────
    gps_score = report_data.get('gps_validation_score', 50)
    if gps_score < 40:
        trust_score -= 25
        flags.append('GPS_VALIDATION_FAILED')
    elif gps_score < 60:
        trust_score -= 10
        flags.append('GPS_VALIDATION_LOW')
    elif gps_score >= 85:
        trust_score += 5
        flags.append('GPS_VALIDATION_STRONG')

    # ── Signal 8: Prior false reports ─────────────────────────────
    prior_false = report_data.get('reporter_previous_false_reports', 0)
    if prior_false >= 3:
        trust_score -= 30
        flags.append('REPEAT_FALSE_REPORTER')
    elif prior_false >= 1:
        trust_score -= 12
        flags.append('PREVIOUS_FALSE_REPORTS')

    # ── Signal 9: Duplicate detection ─────────────────────────────
    if report_data.get('is_duplicate', False):
        trust_score -= 12
        flags.append('POSSIBLE_DUPLICATE')

    # ── Clamp and finalize ─────────────────────────────────────────
    trust_score = max(0, min(100, round(trust_score)))

    if trust_score >= 75:
        risk_level = 'LOW_RISK'
    elif trust_score >= 50:
        risk_level = 'MEDIUM_RISK'
    else:
        risk_level = 'HIGH_RISK'

    result = {
        'trust_score':          trust_score,
        'risk_level':           risk_level,
        'flags':                list(set(flags)),
        'auto_flag_for_review': trust_score < 50,
    }

    print("CALCULATED RESULT:", result)
    print("=" * 50)

    return result


def update_reputation_score(current_score, outcome):
    adjustments = {
        'verified':     10,
        'false_report': -15,
        'spam':         -25,
    }
    new_score = current_score + adjustments.get(outcome, 0)
    return max(0, min(100, new_score))