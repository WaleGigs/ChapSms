const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Wallet = require("../models/Wallet");

const generateOTP = require("../utils/generateOTP");
const hashToken = require("../utils/hashToken");
const generateApiKey = require("../utils/generateApiKey");
const { generateToken } = require("../utils/jwt");

const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/email.service");

const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
const PASSWORD_RESET_EXPIRY_MINUTES = 10;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeUsername(username) {
  return String(username || "")
    .trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email || "").trim()
  );
}

function validatePassword(password) {
  const value =
    String(password || "");

  if (!value) {
    return "Password is required";
  }

  if (
    value.length < 6 ||
    value.length > 64
  ) {
    return "Password must contain 6–64 characters";
  }

  if (/\s/.test(value)) {
    return "Password must not contain spaces";
  }

  return "";
}

function getExpiryDate(minutes) {
  return new Date(
    Date.now() +
      minutes * 60 * 1000
  );
}

function getDisplayName(user) {
  const legacyName = [
    user?.firstName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    user?.username ||
    legacyName ||
    "there"
  );
}

function serializeUser(
  user,
  walletBalance
) {
  return {
    id: user._id,
    username:
      user.username ||
      null,
    firstName:
      user.firstName ||
      null,
    lastName:
      user.lastName ||
      null,
    displayName:
      getDisplayName(user),
    email: user.email,
    wallet:
      walletBalance ??
      user.wallet ??
      0,
    role: user.role,
    suspended:
      user.suspended,
    isVerified:
      user.isVerified,
    authProvider:
      user.authProvider,
    lastLogin:
      user.lastLogin,
    createdAt:
      user.createdAt,
    updatedAt:
      user.updatedAt,
  };
}

function queueVerificationEmail({
  user,
  code,
}) {
  setImmediate(async () => {
    try {
      await sendVerificationEmail({
        to: user.email,
        username:
          getDisplayName(user),
        code,
      });
    } catch (error) {
      console.error(
        "Background verification email failed:",
        {
          userId:
            user._id?.toString?.(),
          email:
            user.email,
          code:
            error?.code,
          message:
            error?.message,
        }
      );
    }
  });
}

exports.register = async (
  req,
  res
) => {
  try {
    const username =
      normalizeUsername(
        req.body.username
      );

    const email =
      normalizeEmail(
        req.body.email
      );

    const password =
      String(
        req.body.password || ""
      );

    if (
      !username ||
      !email ||
      !password
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Username, email and password are required",
        });
    }

    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({
          success: false,
          code:
            "INVALID_EMAIL",
          message:
            "Enter a valid email address",
        });
    }

    const passwordError =
      validatePassword(
        password
      );

    if (passwordError) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            passwordError,
        });
    }

    const existingUser =
      await User.findOne({
        $or: [
          { email },
          { username },
        ],
      }).collation({
        locale: "en",
        strength: 2,
      });

    if (existingUser) {
      const duplicateEmail =
        existingUser.email ===
        email;

      return res
        .status(409)
        .json({
          success: false,
          code:
            duplicateEmail
              ? "EMAIL_ALREADY_EXISTS"
              : "USERNAME_ALREADY_EXISTS",
          message:
            duplicateEmail
              ? "An account with this email already exists"
              : "This username is already in use",
        });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    const verificationCode =
      generateOTP(6);

    const createdUser =
      await User.create({
        username,
        email,
        password:
          hashedPassword,
        authProvider:
          "local",
        isVerified: false,
        verificationCodeHash:
          hashToken(
            verificationCode
          ),
        verificationExpires:
          getExpiryDate(
            VERIFICATION_CODE_EXPIRY_MINUTES
          ),
        apiKey:
          generateApiKey(),
      });

    let wallet;

    try {
      wallet =
        await Wallet.create({
          user:
            createdUser._id,
          balance: 0,
        });
    } catch (walletError) {
      await User.deleteOne({
        _id:
          createdUser._id,
      }).catch(() => {});

      throw walletError;
    }

    queueVerificationEmail({
      user:
        createdUser,
      code:
        verificationCode,
    });

    return res
      .status(201)
      .json({
        success: true,
        code:
          "ACCOUNT_CREATED",
        emailQueued: true,
        message:
          "Account created successfully. Check your email for the verification code. If it is delayed, use Resend Code.",
        user: serializeUser(
          createdUser,
          wallet.balance
        ),
      });
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    if (
      error.code === 11000
    ) {
      const duplicateKey =
        Object.keys(
          error.keyPattern ||
            error.keyValue ||
            {}
        )[0];

      return res
        .status(409)
        .json({
          success: false,
          code:
            duplicateKey ===
            "username"
              ? "USERNAME_ALREADY_EXISTS"
              : "EMAIL_ALREADY_EXISTS",
          message:
            duplicateKey ===
            "username"
              ? "This username is already in use"
              : "An account with this email already exists",
        });
    }

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Registration failed",
      });
  }
};

exports.verifyEmail = async (
  req,
  res
) => {
  try {
    const email =
      normalizeEmail(
        req.body.email
      );

    const verificationCode =
      String(
        req.body.code ||
          req.body
            .verificationCode ||
          ""
      ).trim();

    if (
      !email ||
      !verificationCode
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Email and verification code are required",
        });
    }

    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({
          success: false,
          code:
            "INVALID_EMAIL",
          message:
            "Enter a valid email address",
        });
    }

    const user =
      await User.findOne({
        email,
      }).select(
        "+verificationCodeHash +verificationExpires"
      );

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Account not found",
        });
    }

    if (user.isVerified) {
      return res.json({
        success: true,
        message:
          "Email is already verified",
      });
    }

    if (
      !user.verificationCodeHash ||
      !user.verificationExpires
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "No active verification code was found. Request a new code.",
        });
    }

    if (
      user.verificationExpires.getTime() <
      Date.now()
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Verification code has expired. Request a new code.",
        });
    }

    if (
      hashToken(
        verificationCode
      ) !==
      user.verificationCodeHash
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid verification code",
        });
    }

    user.isVerified = true;
    user.verificationCodeHash =
      null;
    user.verificationExpires =
      null;

    await user.save();

    return res.json({
      success: true,
      message:
        "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error(
      "Email verification error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Email verification failed",
      });
  }
};

exports.resendVerificationCode =
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body.email
        );

      if (!email) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Email is required",
          });
      }

      if (!isValidEmail(email)) {
        return res
          .status(400)
          .json({
            success: false,
            code:
              "INVALID_EMAIL",
            message:
              "Enter a valid email address",
          });
      }

      const user =
        await User.findOne({
          email,
        }).select(
          "+verificationCodeHash +verificationExpires"
        );

      if (!user) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Account not found",
          });
      }

      if (
        user.authProvider !==
        "local"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "This account uses Google authentication",
          });
      }

      if (user.isVerified) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Email is already verified",
          });
      }

      const verificationCode =
        generateOTP(6);

      user.verificationCodeHash =
        hashToken(
          verificationCode
        );

      user.verificationExpires =
        getExpiryDate(
          VERIFICATION_CODE_EXPIRY_MINUTES
        );

      await user.save();

      try {
        await sendVerificationEmail({
          to: user.email,
          username:
            getDisplayName(user),
          code:
            verificationCode,
        });
      } catch (emailError) {
        console.error(
          "Resend verification email failed:",
          emailError
        );

        return res
          .status(503)
          .json({
            success: false,
            code:
              "EMAIL_DELIVERY_FAILED",
            accountCreated:
              true,
            message:
              "Your account exists, but the verification email could not be delivered. Check the SMTP settings and try again.",
          });
      }

      return res.json({
        success: true,
        message:
          "A new verification code has been sent to your email.",
      });
    } catch (error) {
      console.error(
        "Resend verification error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Could not resend the verification code",
        });
    }
  };

exports.login = async (
  req,
  res
) => {
  try {
    const email =
      normalizeEmail(
        req.body.email
      );

    const password =
      String(
        req.body.password || ""
      );

    if (
      !email ||
      !password
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Email and password are required",
        });
    }

    const user =
      await User.findOne({
        email,
      }).select("+password");

    if (
      !user ||
      !user.password
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Invalid email or password",
        });
    }

    if (
      user.authProvider !==
      "local"
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "This account uses Google authentication. Continue with Google.",
        });
    }

    if (user.suspended) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Your account has been suspended. Contact support.",
        });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({
          success: false,
          code:
            "EMAIL_NOT_VERIFIED",
          message:
            "Please verify your email before logging in.",
        });
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Invalid email or password",
        });
    }

    let wallet =
      await Wallet.findOne({
        user: user._id,
      });

    if (!wallet) {
      wallet =
        await Wallet.create({
          user: user._id,
          balance: 0,
        });
    }

    user.lastLogin =
      new Date();

    await user.save();

    const token =
      generateToken(user);

    return res.json({
      success: true,
      message:
        "Login successful",
      token,
      user: serializeUser(
        user,
        wallet.balance
      ),
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Login failed",
      });
  }
};

exports.getMe = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?._id ||
      req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Authentication required",
        });
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "User account not found",
        });
    }

    if (user.suspended) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Your account has been suspended. Contact support.",
        });
    }

    let wallet =
      await Wallet.findOne({
        user: user._id,
      });

    if (!wallet) {
      wallet =
        await Wallet.create({
          user: user._id,
          balance: 0,
        });
    }

    return res.json({
      success: true,
      user: serializeUser(
        user,
        wallet.balance
      ),
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Could not retrieve the current user",
      });
  }
};

exports.forgotPassword =
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body.email
        );

      if (!email) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Email is required",
          });
      }

      if (!isValidEmail(email)) {
        return res
          .status(400)
          .json({
            success: false,
            code:
              "INVALID_EMAIL",
            message:
              "Enter a valid email address",
          });
      }

      const genericResponse = {
        success: true,
        message:
          "If an account exists with that email, a password reset code has been sent.",
      };

      const user =
        await User.findOne({
          email,
        }).select(
          "+passwordResetCodeHash +passwordResetExpires"
        );

      if (
        !user ||
        user.authProvider !==
          "local" ||
        user.suspended
      ) {
        return res.json(
          genericResponse
        );
      }

      const resetCode =
        generateOTP(6);

      user.passwordResetCodeHash =
        hashToken(resetCode);

      user.passwordResetExpires =
        getExpiryDate(
          PASSWORD_RESET_EXPIRY_MINUTES
        );

      await user.save();

      try {
        await sendPasswordResetEmail({
          to: user.email,
          username:
            getDisplayName(user),
          code:
            resetCode,
        });
      } catch (emailError) {
        console.error(
          "Password reset email failed:",
          emailError
        );

        return res
          .status(503)
          .json({
            success: false,
            code:
              "EMAIL_DELIVERY_FAILED",
            message:
              "We could not send the password reset email. Check the SMTP settings and try again.",
          });
      }

      return res.json(
        genericResponse
      );
    } catch (error) {
      console.error(
        "Forgot password error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Password reset request failed",
        });
    }
  };

exports.resetPassword =
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body.email
        );

      const resetCode =
        String(
          req.body.code ||
            req.body.resetCode ||
            ""
        ).trim();

      const password =
        String(
          req.body.password ||
            ""
        );

      const confirmPassword =
        String(
          req.body
            .confirmPassword ||
            ""
        );

      if (
        !email ||
        !resetCode ||
        !password
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Email, reset code and new password are required",
          });
      }

      if (!isValidEmail(email)) {
        return res
          .status(400)
          .json({
            success: false,
            code:
              "INVALID_EMAIL",
            message:
              "Enter a valid email address",
          });
      }

      if (
        confirmPassword &&
        password !==
          confirmPassword
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Passwords do not match",
          });
      }

      const passwordError =
        validatePassword(
          password
        );

      if (passwordError) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              passwordError,
          });
      }

      const user =
        await User.findOne({
          email,
        }).select(
          "+password +passwordResetCodeHash +passwordResetExpires"
        );

      if (
        !user ||
        user.authProvider !==
          "local" ||
        !user.passwordResetCodeHash ||
        !user.passwordResetExpires
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid or expired password reset code",
          });
      }

      if (
        user.passwordResetExpires.getTime() <
        Date.now()
      ) {
        user.passwordResetCodeHash =
          null;

        user.passwordResetExpires =
          null;

        await user.save();

        return res
          .status(400)
          .json({
            success: false,
            message:
              "Password reset code has expired",
          });
      }

      if (
        hashToken(resetCode) !==
        user.passwordResetCodeHash
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid or expired password reset code",
          });
      }

      user.password =
        await bcrypt.hash(
          password,
          12
        );

      user.passwordResetCodeHash =
        null;

      user.passwordResetExpires =
        null;

      await user.save();

      return res.json({
        success: true,
        message:
          "Password reset successfully. You can now log in.",
      });
    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Password reset failed",
        });
    }
  };

exports.changePassword =
  async (req, res) => {
    try {
      const userId =
        req.user?._id ||
        req.user?.id;

      const currentPassword =
        String(
          req.body
            .currentPassword ||
            ""
        );

      const newPassword =
        String(
          req.body.newPassword ||
            ""
        );

      const confirmPassword =
        String(
          req.body
            .confirmPassword ||
            ""
        );

      if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Current password, new password and confirmation are required",
          });
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "New passwords do not match",
          });
      }

      const passwordError =
        validatePassword(
          newPassword
        );

      if (passwordError) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              passwordError,
          });
      }

      if (
        currentPassword ===
        newPassword
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "New password must be different from the current password",
          });
      }

      const user =
        await User.findById(
          userId
        ).select("+password");

      if (!user) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "User account not found",
          });
      }

      if (
        user.authProvider !==
        "local"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Google-authenticated accounts do not have a local password",
          });
      }

      const passwordMatches =
        await bcrypt.compare(
          currentPassword,
          user.password
        );

      if (!passwordMatches) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Current password is incorrect",
          });
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          12
        );

      user.passwordResetCodeHash =
        null;

      user.passwordResetExpires =
        null;

      await user.save();

      return res.json({
        success: true,
        message:
          "Password changed successfully",
      });
    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Password change failed",
        });
    }
  };