const crypto = require("node:crypto");

const SocialProduct = require(
  "../models/SocialProduct"
);

const SocialCatalogRule = require(
  "../models/SocialCatalogRule"
);

const HouseStockItem = require(
  "../models/HouseStockItem"
);

const PROVIDERS = new Set([
  "sameeha",
  "loggsplug",
]);

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProvider(value) {
  const provider =
    String(value || "")
      .trim()
      .toLowerCase();

  if (!PROVIDERS.has(provider)) {
    const error =
      new Error(
        "Invalid social provider"
      );

    error.status = 400;
    error.code =
      "INVALID_SOCIAL_PROVIDER";

    throw error;
  }

  return provider;
}

function positiveNumber(
  value,
  {
    field = "value",
    allowZero = true,
  } = {}
) {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    (!allowZero &&
      parsed <= 0)
  ) {
    const error =
      new Error(
        `Enter a valid ${field}`
      );

    error.status = 400;
    error.code =
      "INVALID_SOCIAL_VALUE";

    throw error;
  }

  return parsed;
}

function productRuleKey(
  provider,
  providerProductId
) {
  return `product:${provider}:${String(
    providerProductId
  ).trim()}`;
}

function categoryRuleKey(
  provider,
  category
) {
  return `category:${provider}:${slugify(
    category
  )}`;
}

function getAlternativeKey(
  item
) {
  return `${item.provider}:${item.providerProductId}`;
}

function getProviderAlternatives(
  product
) {
  const alternatives =
    Array.isArray(
      product?.alternatives
    )
      ? product.alternatives
      : [];

  const values = [
    ...alternatives.map(
      (item) => ({
        provider:
          String(
            item.provider || ""
          ),
        providerProductId:
          String(
            item.providerProductId ||
              ""
          ),
        providerCurrency:
          String(
            item.providerCurrency ||
              "NGN"
          ),
        providerUnitPrice:
          Number(
            item.providerUnitPrice ||
              0
          ),
        providerCostNgn:
          Number(
            item.providerCostNgn ||
              0
          ),
        stock:
          Number(
            item.stock || 0
          ),
        inStock:
          Boolean(
            item.inStock
          ),
      })
    ),
  ];

  const primary = {
    provider:
      String(
        product?.provider || ""
      ),
    providerProductId:
      String(
        product?.providerProductId ||
          ""
      ),
    providerCurrency:
      String(
        product?.providerCurrency ||
          "NGN"
      ),
    providerUnitPrice:
      Number(
        product?.providerUnitPrice ||
          0
      ),
    providerCostNgn:
      Number(
        product?.providerCostNgn ||
          0
      ),
    stock:
      Number(
        product?.stock || 0
      ),
    inStock:
      Boolean(
        product?.inStock
      ),
  };

  if (
    PROVIDERS.has(
      primary.provider
    ) &&
    primary.providerProductId
  ) {
    values.push(primary);
  }

  const deduped =
    new Map();

  for (const value of values) {
    if (
      !PROVIDERS.has(
        value.provider
      ) ||
      !value.providerProductId
    ) {
      continue;
    }

    deduped.set(
      getAlternativeKey(value),
      value
    );
  }

  return [
    ...deduped.values(),
  ];
}

async function loadHiddenRuleKeys() {
  const rules =
    await SocialCatalogRule
      .find({
        hidden: true,
      })
      .select("ruleKey")
      .lean();

  return new Set(
    rules.map(
      (rule) =>
        String(
          rule.ruleKey || ""
        )
    )
  );
}

function isHidden({
  provider,
  category,
  providerProductId,
  hiddenRuleKeys,
}) {
  return (
    hiddenRuleKeys.has(
      categoryRuleKey(
        provider,
        category
      )
    ) ||
    hiddenRuleKeys.has(
      productRuleKey(
        provider,
        providerProductId
      )
    )
  );
}

async function syncHouseStock(
  productId
) {
  const available =
    await HouseStockItem
      .countDocuments({
        product: productId,
        status: "available",
      });

  await SocialProduct
    .updateOne(
      {
        _id: productId,
        sourceType: "house",
      },
      {
        $set: {
          stock: available,
          inStock:
            available > 0,
          lastSyncedAt:
            new Date(),
        },
      }
    );

  return available;
}

function normalizeInventoryLines(
  value
) {
  const raw =
    Array.isArray(value)
      ? value
      : String(value || "")
          .split(/\r?\n/);

  const unique =
    new Map();

  for (const entry of raw) {
    const details =
      String(entry || "")
        .trim();

    if (!details) {
      continue;
    }

    const contentHash =
      crypto
        .createHash("sha256")
        .update(details)
        .digest("hex");

    if (
      !unique.has(
        contentHash
      )
    ) {
      unique.set(
        contentHash,
        details
      );
    }
  }

  return [
    ...unique.entries(),
  ].map(
    ([
      contentHash,
      details,
    ]) => ({
      contentHash,
      details,
    })
  );
}

async function addInventoryItems({
  productId,
  items,
}) {
  const normalized =
    normalizeInventoryLines(
      items
    );

  if (
    normalized.length === 0
  ) {
    return {
      added: 0,
      duplicates: 0,
      stock:
        await syncHouseStock(
          productId
        ),
    };
  }

  const operations =
    normalized.map(
      (item) => ({
        updateOne: {
          filter: {
            product:
              productId,
            contentHash:
              item.contentHash,
          },

          update: {
            $setOnInsert: {
              product:
                productId,
              details:
                item.details,
              contentHash:
                item.contentHash,
              status:
                "available",
            },
          },

          upsert: true,
        },
      })
    );

  const result =
    await HouseStockItem
      .bulkWrite(
        operations,
        {
          ordered: false,
        }
      );

  const added =
    Number(
      result.upsertedCount ||
        0
    );

  const stock =
    await syncHouseStock(
      productId
    );

  return {
    added,
    duplicates:
      Math.max(
        0,
        normalized.length -
          added
      ),
    stock,
  };
}

function sanitizeHouseProduct(
  product,
  counts = {}
) {
  return {
    id:
      String(
        product?._id ||
          ""
      ),

    name:
      product?.name || "",

    category:
      product?.category ||
      "Other",

    costPrice:
      Number(
        product
          ?.providerCostNgn ||
          0
      ),

    sellingPrice:
      Number(
        product
          ?.sellingPrice ||
          0
      ),

    stock:
      Number(
        counts.available ??
          product?.stock ??
          0
      ),

    sold:
      Number(
        counts.sold || 0
      ),

    reserved:
      Number(
        counts.reserved || 0
      ),

    isActive:
      Boolean(
        product?.isActive
      ),

    createdAt:
      product?.createdAt,

    updatedAt:
      product?.updatedAt,
  };
}

/* =========================================================
   PROVIDER CATALOG VISIBILITY
========================================================= */

exports.getAdminCatalog =
  async (req, res) => {
    try {
      const [
        products,
        hiddenRuleKeys,
      ] =
        await Promise.all([
          SocialProduct
            .find({
              provider: {
                $in: [
                  "sameeha",
                  "loggsplug",
                ],
              },

              isActive: true,
            })
            .sort({
              category: 1,
              name: 1,
            })
            .lean(),

          loadHiddenRuleKeys(),
        ]);

      const variants = [];
      const categoryMap =
        new Map();

      for (
        const product of
        products
      ) {
        const alternatives =
          getProviderAlternatives(
            product
          );

        for (
          const alternative of
          alternatives
        ) {
          const categoryHidden =
            hiddenRuleKeys.has(
              categoryRuleKey(
                alternative.provider,
                product.category
              )
            );

          const productHidden =
            hiddenRuleKeys.has(
              productRuleKey(
                alternative.provider,
                alternative
                  .providerProductId
              )
            );

          variants.push({
            id:
              `${alternative.provider}:${alternative.providerProductId}`,

            provider:
              alternative.provider,

            providerProductId:
              alternative
                .providerProductId,

            name:
              product.name,

            category:
              product.category,

            providerCurrency:
              alternative
                .providerCurrency,

            providerUnitPrice:
              Number(
                alternative
                  .providerUnitPrice ||
                  0
              ),

            providerCostNgn:
              Number(
                alternative
                  .providerCostNgn ||
                  0
              ),

            stock:
              Number(
                alternative.stock ||
                  0
              ),

            inStock:
              Boolean(
                alternative
                  .inStock &&
                  Number(
                    alternative
                      .stock ||
                      0
                  ) > 0
              ),

            visible:
              !categoryHidden &&
              !productHidden,

            hiddenByCategory:
              categoryHidden,

            hiddenByProduct:
              productHidden,
          });

          const categoryId =
            `${alternative.provider}:${slugify(
              product.category
            )}`;

          if (
            !categoryMap.has(
              categoryId
            )
          ) {
            categoryMap.set(
              categoryId,
              {
                id:
                  categoryId,

                provider:
                  alternative
                    .provider,

                category:
                  product
                    .category,

                visible:
                  !categoryHidden,

                productCount: 0,
              }
            );
          }

          categoryMap.get(
            categoryId
          ).productCount += 1;
        }
      }

      return res.json({
        success: true,

        categories: [
          ...categoryMap.values(),
        ].sort(
          (a, b) =>
            a.category.localeCompare(
              b.category
            )
        ),

        products:
          variants.sort(
            (a, b) =>
              a.category.localeCompare(
                b.category
              ) ||
              a.name.localeCompare(
                b.name
              ) ||
              a.provider.localeCompare(
                b.provider
              )
          ),
      });
    } catch (error) {
      console.error(
        "Load social admin catalog error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          code:
            "SOCIAL_ADMIN_CATALOG_FAILED",
          message:
            "Unable to load social catalog controls.",
        });
    }
  };

exports.setVisibility =
  async (req, res) => {
    try {
      const scope =
        String(
          req.body?.scope ||
            ""
        )
          .trim()
          .toLowerCase();

      if (
        ![
          "category",
          "product",
        ].includes(scope)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            code:
              "INVALID_VISIBILITY_SCOPE",
            message:
              "Visibility scope must be category or product.",
          });
      }

      const provider =
        normalizeProvider(
          req.body?.provider
        );

      const visible =
        req.body?.visible !==
        false;

      let ruleKey = "";
      let category = "";
      let categoryKey = "";
      let providerProductId =
        "";

      if (
        scope ===
        "category"
      ) {
        category =
          normalizeText(
            req.body?.category
          );

        if (!category) {
          return res
            .status(400)
            .json({
              success: false,
              code:
                "CATEGORY_REQUIRED",
              message:
                "Category is required.",
            });
        }

        categoryKey =
          slugify(category);

        ruleKey =
          categoryRuleKey(
            provider,
            category
          );
      } else {
        providerProductId =
          String(
            req.body
              ?.providerProductId ||
              ""
          ).trim();

        if (
          !providerProductId
        ) {
          return res
            .status(400)
            .json({
              success: false,
              code:
                "PROVIDER_PRODUCT_REQUIRED",
              message:
                "Provider product ID is required.",
            });
        }

        ruleKey =
          productRuleKey(
            provider,
            providerProductId
          );
      }

      if (visible) {
        await SocialCatalogRule
          .deleteOne({
            ruleKey,
          });
      } else {
        await SocialCatalogRule
          .findOneAndUpdate(
            {
              ruleKey,
            },

            {
              $set: {
                ruleKey,
                scope,
                provider,
                category,
                categoryKey,
                providerProductId,
                hidden: true,
                updatedBy:
                  req.user?._id ||
                  null,
              },
            },

            {
              upsert: true,
              new: true,
              setDefaultsOnInsert:
                true,
            }
          );
      }

      return res.json({
        success: true,
        scope,
        provider,
        category,
        providerProductId,
        visible,
      });
    } catch (error) {
      console.error(
        "Update social visibility error:",
        error
      );

      return res
        .status(
          Number(
            error?.status
          ) || 500
        )
        .json({
          success: false,
          code:
            error?.code ||
            "SOCIAL_VISIBILITY_UPDATE_FAILED",
          message:
            error?.message ||
            "Unable to update social visibility.",
        });
    }
  };

/* =========================================================
   HOUSE STOCK
========================================================= */

exports.getHouseProducts =
  async (req, res) => {
    try {
      const products =
        await SocialProduct
          .find({
            sourceType:
              "house",
          })
          .sort({
            createdAt: -1,
          })
          .lean();

      const productIds =
        products.map(
          (product) =>
            product._id
        );

      const grouped =
        productIds.length
          ? await HouseStockItem
              .aggregate([
                {
                  $match: {
                    product: {
                      $in:
                        productIds,
                    },
                  },
                },

                {
                  $group: {
                    _id: {
                      product:
                        "$product",
                      status:
                        "$status",
                    },

                    count: {
                      $sum: 1,
                    },
                  },
                },
              ])
          : [];

      const countsByProduct =
        new Map();

      for (
        const row of grouped
      ) {
        const productId =
          String(
            row?._id
              ?.product ||
              ""
          );

        if (
          !countsByProduct.has(
            productId
          )
        ) {
          countsByProduct.set(
            productId,
            {
              available: 0,
              reserved: 0,
              sold: 0,
            }
          );
        }

        const status =
          String(
            row?._id
              ?.status ||
              ""
          );

        if (
          [
            "available",
            "reserved",
            "sold",
          ].includes(status)
        ) {
          countsByProduct.get(
            productId
          )[status] =
            Number(
              row.count || 0
            );
        }
      }

      return res.json({
        success: true,

        products:
          products.map(
            (product) =>
              sanitizeHouseProduct(
                product,
                countsByProduct.get(
                  String(
                    product._id
                  )
                )
              )
          ),
      });
    } catch (error) {
      console.error(
        "Load house stock products error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          code:
            "HOUSE_STOCK_LOAD_FAILED",
          message:
            "Unable to load house stock.",
        });
    }
  };

exports.createHouseProduct =
  async (req, res) => {
    try {
      const name =
        normalizeText(
          req.body?.name
        );

      const category =
        normalizeText(
          req.body?.category
        );

      if (
        !name ||
        !category
      ) {
        return res
          .status(400)
          .json({
            success: false,
            code:
              "HOUSE_PRODUCT_DETAILS_REQUIRED",
            message:
              "Product name and category are required.",
          });
      }

      const costPrice =
        positiveNumber(
          req.body?.costPrice ??
            req.body
              ?.providerCostNgn ??
            0,
          {
            field:
              "cost price",
          }
        );

      const sellingPrice =
        positiveNumber(
          req.body
            ?.sellingPrice,
          {
            field:
              "selling price",
            allowZero: false,
          }
        );

      const product =
        new SocialProduct({
          sourceType:
            "house",

          catalogKey:
            `house::${slugify(
              category
            )}::${slugify(
              name
            )}::${crypto
              .randomBytes(5)
              .toString("hex")}`,

          name,
          category,

          provider:
            "house",

          providerProductId:
            "pending",

          providerCurrency:
            "NGN",

          providerUnitPrice:
            costPrice,

          providerCostNgn:
            costPrice,

          sellingPrice,

          stock: 0,
          inStock: false,
          alternatives: [],
          isActive:
            req.body
              ?.isActive !==
            false,
          lastSyncedAt:
            new Date(),
        });

      product.providerProductId =
        String(
          product._id
        );

      await product.save();

      const inventory =
        await addInventoryItems(
          {
            productId:
              product._id,

            items:
              req.body?.items ??
              req.body
                ?.stockText ??
              [],
          }
        );

      const refreshed =
        await SocialProduct
          .findById(
            product._id
          )
          .lean();

      return res
        .status(201)
        .json({
          success: true,

          message:
            "House stock product created.",

          inventory,

          product:
            sanitizeHouseProduct(
              refreshed,
              {
                available:
                  inventory.stock,
              }
            ),
        });
    } catch (error) {
      console.error(
        "Create house stock product error:",
        error
      );

      return res
        .status(
          Number(
            error?.status
          ) || 500
        )
        .json({
          success: false,
          code:
            error?.code ||
            "HOUSE_PRODUCT_CREATE_FAILED",
          message:
            error?.message ||
            "Unable to create house stock product.",
        });
    }
  };

exports.updateHouseProduct =
  async (req, res) => {
    try {
      const product =
        await SocialProduct
          .findOne({
            _id:
              req.params.id,
            sourceType:
              "house",
          });

      if (!product) {
        return res
          .status(404)
          .json({
            success: false,
            code:
              "HOUSE_PRODUCT_NOT_FOUND",
            message:
              "House stock product not found.",
          });
      }

      if (
        req.body?.name !==
        undefined
      ) {
        const name =
          normalizeText(
            req.body.name
          );

        if (!name) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Product name cannot be empty.",
            });
        }

        product.name =
          name;
      }

      if (
        req.body?.category !==
        undefined
      ) {
        const category =
          normalizeText(
            req.body.category
          );

        if (!category) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Category cannot be empty.",
            });
        }

        product.category =
          category;
      }

      if (
        req.body?.costPrice !==
        undefined
      ) {
        const cost =
          positiveNumber(
            req.body
              .costPrice,
            {
              field:
                "cost price",
            }
          );

        product
          .providerUnitPrice =
          cost;

        product
          .providerCostNgn =
          cost;
      }

      if (
        req.body
          ?.sellingPrice !==
        undefined
      ) {
        product.sellingPrice =
          positiveNumber(
            req.body
              .sellingPrice,
            {
              field:
                "selling price",
              allowZero: false,
            }
          );
      }

      if (
        req.body?.isActive !==
        undefined
      ) {
        product.isActive =
          Boolean(
            req.body
              .isActive
          );
      }

      product.lastSyncedAt =
        new Date();

      await product.save();

      const stock =
        await syncHouseStock(
          product._id
        );

      return res.json({
        success: true,
        message:
          "House stock product updated.",
        product:
          sanitizeHouseProduct(
            product,
            {
              available:
                stock,
            }
          ),
      });
    } catch (error) {
      console.error(
        "Update house stock product error:",
        error
      );

      return res
        .status(
          Number(
            error?.status
          ) || 500
        )
        .json({
          success: false,
          code:
            error?.code ||
            "HOUSE_PRODUCT_UPDATE_FAILED",
          message:
            error?.message ||
            "Unable to update house stock product.",
        });
    }
  };

exports.addHouseStock =
  async (req, res) => {
    try {
      const product =
        await SocialProduct
          .findOne({
            _id:
              req.params.id,
            sourceType:
              "house",
          });

      if (!product) {
        return res
          .status(404)
          .json({
            success: false,
            code:
              "HOUSE_PRODUCT_NOT_FOUND",
            message:
              "House stock product not found.",
          });
      }

      const inventory =
        await addInventoryItems(
          {
            productId:
              product._id,

            items:
              req.body?.items ??
              req.body
                ?.stockText ??
              [],
          }
        );

      return res.json({
        success: true,
        message:
          `${inventory.added} new item${
            inventory.added ===
            1
              ? ""
              : "s"
          } added.`,

        ...inventory,
      });
    } catch (error) {
      console.error(
        "Add house stock error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          code:
            "HOUSE_STOCK_ADD_FAILED",
          message:
            "Unable to add house stock.",
        });
    }
  };