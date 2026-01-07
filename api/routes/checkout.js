const router = require("express").Router()
const stripe = require("stripe")(process.env.STRIPE_SECRET)
const ObjectId = require('mongoose').Types.ObjectId

const { verifyToken,verifyAuthorization } = require('../middlewares/verifyAuth')
const Cart = require("../models/Cart.model")
const Order = require("../models/Order.model")

router.get("/payment", verifyToken, async (req, res) => {
  const cart = await Cart.findOne({ "user.userID": ObjectId(req.user.uid) })

  if (!cart || (cart.products.length <= 0)) {
  	return res.status(400).json(checkoutResponse.cartIsEmpty)
  }

	let cartPopulated = await cart.populate({
		path: 'products.product._id',
		select: ['title','price']
	})
	console.log("cartpopulated",cartPopulated.products)

	let cartTotal = 0
	for (p of cartPopulated.products) {
		cartTotal += p.quantity * p.product.tranRate
	}
	console.log("cart Total",cartTotal);

  // Create a PaymentIntent with the order amount and currency
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: (cartTotal * 100),
//     currency: "inr",
//   })

  return res.json({
    // clientSecret: paymentIntent.client_secret,
    finalOrder: {
	  	...cartPopulated._doc, 
	  	amount: cartTotal,
	  },
  })
});

router.get("/address/:id", verifyAuthorization, async (req, res) => {
	try {
		let address = await Order.find({ "user.userID": ObjectId(req.params.id) },
	    { address: 1, _id: 0 } );
			  console.log("user address",address);
			  const raw = address.map(o => JSON.stringify(o.address));
              const unique = [...new Set(raw)].map(a => JSON.parse(a));
             return res.json({ address: unique });
		// return res.json(address)

	} catch (err) {
		console.error(err)
		return res.status(500).json(checkoutResponse.unexpectedError)
	}
});

const checkoutResponse = {
	cartIsEmpty: {
		status: "error",
		message: "cannot checkout an empty cart",
	},
	unexpectedError: {
		status: "error",
		message: "an unexpected error occurred",
	},
}

module.exports = router