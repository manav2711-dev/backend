require("dotenv").config();
const express = require("express");
const axios = require("axios");
const {Product, mapProductResponse} = require("../models/Product.model");

const router = express.Router();

const BASE_URL = process.env.API_URL;
const API_TOKEN = process.env.API_TOKEN;

const syncProducts = async () => {
  try {
    console.log("Syncing products from external API...");
     const response = await axios.get(`${BASE_URL}itemSetRates`, {
      headers: {
        Accept: "application/json",
        API_TOKEN,
      },
    });
  console.log("Raw products data",response.data);
    const products = response.data;

    if (!Array.isArray(products)) {
      console.error("  Invalid API response format. Expected an array.");
      return { inserted: 0, updated: 0, deleted:0, failed: 0 };
    }

    let inserted = 0;
    let updated = 0;
    let deleted = 0;
    let failed = 0;

    const itemIds = products.map((item) => Number(item.item))

    for (const item of products) {
      const mappedProduct = mapProductResponse(item);
      try {
        const result = await Product.updateOne(
          { itemId: mappedProduct.itemId },
          { $set: mappedProduct },
          { upsert: true }
        );

        //     const result = await Product.findOneAndUpdate(
        //   { itemId: mappedProduct.itemId },
        //   { $set: mappedProduct },
        //   { new: true, upsert: true } // update or insert
        // );

        if (result.upsertedCount > 0) {
          console.log(`Inserted: itemId ${mappedProduct.itemId}`);
          inserted++;
        } else if (result.modifiedCount > 0) {
          console.log(`Updated: itemId ${mappedProduct.itemId}`);
          updated++;
        } else {
          // console.log(`No change`);
        }
      } catch (err) {
        console.error(`  Failed to process itemId ${mappedProduct.itemId}:`, err.message);
        failed++;
      }
    }

    const deleteResult = await Product.deleteMany({
      itemId: {$nin: itemIds},
    }); 
    deleted = deleteResult.deletedCount;

    // console.log(products);

    console.log(`Sync complete: ${inserted} inserted, ${deleted} deleted, ${updated} updated, ${failed} failed`);
    return { inserted, updated,deleted, failed };
  } catch (error) {
    console.error("  API Sync Error:", error.message);
    throw error;
  }
};

// Route for manual sync
router.post("/", async (req, res) => {
  try {
    const result = await syncProducts();
    res.json({ message: "  Manual sync completed", result });
  } catch (err) {
    res.status(500).json({ error: "  Manual sync failed", details: err.message });
  }
});

module.exports = {
  router,
  syncProducts,
};
