const router = require("express").Router()
const { celebrate } = require("celebrate")
const ObjectId = require("mongoose").Types.ObjectId

const Cart = require("../models/Cart.model")
const { cart: cartSchema } = require('../models/schema')
const { 
	verifyToken,
	verifyAuthorization,
	verifyAdminAccess,
} = require('../middlewares/verifyAuth')


// Get all carts - admin only
router.get("/", verifyAdminAccess, async (req, res) => {
	try {
		const carts = await Cart.find()
		return res.json(carts)

	} catch (err) {
		console.error(err)
		return res.status(500).json(cartResponse.unexpectedError)
	}
})

// Create a new cart - any authenticated user
router.post("/", 
	verifyToken, 
	// celebrate({ body: cartSchema.new }),
	async (req, res) => {
	const { user , products } = req.body
	console.log("new cart created",req.body);
	try {
		await Cart.create({ 
			 user: {
          userID: ObjectId(user._id),
          userName: user.fullname,
		  email:user.email,
        },
			products:[],
		})
		return res.json(cartResponse.cartCreated)
	} catch (err) {
		console.log(err)
		return res.status(500).json(cartResponse.unexpectedError)
	}
})

// Reset a cart - any authenticated user
router.post("/clear", verifyToken, async (req, res) => {
	try {
		await Cart.updateOne(
			{"user.userID": ObjectId(req.user.uid)},							
			{$set: {products: []}},
		)
		return res.json(cartResponse.cartCleared)
	} catch (err) {
		console.log(err)
		return res.status(500).json(cartResponse.unexpectedError)
	}
})

// Get a cart - authorized user & admin only
router.get("/:id", verifyAuthorization, async (req, res) => {
	try {
		let cart = await Cart.findOne({ "user.userID": ObjectId(req.params.id) })
		console.log("fetchedcart",cart);
		if (cart) {
			cart = await cart.populate({
				path: 'products.product',
				select: ['title','price','image']
			})
		}
		return res.json(cart)

	} catch (err) {
		console.error(err)
		return res.status(500).json(cartResponse.unexpectedError)
	}
})

// Update a cart - authorized user & admin only
router.put("/:id", 
	verifyAuthorization, 
	celebrate({ body: cartSchema.update }),
	async (req, res) => {
	const { products } = req.body          
     console.log("product for cart",products);
	try {
		await Cart.findOneAndUpdate(
			{"user.userID": ObjectId(req.params.id)},
			{ $push: { products: { $each: products } } },
			{new: true, upsert:true},
		)
		return res.status(cartResponse.cartUpdated.statuscode).json(products)
	} catch (err) {
		console.error(err)
		return res.status(500).json(cartResponse.unexpectedError)
	}
})

// Patch a cart (mostly to update a product qty or to remove a product) - authorized user & admin only
router.patch("/:id",
	verifyAuthorization,
	celebrate({ body: cartSchema.patch }),
	async (req, res) => {
	const { productID, quantity } = req.body
    console.log("remove product",req.body);
	try {
		if (quantity === 0) {
			await Cart.updateOne(
				{"user.userID": ObjectId(req.params.id)},
				{ $pull: { products: { "product._id": ObjectId(productID) } } }
			)
		} else {
			await Cart.updateOne(
				{"user.userID": ObjectId(req.params.id),  "products.product._id": ObjectId(productID)},
				{$set: { "products.$.quantity": quantity }}
			)
		}
		return res.json(cartResponse.cartPatched)

	} catch (err) {
		console.error(err)
		return res.status(500).json(cartResponse.unexpectedError)
	}
})

// Delete a cart - authorized user & admin only
router.delete("/:id", verifyAuthorization, async (req, res) => {
	try {
		await Cart.deleteOne({ userID: ObjectId(req.params.id) })
		res.json(cartResponse.cartDeleted)

	} catch (err) {
		console.log(err)
		return res.status(500).json(cartResponse.unexpectedError)
	}
})

const cartResponse = {
	cartCreated: { 
		status: "ok",
		message: "cart has been created",
	},	
	cartCleared: { 
		status: "ok",
		message: "cart has been cleared",
	},	
	cartUpdated: { 
		status: "ok",
		statuscode:200,
		message: "cart has been updated",
	},
	cartPatched: {
		status: "ok",
		message: "cart has been patched",
	},
	cartDeleted: { 
		status: "ok",
		message: "cart has been deleted",
	},
	unexpectedError: {
		status: "error",
		message: "an unexpected error occurred",
	},
}

module.exports = router