const mongoose = require('mongoose')
const { getOccasion, getGender } = require("../utils/utils");
const { product } = require('./schema');

const ProductSchema = new mongoose.Schema({
  itemId: { type: Number,required: true },
  iName: { type: String, required: true },
  iDesc: { type: String, default: null },
  unit: { type: String },
  comment: { type: String, default: null },
  groupName: { type: String }, //   This is your category/itemGroup
  imgPath: { type: mongoose.Schema.Types.Mixed, default: null },
  thumbPath: { type: mongoose.Schema.Types.Mixed, default: null },
  groupId: { type: Number },
  compBarId: { type: Number },
  tranRate: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 0 },
  orderQty: {type:Number, default:1},
  gender: { type: String, default: null },
  occasion: { type: String, default: null},
  cod: {type: Boolean, default:null},
});

const mapProductResponse = (item) => ({
...item,
  itemId: Number(item.item),
  iName: item.extra?.iName,
  iDesc: item.extra?.iDesc || null,
  unit: item.extra?.unit,
  // comment: item.remarks || null,
  groupName: item.extra?.groupName,
  imgPath: item.extra?.imgPath || "",
  thumbPath: item.extra?.thumbPath || "",
  gender: getGender(item.extra?.gender || ""),
  occasion: getOccasion(item.extra?.occasion || ""),
  groupId: Number(item.itemGroup),
  orderQty: Number(item.qty??1),
  // compBarId: item.companyBarId,
  tranRate: Number(item.rate ?? 0),
  balance: Number(item.extra?.c_bal ?? 0),
  reorderLevel: Number(item.reorderQty ?? 0),
  cod: Boolean(item.extra?.cod),
});
module.exports = {
Product : mongoose.model("Product", ProductSchema),
ProductSchema,
mapProductResponse
};