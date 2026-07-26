const nodemailer = require("nodemailer");
const dns = require("node:dns").promises;

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
).trim();

const SMTP_PASS = String(
  process.env.SMTP_PASS || ""
)
  .replace(/\s+/g, "")
  .trim();

const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  `"ChapsSmS" <${SMTP_USER}>`;

let transporter = null;
let resolvedIpv4Address = null;

function validateEmailConfiguration() {
  const missing = [];

  if (!SMTP_USER) {
    missing.push("SMTP_USER");
  }

  if (!SMTP_PASS) {
    missing.push("SMTP_PASS");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing email environment variables: ${missing.join(", ")}`
    );
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
  const addresses = await dns.resolve4(
    SMTP_HOST
  );

  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error(
      `No IPv4 address was found for ${SMTP_HOST}`
    );
  }

  /*
   * Select one of Gmail's returned IPv4 addresses.
   * Do not store this permanently because SMTP
   * addresses may change.
   */
  return addresses[0];
}

async function createEmailTransporter() {
  validateEmailConfiguration();

  resolvedIpv4Address =
    await resolveSmtpIpv4();

  console.log("SMTP IPv4 configuration:", {
    hostname: SMTP_HOST,
    resolvedAddress: resolvedIpv4Address,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
  });

  transporter = nodemailer.createTransport({
    /*
     * Passing the IPv4 address prevents Nodemailer
     * from resolving smtp.gmail.com to IPv6.
     */
    host: resolvedIpv4Address,
    port: SMTP_PORT,
    secure: SMTP_SECURE,

    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },

    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    dnsTimeout: 10000,

    tls: {
      /*
       * Required because host is an IP address,
       * but Gmail's TLS certificate is issued for
       * smtp.gmail.com.
       */
      servername: SMTP_HOST,
      minVersion: "TLSv1.2",
    },
  });

  return transporter;
}

async function getTransporter() {
  if (!transporter) {
    await createEmailTransporter();
  }

  return transporter;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function resetTransporter() {
  try {
    transporter?.close();
  } catch {
    // Ignore close errors.
  }

  transporter = null;
  resolvedIpv4Address = null;
}

async function sendMailWithRetry(
  mailOptions,
  maximumAttempts = 2
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= maximumAttempts;
    attempt += 1
  ) {
    try {
      const emailTransporter =
        await getTransporter();

      const info =
        await emailTransporter.sendMail(
          mailOptions
        );

      console.log(
        `✅ Email sent to ${mailOptions.to}`
      );

      return info;
    } catch (error) {
      lastError = error;

      console.error(
        `❌ Email attempt ${attempt}/${maximumAttempts} failed:`,
        {
          name: error.name,
          code: error.code,
          message: error.message,
          command: error.command,
          address: error.address,
          port: error.port,
        }
      );

      /*
       * Re-resolve Gmail before retrying in case
       * the selected IPv4 endpoint is unavailable.
       */
      await resetTransporter();

      if (attempt < maximumAttempts) {
        await wait(1500);
      }
    }
  }

  throw lastError;
}

async function verifyEmailTransport() {
  try {
    const emailTransporter =
      await getTransporter();

    await emailTransporter.verify();

    console.log(
      `✅ SMTP ready through IPv4 ${resolvedIpv4Address}:${SMTP_PORT}`
    );

    return true;
  } catch (error) {
    console.error(
      "❌ SMTP verification failed:",
      {
        code: error.code,
        message: error.message,
        address: error.address,
        port: error.port,
      }
    );

    await resetTransporter();

    return false;
  }
}

async function sendVerificationEmail({
  to,
  firstName,
  code,
}) {
  const recipient = String(to || "")
    .trim()
    .toLowerCase();

  const verificationCode = String(
    code || ""
  ).trim();

  if (!recipient) {
    throw new Error(
      "Verification email recipient is required"
    );
  }

  if (!verificationCode) {
    throw new Error(
      "Verification code is required"
    );
  }

  return sendMailWithRetry({
    from: EMAIL_FROM,
    to: recipient,
    subject:
      "Verify your ChapsSmS account",

    text: `
Hello ${firstName || "there"},

Your ChapsSmS verification code is:

${verificationCode}

This code expires in 10 minutes.

If you did not create this account, ignore this email.
    `.trim(),

    html: `
      <div
        style="
          max-width: 560px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: Arial, sans-serif;
          color: #111827;
        "
      >
        <h2>Verify your ChapsSmS account</h2>

        <p>Hello ${firstName || "there"},</p>

        <p>
          Use the verification code below to verify
          your email address.
        </p>

        <div
          style="
            margin: 24px 0;
            padding: 20px;
            border-radius: 12px;
            background: #eff6ff;
            color: #1d4ed8;
            text-align: center;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 8px;
          "
        >
          ${verificationCode}
        </div>

        <p>This code expires in 10 minutes.</p>

        <p style="color: #6b7280; font-size: 13px;">
          If you did not create this account, ignore
          this email.
        </p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail({
  to,
  firstName,
  code,
}) {
  const recipient = String(to || "")
    .trim()
    .toLowerCase();

  const resetCode = String(
    code || ""
  ).trim();

  if (!recipient) {
    throw new Error(
      "Password-reset email recipient is required"
    );
  }

  if (!resetCode) {
    throw new Error(
      "Password-reset code is required"
    );
  }

  return sendMailWithRetry({
    from: EMAIL_FROM,
    to: recipient,
    subject:
      "Reset your ChapsSmS password",

    text: `
Hello ${firstName || "there"},

Your ChapsSmS password-reset code is:

${resetCode}

This code expires in 10 minutes.

If you did not request a password reset, ignore this email.
    `.trim(),

    html: `
      <div
        style="
          max-width: 560px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: Arial, sans-serif;
          color: #111827;
        "
      >
        <h2>Reset your ChapsSmS password</h2>

        <p>Hello ${firstName || "there"},</p>

        <p>
          Use the code below to reset your password.
        </p>

        <div
          style="
            margin: 24px 0;
            padding: 20px;
            border-radius: 12px;
            background: #eff6ff;
            color: #1d4ed8;
            text-align: center;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 8px;
          "
        >
          ${resetCode}
        </div>

        <p>This code expires in 10 minutes.</p>

        <p style="color: #6b7280; font-size: 13px;">
          If you did not request this password reset,
          ignore this email.
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