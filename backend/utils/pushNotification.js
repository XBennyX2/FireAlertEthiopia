const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Only initialize if VAPID credentials are present
if (process.env.VAPID_EMAIL && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
} else {
  console.warn('VAPID credentials not set — push notifications disabled.');
}

async function sendPushToUser(userId, payload) {
  if (!process.env.VAPID_EMAIL) return; // skip silently if not configured
  try {
    const subs = await PushSubscription.find({ userId });
    for (const sub of subs) {
      await webpush.sendNotification(sub.subscription, JSON.stringify(payload))
        .catch(err => {
          if (err.statusCode === 410) {
            PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
          }
        });
    }
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
}

module.exports = { sendPushToUser };