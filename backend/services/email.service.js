const nodemailer = require("nodemailer");
const dns = require("node:dns");
const dnsPromises = require("node:dns").promises;

/*
 * Node.js can preserve the DNS result order returned by the operating system.
 * Prefer IPv4 because the current network cannot reach Gmail's IPv6 address.
 */
dns.setDefaultResultOrder("ipv4first");

const SMTP_HOST = String(
  process.env.SMTP_HOST || "smtp.gmail.com"
).trim();

const SMTP_PORT = Number(
  process.env.SMTP_PORT || 587
);

const SMTP_SECURE =
  String(process.env.SMTP_SECURE || "false")
    .trim()
    .toLowerCase() === "true";

const SMTP_USER = String(
  process.env.SMTP_USER || ""
)
  .trim()
  .toLowerCase();

const SMTP_PASS = String(
  process.env.SMTP_PASS || ""
)
  .replace(/\s+/g, "")
  .trim();

const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  `"ChapsSmS" <${SMTP_USER}>`;

const MAXIMUM_SEND_ATTEMPTS = 2;

let transporter = null;
let resolvedIpv4Address = null;
let ipv4AddressCursor = 0;

function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || "").trim()
  );
}

function validateEmailConfiguration() {
  const missing = [];

  if (!SMTP_USER) {
    missing.push("SMTP_USER");
  }

  if (!SMTP_PASS) {
    missing.push("SMTP_PASS");
  }

  if (missing.length > 0) {
    const error = new Error(
      `Missing email environment variables: ${missing.join(", ")}`
    );

    error.code = "EMAIL_CONFIG_MISSING";
    throw error;
  }

  if (!isValidEmailAddress(SMTP_USER)) {
    const error = new Error(
      "SMTP_USER must be a valid email address"
    );

    error.code = "INVALID_SMTP_USER";
    throw error;
  }

  if (SMTP_PORT === 465 && !SMTP_SECURE) {
    throw new Error(
      "SMTP_SECURE must be true when SMTP_PORT is 465"
    );
  }

  if (SMTP_PORT === 587 && SMTP_SECURE) {
    throw new Error(
      "SMTP_SECURE must be false when SMTP_PORT is 587"
    );
  }
}

async function resolveSmtpIpv4() {
  const addresses =
    await dnsPromises.resolve4(SMTP_HOST);

  if (
    !Array.isArray(addresses) ||
    addresses.length === 0
  ) {
    const error = new Error(
      `No IPv4 address was found for ${SMTP_HOST}`
    );

    error.code = "SMTP_IPV4_NOT_FOUND";
    throw error;
  }

  const address =
    addresses[
      ipv4AddressCursor %
        addresses.length
    ];

  ipv4AddressCursor += 1;

  return address;
}

async function createTransporter() {
  validateEmailConfiguration();

  resolvedIpv4Address =
    await resolveSmtpIpv4();

  transporter =
    nodemailer.createTransport({
      /*
       * Connect directly to an IPv4 address so Nodemailer
       * cannot select Gmail's unreachable IPv6 address.
       */
      host: resolvedIpv4Address,
      port: SMTP_PORT,
      secure: SMTP_SECURE,

      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },

      requireTLS:
        SMTP_PORT === 587,

      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      dnsTimeout: 8000,

      tls: {
        /*
         * Gmail's certificate belongs to smtp.gmail.com,
         * not to the resolved numeric IPv4 address.
         */
        servername: SMTP_HOST,
        minVersion: "TLSv1.2",
      },
    });

  console.log(
    "SMTP configured through IPv4:",
    {
      hostname: SMTP_HOST,
      address:
        resolvedIpv4Address,
      port: SMTP_PORT,
      secure:
        SMTP_SECURE,
    }
  );

  return transporter;
}

async function getTransporter() {
  if (!transporter) {
    return createTransporter();
  }

  return transporter;
}

function resetTransporter() {
  try {
    transporter?.close();
  } catch {
    // Ignore transporter close errors.
  }

  transporter = null;
  resolvedIpv4Address = null;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getGreetingName({
  username,
  firstName,
}) {
  return (
    String(
      username ||
        firstName ||
        "there"
    ).trim() || "there"
  );
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(
      resolve,
      milliseconds
    );
  });
}

async function sendMail(
  mailOptions
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <=
    MAXIMUM_SEND_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const currentTransporter =
        await getTransporter();

      const info =
        await currentTransporter.sendMail(
          mailOptions
        );

      console.log(
        `✅ Email sent to ${mailOptions.to}`
      );

      return info;
    } catch (error) {
      lastError = error;

      console.error(
        `❌ Email attempt ${attempt}/${MAXIMUM_SEND_ATTEMPTS} failed:`,
        {
          name:
            error.name,
          code:
            error.code,
          message:
            error.message,
          command:
            error.command,
          response:
            error.response,
          responseCode:
            error.responseCode,
          address:
            error.address,
          port:
            error.port,
        }
      );

      resetTransporter();

      if (
        attempt <
        MAXIMUM_SEND_ATTEMPTS
      ) {
        await wait(750);
      }
    }
  }

  throw lastError;
}

async function verifyEmailTransport() {
  try {
    const currentTransporter =
      await getTransporter();

    await currentTransporter.verify();

    console.log(
      `✅ SMTP ready through IPv4 ${resolvedIpv4Address}:${SMTP_PORT}`
    );

    return true;
  } catch (error) {
    resetTransporter();

    console.error(
      "❌ SMTP verification failed:",
      {
        code:
          error.code,
        message:
          error.message,
        response:
          error.response,
        responseCode:
          error.responseCode,
        address:
          error.address,
        port:
          error.port,
      }
    );

    return false;
  }
}

async function sendVerificationEmail({
  to,
  username,
  firstName,
  code,
}) {
  const recipient =
    String(to || "")
      .trim()
      .toLowerCase();

  const verificationCode =
    String(code || "")
      .trim();

  if (
    !isValidEmailAddress(
      recipient
    )
  ) {
    const error = new Error(
      "A valid verification email recipient is required"
    );

    error.code =
      "INVALID_EMAIL_RECIPIENT";

    throw error;
  }

  if (!verificationCode) {
    throw new Error(
      "Verification code is required"
    );
  }

  const greetingName =
    getGreetingName({
      username,
      firstName,
    });

  return sendMail({
    from: EMAIL_FROM,
    to: recipient,
    subject:
      "Verify your ChapsSmS account",

    text: `
Hello ${greetingName},

Your ChapsSmS verification code is:

${verificationCode}

This code expires in 10 minutes.

If you did not create this account, ignore this email.
    `.trim(),

    html: `
      <div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Arial,sans-serif;color:#111827;">
        <h2>Verify your ChapsSmS account</h2>

        <p>Hello ${escapeHtml(
          greetingName
        )},</p>

        <p>
          Use the verification code below to verify
          your email address.
        </p>

        <div style="margin:24px 0;padding:20px;border-radius:12px;background:#eff6ff;color:#1d4ed8;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;">
          ${escapeHtml(
            verificationCode
          )}
        </div>

        <p>This code expires in 10 minutes.</p>

        <p style="color:#6b7280;font-size:13px;">
          If you did not create this account, ignore this email.
        </p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail({
  to,
  username,
  firstName,
  code,
}) {
  const recipient =
    String(to || "")
      .trim()
      .toLowerCase();

  const resetCode =
    String(code || "")
      .trim();

  if (
    !isValidEmailAddress(
      recipient
    )
  ) {
    const error = new Error(
      "A valid password-reset email recipient is required"
    );

    error.code =
      "INVALID_EMAIL_RECIPIENT";

    throw error;
  }

  if (!resetCode) {
    throw new Error(
      "Password-reset code is required"
    );
  }

  const greetingName =
    getGreetingName({
      username,
      firstName,
    });

  return sendMail({
    from: EMAIL_FROM,
    to: recipient,
    subject:
      "Reset your ChapsSmS password",

    text: `
Hello ${greetingName},

Your ChapsSmS password-reset code is:

${resetCode}

This code expires in 10 minutes.

If you did not request a password reset, ignore this email.
    `.trim(),

    html: `
      <div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Arial,sans-serif;color:#111827;">
        <h2>Reset your ChapsSmS password</h2>

        <p>Hello ${escapeHtml(
          greetingName
        )},</p>

        <p>
          Use the code below to reset your password.
        </p>

        <div style="margin:24px 0;padding:20px;border-radius:12px;background:#eff6ff;color:#1d4ed8;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;">
          ${escapeHtml(
            resetCode
          )}
        </div>

        <p>This code expires in 10 minutes.</p>

        <p style="color:#6b7280;font-size:13px;">
          If you did not request this password reset, ignore this email.
        </p>
      </div>
    `,
  });
}

module.exports = {
  verifyEmailTransport,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
