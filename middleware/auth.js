const passport = require("passport");
const User = require("../models/userModel");
const LocalStrategy = require("passport-local").Strategy;

passport.use(
  new LocalStrategy(async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email });
      if (!user) return done(null, false, { message: "incorrect email" });
      const isPasswordMatch = await user.comparePassword(password);
      if (isPasswordMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: "incorrect password" });
      }
    } catch (err) {
      return done(err);
    }
  })
);

module.exports = passport;
