def calculate_report_trust_score(report_data):
    trust_score = 100
    flags       = []

    if not report_data.get('has_media', False):
        trust_score -= 20
        flags.append('NO_MEDIA_ATTACHED')

    if report_data.get('has_media') and not report_data.get('media_is_live', False):
        trust_score -= 15
        flags.append('MEDIA_NOT_LIVE_CAPTURED')

    reputation = report_data.get('reporter_reputation_score', 50)
    if reputation < 30:
        trust_score -= 30
        flags.append('LOW_REPUTATION_REPORTER')
    elif reputation < 60:
        trust_score -= 10
        flags.append('MODERATE_REPUTATION_REPORTER')

    gps_accuracy = report_data.get('gps_accuracy_meters', 50)
    if gps_accuracy > 200:
        trust_score -= 15
        flags.append('POOR_GPS_ACCURACY')
    elif gps_accuracy > 100:
        trust_score -= 5

    desc_length = report_data.get('description_length', 0)
    if desc_length < 20:
        trust_score -= 15
        flags.append('VERY_SHORT_DESCRIPTION')
    elif desc_length < 50:
        trust_score -= 5
        flags.append('SHORT_DESCRIPTION')

    prior_false = report_data.get('reporter_previous_false_reports', 0)
    if prior_false >= 3:
        trust_score -= 25
        flags.append('REPEAT_FALSE_REPORTER')
    elif prior_false >= 1:
        trust_score -= 10
        flags.append('PREVIOUS_FALSE_REPORTS')

    if report_data.get('is_duplicate', False):
        trust_score -= 10
        flags.append('POSSIBLE_DUPLICATE')

    trust_score = max(0, min(100, trust_score))

    if trust_score >= 75:
        risk_level = 'LOW_RISK'
    elif trust_score >= 50:
        risk_level = 'MEDIUM_RISK'
    else:
        risk_level = 'HIGH_RISK'

    return {
        'trust_score':          trust_score,
        'risk_level':           risk_level,
        'flags':                flags,
        'auto_flag_for_review': trust_score < 50
    }


def update_reputation_score(current_score, outcome):
    adjustments = {
        'verified':     10,
        'false_report': -15,
        'spam':         -25
    }
    new_score = current_score + adjustments.get(outcome, 0)
    return max(0, min(100, new_score))