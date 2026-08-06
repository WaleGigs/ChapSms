/*
 * Copy this viewing file to:
 *
 *   scripts/testEmailDelivery.js
 *
 * Then run:
 *
 *   node scripts/testEmailDelivery.js recipient@gmail.com
 */

require(
  "dotenv",
).config();

const {
  verifyEmailTransport,
  sendVerificationEmail,
} =
  require(
    "../services/email.service",
  );

function createTestCode() {
  return String(
    Math.floor(
      100000 +
        Math.random() *
          900000,
    ),
  );
}

async function run() {
  const recipient =
    String(
      process.argv[2] ||
        process.env
          .SMTP_TEST_RECIPIENT ||
        process.env
          .SMTP_USER ||
        "",
    )
      .trim()
      .toLowerCase();

  if (!recipient) {
    throw new Error(
      "Pass a recipient email or set SMTP_TEST_RECIPIENT",
    );
  }

  console.log(
    "Testing SMTP configuration...",
  );

  const ready =
    await verifyEmailTransport();

  if (!ready) {
    throw new Error(
      "SMTP verification failed. Read the error printed above.",
    );
  }

  const code =
    createTestCode();

  const info =
    await sendVerificationEmail({
      to: recipient,
      username:
        "SMTP Test User",
      code,
    });

  console.log(
    "✅ Test verification email accepted:",
    {
      recipient,
      code,
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
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch(
    (error) => {
      console.error(
        "❌ Email test failed:",
        {
          name:
            error.name,
          code:
            error.code,
          message:
            error.message,
          response:
            error.response,
          responseCode:
            error.responseCode,
          command:
            error.command,
        },
      );

      process.exit(1);
    },
  );
