const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

async function sendPushToUser(userId, payload) {
  try {
    const subs = await PushSubscription.find({ userId });
    for (const sub of subs) {
      await webpush.sendNotification(sub.subscription, JSON.stringify(payload))
        .catch(err => {
          // Remove invalid/expired subscriptions
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