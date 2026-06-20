export function getReputationLevel(score) {
  if (score >= 80) return {
    level:       'Normal',
    color:       '#22c55e',
    background:  'rgba(34,197,94,0.1)',
    border:      'rgba(34,197,94,0.25)',
    description: 'Your account is in good standing.',
    icon:        '✅',
  };
  if (score >= 60) return {
    level:       'Warning',
    color:       '#f4820a',
    background:  'rgba(244,130,10,0.1)',
    border:      'rgba(244,130,10,0.25)',
    description: 'Your account has received warnings. Avoid submitting false reports.',
    icon:        '⚠️',
  };
  if (score >= 30) return {
    level:       'Restricted',
    color:       '#e63c2f',
    background:  'rgba(230,60,47,0.1)',
    border:      'rgba(230,60,47,0.25)',
    description: 'Your account is restricted due to multiple false reports.',
    icon:        '🚫',
  };
  return {
    level:       'Banned',
    color:       '#7f1d1d',
    background:  'rgba(127,29,29,0.15)',
    border:      'rgba(127,29,29,0.3)',
    description: 'Your account has been banned for repeated violations.',
    icon:        '⛔',
  };
}

export function getReputationTips(score) {
  if (score >= 80) return [
    'Keep submitting accurate reports to maintain your score.',
    'Detailed descriptions with photos boost your credibility.',
    'Verified reports earn +10 reputation points each.',
  ];
  if (score >= 60) return [
    'Your score has dropped — double check reports before submitting.',
    'Add a live photo to every report to increase trust.',
    'Each false report costs -15 points.',
  ];
  if (score >= 30) return [
    'You are at risk of being banned. Only submit genuine fire reports.',
    'Improving your score requires verified reports over time.',
    'Contact support if you believe a report was unfairly rejected.',
  ];
  return [
    'Your account is banned due to repeated false reports.',
    'Contact support to appeal this decision.',
  ];
}