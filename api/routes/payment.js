// route/payment.js
const express = require("express");
const axios = require("axios");
const Order = require("../models/Order.model")
const crypto = require("crypto");
const router = express.Router();
const Razorpay = require("razorpay");
const { 
    verifyToken,
    verifyAuthorization,
    verifyAdminAccess,
} = require('../middlewares/verifyAuth')


router.post("/razorpay-order",verifyToken, async (req, res) => {
  try {
   const {
      orderId,
      user,
      amount,
    } = req.body;
    console.log(req.body);

    const dbOrder = await Order.findOne({_id:orderId});
     console.log("DB Order:",dbOrder);

    if (!dbOrder){
      return res.status(400).json({
        success: false,
        message: `Order not Found for ${order_id}`,
      });
    }

    if(dbOrder.amount != amount){
      console.log(`Amount mismatch! Payment not Allowed dbamount:${dbOrder.amount}, amount:${amount}`);
      return res.status(400).json({
        success: false,
        message: `Amount mismatch! Payment not Allowed dborder:${dbOrder.amount}, amount:${amount}`,
      });
    }
   
    const instance = new Razorpay({
      key_id: process.env.KEY_ID,
      key_secret: process.env.KEY_SECRET,
    });
    const response = await instance.orders.create({
      amount: dbOrder.amount* 100, // convert to paisa
      currency: "INR",
      receipt: `${user.userID}#${Date.now()}`,
      payment_capture: 1,
    });
     
    console.log("Razorpay Order Created:", response);
    
    return res.status(200).json({
      success: true,
      razOrder: response,
    });
  } catch (error) {
    console.error("Error creating session:", error || error.message);
    res.status(500).json({ error: "Payment session failed" });
  }
});

router.post("/verify-payment", verifyToken,(req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body.paymentDetails;
  const generated_signature = crypto
    .createHmac("sha256", process.env.KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

    console.log("generated:",generated_signature);
    console.log("razSignature:",razorpay_signature);

  if (generated_signature === razorpay_signature) {
        return res.status(200).json({ 
      success: true, 
      message: "Payment verified", 
    });
  } else {
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  }
});

router.get("/razstatus/:payment_id/:txnOrder_id/:orderId/:order_total",verifyToken, async (req, res) => {
  try {
  //  console.log("key:",KEY);
 
    const { payment_id,txn_Order_id,orderId,order_total} = req.params;
  
    //  console.log("userid:",user_id);
      const razorpay = new Razorpay({
      key_id: process.env.KEY_ID,
      key_secret: process.env.KEY_SECRET,
    });

    const paymentDetails = await razorpay.payments.fetch(payment_id);
    let status="";
    if(order_total == paymentDetails.amount/100){
       status = paymentDetails.status; 
    }else{
      status = "Failed(Amount Mismatched)";
    }
    await Order.findOneAndUpdate(
      {_id: orderId},
      {
        txn_orderId: paymentDetails.order_id,
        txn_uuid: paymentDetails.id || null,
        txnDate: new Date(paymentDetails.created_at * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        txnAmount:paymentDetails.amount/100,
        txnStatus: status,
      },
      {new: true}
    );
    console.log("✅ Success Response from Razorpay:", paymentDetails);
      return res.status(200).json({ 
      status:"ok", 
      data: paymentDetails, 
    }); // send to frontend
  } catch (error) {
    console.error("Error fetching order status:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch order status" });
  }
});

module.exports = router;
