const passport      = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User          = require('../models/User');
const bcrypt        = require('bcryptjs');

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) return done(new Error('No email from Google'), null);

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // Existing user — mark as verified (Google verified the email)
      if (!user.isVerified) {
        user.isVerified = true;
        await user.save();
      }
      return done(null, user);
    }

    // New user — create account (no password needed for OAuth)
    const randomPassword = Math.random().toString(36) + Math.random().toString(36);
    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    user = await User.create({
      name:         profile.displayName || email.split('@')[0],
      email,
      password:     hashedPassword,
      profilePhoto: profile.photos?.[0]?.value || '',
      isVerified:   true,   // Google already verified the email
      googleId:     profile.id,
    });

    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;