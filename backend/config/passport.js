const passport = require('passport');
const User     = require('../models/User');
const bcrypt   = require('bcryptjs');

// Only register Google strategy if credentials are present
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;

  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      if (!email) return done(new Error('No email from Google'), null);

      let user = await User.findOne({ email });

      if (user) {
        if (!user.isVerified) {
          user.isVerified = true;
          await user.save();
        }
        return done(null, user);
      }

      const randomPassword = Math.random().toString(36) + Math.random().toString(36);
      const salt           = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        name:         profile.displayName || email.split('@')[0],
        email,
        password:     hashedPassword,
        profilePhoto: profile.photos?.[0]?.value || '',
        isVerified:   true,
        googleId:     profile.id,
      });

      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }));

  console.log('Google OAuth strategy registered.');
} else {
  console.warn('Google OAuth credentials not found — Google login disabled.');
}

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