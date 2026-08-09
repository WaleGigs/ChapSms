const axios = require("axios");
const crypto = require("node:crypto");

const Payment = require("../models/Payment");
const Wallet = require("../models/Wallet");

const FLW_BASE_URL =
  "https://api.flutterwave.com/v3";

const VALID_PAYMENT_MODES = [
  "test",
  "live",
];

function requireEnvironment(name) {
  const value = String(
    process.env[name] || "",
  ).trim();

  if (!value) {
    const error = new Error(
      `${name} is missing from the backend environment`,
    );

    error.status = 500;
    error.code =
      "PAYMENT_CONFIGURATION_ERROR";

    throw error;
  }

  return value;
}

function getPaymentMode() {
  const mode = String(
    process.env.PAYMENT_MODE ||
      "test",
  )
    .trim()
    .toLowerCase();

  if (
    !VALID_PAYMENT_MODES.includes(
      mode,
    )
  ) {
    const error = new Error(
      "PAYMENT_MODE must be test or live",
    );

    error.status = 500;
    error.code =
      "PAYMENT_CONFIGURATION_ERROR";

    throw error;
  }

  return mode;
}

function getBalanceField(
  environment,
) {
  return environment === "live"
    ? "balance"
    : "testBalance";
}

function getWalletBalance(
  wallet,
  balanceField,
) {
  return Number(
    wallet?.[balanceField] || 0,
  );
}

function createTransactionReference(
  userId,
) {
  return [
    "CHAPSMS",
    userId,
    Date.now(),
    crypto
      .randomBytes(6)
      .toString("hex"),
  ]
    .join("-")
    .toUpperCase();
}

function normalizePaymentMethod(
  value,
) {
  return String(
    value || "bank",
  ).toLowerCase() === "card"
    ? "card"
    : "bank";
}

function getPaymentOptions(
  paymentMethod,
) {
  return paymentMethod === "card"
    ? "card"
    : "banktransfer,account,internetbanking";
}

function getCustomerName(user) {
  const fullName = [
    user?.firstName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    user?.username ||
    fullName ||
    "ChapsSmS User"
  );
}

function getFlutterwaveHeaders() {
  const secretKey =
    requireEnvironment(
      "FLW_SECRET_KEY",
    );

  return {
    Authorization:
      `Bearer ${secretKey}`,
    Accept:
      "application/json",
    "Content-Type":
      "application/json",
  };
}

function parseFlutterwaveExpiry(
  value,
  fallbackSeconds = 3600,
) {
  const raw =
    String(value || "").trim();

  if (raw) {
    /*
     * Flutterwave currently returns examples such as:
     * 2026-06-10 19:00:16
     *
     * Convert the separator before Date parsing. If the provider value is not
     * parseable, fall back to the configured one-hour PWBT lifetime.
     */
    const parsed =
      new Date(
        raw.includes("T")
          ? raw
          : raw.replace(
              " ",
              "T",
            ),
      );

    if (
      !Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return parsed;
    }
  }

  return new Date(
    Date.now() +
      fallbackSeconds * 1000,
  );
}

function serializeBankTransfer(
  payment,
) {
  const transfer =
    payment?.bankTransfer ||
    {};

  return {
    txRef:
      payment?.txRef ||
      "",
    amount:
      Number(
        payment?.amount ||
        0,
      ),
    currency:
      payment?.currency ||
      "NGN",
    status:
      payment?.status ||
      "pending",
    credited:
      Boolean(
        payment?.credited,
      ),

    bankName:
      transfer.bankName ||
      "",
    accountNumber:
      transfer.accountNumber ||
      "",
    accountName:
      transfer.accountName ||
      "ChapsSmS Wallet Funding",
    transferNote:
      transfer.transferNote ||
      "",
    transferAmount:
      Number(
        transfer.transferAmount ||
        payment?.amount ||
        0,
      ),
    transferReference:
      transfer.transferReference ||
      "",

    expiresAt:
      transfer.expiresAt
        ? new Date(
            transfer.expiresAt,
          ).toISOString()
        : null,
  };
}

async function fetchFlutterwaveTransactionByReference(
  txRef,
) {
  try {
    const response =
      await axios.get(
        `${FLW_BASE_URL}/transactions/verify_by_reference`,
        {
          timeout: 20000,
          params: {
            tx_ref: txRef,
          },
          headers:
            getFlutterwaveHeaders(),
        },
      );

    return (
      response.data?.data ||
      null
    );
  } catch (error) {
    /*
     * A freshly-created PWBT can have no completed transaction to verify yet.
     * Flutterwave may answer 400/404 until the customer sends the transfer.
     * Treat that as "still pending", not as an application failure.
     */
    const status =
      Number(
        error.response
          ?.status ||
        0,
      );

    if (
      status === 400 ||
      status === 404
    ) {
      return null;
    }

    throw error;
  }
}

async function fetchFlutterwaveTransaction(
  transactionId,
) {
  const secretKey =
    requireEnvironment(
      "FLW_SECRET_KEY",
    );

  const response =
    await axios.get(
      `${FLW_BASE_URL}/transactions/${encodeURIComponent(
        transactionId,
      )}/verify`,
      {
        timeout: 20000,

        headers:
          getFlutterwaveHeaders(),
      },
    );

  return response.data?.data;
}

function isValidTransaction(
  transaction,
  payment,
) {
  return Boolean(
    transaction &&
      transaction.status ===
        "successful" &&
      String(
        transaction.tx_ref,
      ) ===
        String(payment.txRef) &&
      String(
        transaction.currency,
      ).toUpperCase() ===
        payment.currency &&
      Number(
        transaction.amount,
      ) >=
        Number(payment.amount),
  );
}

async function markPaymentFailed(
  payment,
  reason,
) {
  payment.status = "failed";
  payment.failureReason =
    String(
      reason ||
        "Payment verification failed",
    );

  await payment.save();
}

async function markPaymentSuccessful({
  payment,
  transactionId,
}) {
  payment.flutterwaveId =
    String(transactionId || "");
  payment.status =
    "successful";
  payment.credited = true;
  payment.verifiedAt =
    new Date();
  payment.failureReason = "";

  await payment.save();
}

async function creditVerifiedPayment({
  payment,
  transaction,
}) {
  const paymentEnvironment =
    String(
      payment.environment ||
        getPaymentMode(),
    )
      .trim()
      .toLowerCase();

  const balanceField =
    getBalanceField(
      paymentEnvironment,
    );

  if (payment.credited) {
    const existingWallet =
      await Wallet.findOne({
        user: payment.user,
      });

    return {
      alreadyCredited: true,
      wallet:
        existingWallet,
      paymentEnvironment,
      balanceField,
    };
  }

  const transactionId =
    String(
      transaction.id || "",
    );

  /*
   * The reference filter is the idempotency guard.
   * Duplicate callbacks and webhook retries cannot credit twice.
   */
  const wallet =
    await Wallet.findOneAndUpdate(
      {
        user: payment.user,

        "transactions.reference": {
          $ne: payment.txRef,
        },
      },

      {
        $inc: {
          [balanceField]:
            payment.amount,
        },

        $push: {
          transactions: {
            $each: [
              {
                type:
                  "deposit",

                amount:
                  payment.amount,

                environment:
                  paymentEnvironment,

                balanceField,

                description:
                  `Flutterwave ${paymentEnvironment} wallet funding: ₦${Number(
                    payment.amount,
                  ).toLocaleString(
                    "en-NG",
                  )}`,

                status:
                  "completed",

                reference:
                  payment.txRef,

                transactionId,

                paymentGateway:
                  "flutterwave",

                currency:
                  payment.currency,

                paymentMethod:
                  payment.paymentMethod,
              },
            ],

            $position: 0,
          },
        },
      },

      {
        new: true,
        runValidators: true,
      },
    );

  if (!wallet) {
    const existingWallet =
      await Wallet.findOne({
        user: payment.user,
      });

    if (!existingWallet) {
      const error =
        new Error(
          "Wallet not found",
        );

      error.status = 404;
      error.code =
        "WALLET_NOT_FOUND";

      throw error;
    }

    const transactionExists =
      existingWallet.transactions.some(
        (item) =>
          String(
            item.reference || "",
          ) === payment.txRef,
      );

    if (!transactionExists) {
      const error =
        new Error(
          "Wallet could not be credited",
        );

      error.status = 500;
      error.code =
        "WALLET_CREDIT_FAILED";

      throw error;
    }

    await markPaymentSuccessful({
      payment,
      transactionId,
    });

    return {
      alreadyCredited: true,
      wallet:
        existingWallet,
      paymentEnvironment,
      balanceField,
    };
  }

  await markPaymentSuccessful({
    payment,
    transactionId,
  });

  return {
    alreadyCredited: false,
    wallet,
    paymentEnvironment,
    balanceField,
  };
}

async function verifyAndCredit({
  transactionId,
  txRef,
  userId = null,
}) {
  const paymentQuery = {
    txRef,
  };

  if (userId) {
    paymentQuery.user =
      userId;
  }

  const payment =
    await Payment.findOne(
      paymentQuery,
    );

  if (!payment) {
    const error =
      new Error(
        "Payment record not found",
      );

    error.status = 404;
    error.code =
      "PAYMENT_NOT_FOUND";

    throw error;
  }

  const transaction =
    await fetchFlutterwaveTransaction(
      transactionId,
    );

  if (
    !isValidTransaction(
      transaction,
      payment,
    )
  ) {
    await markPaymentFailed(
      payment,
      "Flutterwave transaction details did not match",
    );

    const error =
      new Error(
        "Payment verification failed",
      );

    error.status = 400;
    error.code =
      "PAYMENT_VERIFICATION_FAILED";

    throw error;
  }

  const result =
    await creditVerifiedPayment({
      payment,
      transaction,
    });

  return {
    ...result,
    payment,
    transaction,
  };
}


exports.initializeBankTransfer =
  async (req, res) => {
    let payment = null;

    try {
      const amount =
        Number(
          req.body.amount,
        );

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount < 100
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Minimum funding amount is 100",
          });
      }

      const paymentEnvironment =
        getPaymentMode();

      const txRef =
        createTransactionReference(
          req.user._id,
        );

      payment =
        await Payment.create({
          user:
            req.user._id,
          txRef,
          amount,
          currency: "NGN",
          paymentMethod:
            "bank",
          environment:
            paymentEnvironment,
          status:
            "pending",
          credited:
            false,
        });

      const expiresSeconds =
        3600;

      const payload = {
        tx_ref:
          txRef,
        amount:
          payment.amount,
        currency:
          payment.currency,
        email:
          req.user.email,
        fullname:
          getCustomerName(
            req.user,
          ),

        /*
         * This narration is what we ask Flutterwave to associate with the
         * generated transfer account. The actual bank resolver may abbreviate
         * or format it.
         */
        narration:
          "ChapsSmS Wallet Funding",

        bank_transfer_options: {
          expires:
            expiresSeconds,
        },

        meta: {
          userId:
            String(
              req.user._id,
            ),
          paymentId:
            String(
              payment._id,
            ),
          environment:
            paymentEnvironment,
        },
      };

      const phone =
        String(
          req.user.phone ||
          req.user.phoneNumber ||
          "",
        ).trim();

      if (phone) {
        payload.phone_number =
          phone;
      }

      const response =
        await axios.post(
          `${FLW_BASE_URL}/charges?type=bank_transfer`,
          payload,
          {
            timeout:
              30000,
            headers:
              getFlutterwaveHeaders(),
          },
        );

      const authorization =
        response.data
          ?.meta
          ?.authorization ||
        response.data
          ?.data
          ?.meta
          ?.authorization ||
        null;

      const accountNumber =
        String(
          authorization
            ?.transfer_account ||
          "",
        ).trim();

      const bankName =
        String(
          authorization
            ?.transfer_bank ||
          "",
        ).trim();

      if (
        !accountNumber ||
        !bankName
      ) {
        const error =
          new Error(
            "Flutterwave did not return temporary bank account details",
          );

        error.status = 502;
        error.code =
          "BANK_TRANSFER_ACCOUNT_NOT_RETURNED";
        throw error;
      }

      const expiresAt =
        parseFlutterwaveExpiry(
          authorization
            ?.account_expiration,
          expiresSeconds,
        );

      payment.bankTransfer = {
        transferReference:
          String(
            authorization
              ?.transfer_reference ||
            "",
          ).trim(),

        accountNumber,
        bankName,

        accountName:
          "ChapsSmS Wallet Funding",

        transferNote:
          String(
            authorization
              ?.transfer_note ||
            "",
          ).trim(),

        transferAmount:
          Number(
            authorization
              ?.transfer_amount ||
            payment.amount,
          ),

        expiresAt,
      };

      await payment.save();

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Temporary bank account generated",
          environment:
            paymentEnvironment,
          bankTransfer:
            serializeBankTransfer(
              payment,
            ),
        });
    } catch (error) {
      console.error(
        "Flutterwave bank transfer initialization error:",
        error.response
          ?.data ||
        error.message,
      );

      if (
        payment &&
        payment.status ===
          "pending"
      ) {
        payment.status =
          "failed";
        payment.failureReason =
          String(
            error.response
              ?.data
              ?.message ||
            error.message ||
            "Unable to generate bank transfer account",
          );

        await payment
          .save()
          .catch(() => {});
      }

      return res
        .status(
          error.status ||
          error.response
            ?.status ||
          500,
        )
        .json({
          success: false,
          message:
            error.response
              ?.data
              ?.message ||
            error.message ||
            "Unable to generate bank transfer account",
          code:
            error.code ||
            "BANK_TRANSFER_INITIALIZATION_FAILED",
        });
    }
  };

exports.getBankTransferStatus =
  async (req, res) => {
    try {
      const txRef =
        String(
          req.params.txRef ||
          "",
        )
          .trim()
          .toUpperCase();

      if (!txRef) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Transaction reference is required",
          });
      }

      const payment =
        await Payment.findOne({
          txRef,
          user:
            req.user._id,
          paymentMethod:
            "bank",
        });

      if (!payment) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Bank transfer payment not found",
            code:
              "PAYMENT_NOT_FOUND",
          });
      }

      if (
        payment.credited &&
        payment.status ===
          "successful"
      ) {
        const balanceField =
          getBalanceField(
            payment.environment,
          );

        const wallet =
          await Wallet.findOne({
            user:
              payment.user,
          });

        return res
          .status(200)
          .json({
            success: true,
            paymentStatus:
              "successful",
            message:
              "Wallet funded successfully",
            bankTransfer:
              serializeBankTransfer(
                payment,
              ),
            walletBalance:
              getWalletBalance(
                wallet,
                balanceField,
              ),
            liveBalance:
              Number(
                wallet?.balance ||
                0,
              ),
            testBalance:
              Number(
                wallet
                  ?.testBalance ||
                0,
              ),
          });
      }

      let transaction = null;

      try {
        transaction =
          await fetchFlutterwaveTransactionByReference(
            payment.txRef,
          );
      } catch (error) {
        console.error(
          "Flutterwave bank transfer status lookup error:",
          error.response
            ?.data ||
          error.message,
        );

        /*
         * Don't destroy an otherwise-valid pending payment because a provider
         * status request had a transient network/server problem.
         */
        return res
          .status(200)
          .json({
            success: true,
            paymentStatus:
              "pending",
            message:
              "Waiting for bank transfer confirmation",
            bankTransfer:
              serializeBankTransfer(
                payment,
              ),
          });
      }

      if (
        transaction &&
        isValidTransaction(
          transaction,
          payment,
        )
      ) {
        const result =
          await creditVerifiedPayment({
            payment,
            transaction,
          });

        const walletBalance =
          getWalletBalance(
            result.wallet,
            result.balanceField,
          );

        return res
          .status(200)
          .json({
            success: true,
            paymentStatus:
              "successful",
            message:
              result.alreadyCredited
                ? "Payment already credited"
                : result.paymentEnvironment ===
                    "live"
                  ? "Wallet funded successfully"
                  : "Test wallet funded successfully",
            bankTransfer:
              serializeBankTransfer(
                payment,
              ),
            walletBalance,
            liveBalance:
              Number(
                result.wallet
                  ?.balance ||
                0,
              ),
            testBalance:
              Number(
                result.wallet
                  ?.testBalance ||
                0,
              ),
          });
      }

      const expiresAt =
        payment.bankTransfer
          ?.expiresAt
          ? new Date(
              payment.bankTransfer
                .expiresAt,
            )
          : null;

      const expired =
        expiresAt &&
        !Number.isNaN(
          expiresAt.getTime(),
        ) &&
        Date.now() >=
          expiresAt.getTime();

      return res
        .status(200)
        .json({
          success: true,
          paymentStatus:
            expired
              ? "expired"
              : "pending",
          message:
            expired
              ? "This transfer account has expired"
              : "Waiting for bank transfer confirmation",
          bankTransfer:
            serializeBankTransfer(
              payment,
            ),
        });
    } catch (error) {
      console.error(
        "Bank transfer status error:",
        error.response
          ?.data ||
        error.message,
      );

      return res
        .status(
          error.status ||
          500,
        )
        .json({
          success: false,
          message:
            error.response
              ?.data
              ?.message ||
            error.message ||
            "Unable to check bank transfer status",
          code:
            error.code ||
            "BANK_TRANSFER_STATUS_FAILED",
        });
    }
  };

exports.initializePayment =
  async (req, res) => {
    try {
      const amount =
        Number(
          req.body.amount,
        );

      const paymentMethod =
        normalizePaymentMethod(
          req.body.paymentMethod,
        );

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount < 100
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Minimum funding amount is 100",
          });
      }

      const publicKey =
        requireEnvironment(
          "FLW_PUBLIC_KEY",
        );

      requireEnvironment(
        "FLW_SECRET_KEY",
      );

      const paymentEnvironment =
        getPaymentMode();

      const txRef =
        createTransactionReference(
          req.user._id,
        );

      const payment =
        await Payment.create({
          user:
            req.user._id,
          txRef,
          amount,
          currency: "NGN",
          paymentMethod,
          environment:
            paymentEnvironment,
          status: "pending",
          credited: false,
        });

      return res
        .status(200)
        .json({
          success: true,
          txRef,
          amount:
            payment.amount,
          currency:
            payment.currency,
          paymentMethod,
          paymentOptions:
            getPaymentOptions(
              paymentMethod,
            ),
          publicKey,

          /*
           * The frontend may display "Test funding"
           * when this value is test.
           */
          environment:
            paymentEnvironment,

          customer: {
            email:
              req.user.email,
            name:
              getCustomerName(
                req.user,
              ),
          },

          meta: {
            userId:
              String(
                req.user._id,
              ),
            paymentId:
              String(
                payment._id,
              ),
            environment:
              paymentEnvironment,
          },
        });
    } catch (error) {
      console.error(
        "Flutterwave initialization error:",
        error.message,
      );

      return res
        .status(
          error.status ||
            500,
        )
        .json({
          success: false,
          message:
            error.message ||
            "Unable to initialize payment",
          code:
            error.code ||
            "PAYMENT_INITIALIZATION_FAILED",
        });
    }
  };

exports.verifyPayment =
  async (req, res) => {
    try {
      const transactionId =
        req.body
          .transactionId;

      const txRef =
        String(
          req.body.txRef ||
            "",
        ).trim();

      if (
        !transactionId ||
        !txRef
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Transaction ID and reference are required",
          });
      }

      const result =
        await verifyAndCredit({
          transactionId,
          txRef,
          userId:
            req.user._id,
        });

      const walletBalance =
        getWalletBalance(
          result.wallet,
          result.balanceField,
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            result.alreadyCredited
              ? "Payment already credited"
              : result.paymentEnvironment ===
                  "live"
                ? "Wallet funded successfully"
                : "Test wallet funded successfully",

          amountCredited:
            result.payment.amount,

          currency:
            result.payment.currency,

          paymentEnvironment:
            result.paymentEnvironment,

          /*
           * Backward-compatible active balance.
           */
          walletBalance,

          liveBalance:
            Number(
              result.wallet
                ?.balance ||
                0,
            ),

          testBalance:
            Number(
              result.wallet
                ?.testBalance ||
                0,
            ),
        });
    } catch (error) {
      console.error(
        "Flutterwave verification error:",
        error.response
          ?.data ||
          error.message,
      );

      return res
        .status(
          error.status ||
            500,
        )
        .json({
          success: false,

          message:
            error.response
              ?.data
              ?.message ||
            error.message ||
            "Unable to verify payment",

          code:
            error.code ||
            "PAYMENT_VERIFICATION_ERROR",
        });
    }
  };

function isValidWebhookSignature(
  req,
) {
  const secretHash =
    requireEnvironment(
      "FLW_SECRET_HASH",
    );

  const modernSignature =
    req.headers[
      "flutterwave-signature"
    ];

  if (
    modernSignature &&
    req.rawBody
  ) {
    const expected =
      crypto
        .createHmac(
          "sha256",
          secretHash,
        )
        .update(
          req.rawBody,
        )
        .digest(
          "base64",
        );

    const left =
      Buffer.from(
        String(
          modernSignature,
        ),
      );

    const right =
      Buffer.from(
        expected,
      );

    return (
      left.length ===
        right.length &&
      crypto.timingSafeEqual(
        left,
        right,
      )
    );
  }

  /*
   * Compatibility with older Flutterwave
   * webhook configuration.
   */
  const legacySignature =
    req.headers[
      "verif-hash"
    ];

  return Boolean(
    legacySignature &&
      legacySignature ===
        secretHash,
  );
}

exports.handleWebhook =
  async (req, res) => {
    try {
      if (
        !isValidWebhookSignature(
          req,
        )
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Invalid webhook signature",
          });
      }

      const payload =
        req.body || {};

      const data =
        payload.data ||
        payload;

      const status =
        String(
          data.status ||
            "",
        ).toLowerCase();

      const txRef =
        String(
          data.tx_ref ||
            data.txRef ||
            "",
        ).trim();

      const transactionId =
        data.id ||
        data.transaction_id;

      if (
        status !==
          "successful" ||
        !txRef ||
        !transactionId
      ) {
        return res
          .sendStatus(200);
      }

      await verifyAndCredit({
        transactionId,
        txRef,
      });

      return res
        .sendStatus(200);
    } catch (error) {
      console.error(
        "Flutterwave webhook error:",
        error.response
          ?.data ||
          error.message,
      );

      /*
       * A permanent 4xx verification problem is acknowledged.
       * A transient server/provider failure returns 500 for retry.
       */
      if (
        error.status &&
        error.status < 500
      ) {
        return res
          .sendStatus(200);
      }

      return res
        .sendStatus(500);
    }
  };

exports.flutterwaveWebhook =
  exports.handleWebhook;