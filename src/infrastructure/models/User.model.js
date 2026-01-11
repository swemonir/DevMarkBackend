const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* 🔐 Hash password */
userSchema.pre("save", function(next) {
  if (!this.isModified("password")) return next();
  
  const user = this;
  bcrypt.hash(user.password, 12, (err, hashedPassword) => {
    if (err) return next(err);
    user.password = hashedPassword;
    next();
  });
});

/* 🔑 Compare password */
userSchema.methods.comparePassword = function (password, callback) {
  bcrypt.compare(password, this.password, (err, isMatch) => {
    if (err) return callback(err);
    callback(null, isMatch);
  });
};

module.exports = mongoose.model("User", userSchema);
