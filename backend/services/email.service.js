const nodemailer =
  require(
    "nodemailer",
  );

const SMTP_HOST =
  String(
    process.env
      .SMTP_HOST ||
      "smtp.gmail.com",
  ).trim();

const SMTP_PORT =
  Number(
    process.env
      .SMTP_PORT ||
      587,
  );

const SMTP_SECURE =
  String(
    process.env
      .SMTP_SECURE ||
      "false",
  )
    .trim()
    .toLowerCase() ===
  "true";

const SMTP_USER =
  String(
    process.env
      .SMTP_USER ||
      "",
  )
    .trim()
    .toLowerCase();

const SMTP_PASS =
  String(
    process.env
      .SMTP_PASS ||
      "",
  )
    .replace(
      /\s+/g,
      "",
    )
    .trim();

const EMAIL_FROM =
  String(
    process.env
      .EMAIL_FROM ||
      `"ChapsSmS" <${SMTP_USER}>`,
  ).trim();

const SMTP_CONNECTION_TIMEOUT =
  Number(
    process.env
      .SMTP_CONNECTION_TIMEOUT ||
      15000,
  );

const SMTP_GREETING_TIMEOUT =
  Number(
    process.env
      .SMTP_GREETING_TIMEOUT ||
      15000,
  );

const SMTP_SOCKET_TIMEOUT =
  Number(
    process.env
      .SMTP_SOCKET_TIMEOUT ||
      30000,
  );

const SMTP_DEBUG =
  String(
    process.env
      .SMTP_DEBUG ||
      "false",
  )
    .trim()
    .toLowerCase() ===
  "true";

const MAXIMUM_SEND_ATTEMPTS =
  Math.max(
    1,
    Number(
      process.env
        .SMTP_SEND_ATTEMPTS ||
        2,
    ),
  );

let transporter = null;

function isValidEmailAddress(
  value,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(
      value || "",
    ).trim(),
  );
}

function validateEmailConfiguration() {
  const missing = [];

  if (!SMTP_USER) {
    missing.push(
      "SMTP_USER",
    );
  }

  if (!SMTP_PASS) {
    missing.push(
      "SMTP_PASS",
    );
  }

  if (
    missing.length > 0
  ) {
    const error =
      new Error(
        `Missing email environment variables: ${missing.join(
          ", ",
        )}`,
      );

    error.code =
      "EMAIL_CONFIG_MISSING";

    throw error;
  }

  if (
    !isValidEmailAddress(
      SMTP_USER,
    )
  ) {
    const error =
      new Error(
        "SMTP_USER must be a valid email address",
      );

    error.code =
      "INVALID_SMTP_USER";

    throw error;
  }

  if (
    !Number.isInteger(
      SMTP_PORT,
    ) ||
    SMTP_PORT <= 0
  ) {
    throw new Error(
      "SMTP_PORT must be a valid port number",
    );
  }

  if (
    SMTP_PORT === 465 &&
    !SMTP_SECURE
  ) {
    throw new Error(
      "SMTP_SECURE must be true when SMTP_PORT is 465",
    );
  }

  if (
    SMTP_PORT === 587 &&
    SMTP_SECURE
  ) {
    throw new Error(
      "SMTP_SECURE must be false when SMTP_PORT is 587",
    );
  }
}

function createTransporter() {
  validateEmailConfiguration();

  transporter =
    nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,

      /*
       * Prefer IPv4 while still connecting through the real SMTP hostname.
       * This keeps TLS hostname verification correct and avoids manually
       * pinning a temporary Gmail IP address.
       */
      family: 4,

      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },

      requireTLS:
        SMTP_PORT === 587,

      connectionTimeout:
        SMTP_CONNECTION_TIMEOUT,

      greetingTimeout:
        SMTP_GREETING_TIMEOUT,

      socketTimeout:
        SMTP_SOCKET_TIMEOUT,

      logger: SMTP_DEBUG,
      debug: SMTP_DEBUG,

      tls: {
        servername:
          SMTP_HOST,
        minVersion:
          "TLSv1.2",
      },
    });

  console.log(
    "SMTP transporter configured:",
    {
      host:
        SMTP_HOST,
      port:
        SMTP_PORT,
      secure:
        SMTP_SECURE,
      family: 4,
      user:
        SMTP_USER,
    },
  );

  return transporter;
}

function getTransporter() {
  if (!transporter) {
    return createTransporter();
  }

  return transporter;
}

function resetTransporter() {
  try {
    transporter
      ?.close();
  } catch {
    // Ignore close errors.
  }

  transporter = null;
}

function escapeHtml(
  value,
) {
  return String(
    value || "",
  )
    .replace(
      /&/g,
      "&amp;",
    )
    .replace(
      /</g,
      "&lt;",
    )
    .replace(
      />/g,
      "&gt;",
    )
    .replace(
      /"/g,
      "&quot;",
    )
    .replace(
      /'/g,
      "&#039;",
    );
}

function getGreetingName({
  username,
  firstName,
}) {
  return (
    String(
      username ||
        firstName ||
        "there",
    ).trim() ||
    "there"
  );
}

function wait(
  milliseconds,
) {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

async function sendMail(
  mailOptions,
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <=
    MAXIMUM_SEND_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const info =
        await getTransporter()
          .sendMail({
            ...mailOptions,

            /*
             * Prevent templates from loading arbitrary local or remote files.
             */
            disableFileAccess:
              true,
            disableUrlAccess:
              true,
          });

      console.log(
        "✅ Email accepted by SMTP:",
        {
          to:
            mailOptions.to,
          messageId:
            info.messageId,
          accepted:
            info.accepted,
          rejected:
            info.rejected,
          response:
            info.response,
        },
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
        },
      );

      resetTransporter();

      if (
        attempt <
        MAXIMUM_SEND_ATTEMPTS
      ) {
        await wait(1000);
      }
    }
  }

  throw lastError;
}

async function verifyEmailTransport() {
  try {
    await getTransporter()
      .verify();

    console.log(
      `✅ SMTP ready: ${SMTP_HOST}:${SMTP_PORT} through IPv4`,
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
      },
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
    String(
      to || "",
    )
      .trim()
      .toLowerCase();

  const verificationCode =
    String(
      code || "",
    ).trim();

  if (
    !isValidEmailAddress(
      recipient,
    )
  ) {
    const error =
      new Error(
        "A valid verification email recipient is required",
      );

    error.code =
      "INVALID_EMAIL_RECIPIENT";

    throw error;
  }

  if (
    !/^\d{6}$/.test(
      verificationCode,
    )
  ) {
    const error =
      new Error(
        "A six-digit verification code is required",
      );

    error.code =
      "INVALID_VERIFICATION_CODE";

    throw error;
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
          greetingName,
        )},</p>

        <p>
          Use the verification code below to verify your email address.
        </p>

        <div style="margin:24px 0;padding:20px;border-radius:12px;background:#eff6ff;color:#1d4ed8;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;">
          ${escapeHtml(
            verificationCode,
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
    String(
      to || "",
    )
      .trim()
      .toLowerCase();

  const resetCode =
    String(
      code || "",
    ).trim();

  if (
    !isValidEmailAddress(
      recipient,
    )
  ) {
    const error =
      new Error(
        "A valid password-reset email recipient is required",
      );

    error.code =
      "INVALID_EMAIL_RECIPIENT";

    throw error;
  }

  if (!resetCode) {
    throw new Error(
      "Password-reset code is required",
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
          greetingName,
        )},</p>

        <p>
          Use the code below to reset your password.
        </p>

        <div style="margin:24px 0;padding:20px;border-radius:12px;background:#eff6ff;color:#1d4ed8;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;">
          ${escapeHtml(
            resetCode,
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
