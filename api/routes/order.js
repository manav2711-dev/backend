const router = require("express").Router()
const ObjectId = require('mongoose').Types.ObjectId
const { celebrate } = require('celebrate')
const {Product} = require("../models/Product.model");
const { tokengeneration } = require("../utils/utils");
const Order = require("../models/Order.model")
const axios = require("axios");
const { order: orderSchema } = require('../models/schema')
const { 
	verifyToken,
	verifyAuthorization,
	verifyAdminAccess,
} = require('../middlewares/verifyAuth')


// Get all orders - admin only
router.get("/", 
	verifyAdminAccess, 
	// celebrate({ query: orderSchema.query }),
	async (req, res) => {
	const query = req.query

	try {
		let orders
		if (query.status) {
			orders = await Order.find({ status: query.status })
		} else {
			orders = await Order.find()
		}

		return res.json(orders)

	} catch (err) {
		console.error(err)
		return res.status(500).json(orderResponse.unexpectedError)
	}
})

// Create a new order - authenticated user
router.post("/", 
	verifyToken, 
	// celebrate({ body: orderSchema.new }),
	async (req, res) => {
		// console.log("order",req.body) 
	const { user,products, amount, address,paymentMethod } = req.body
	try {
		for(const item of products){
			const dbProduct = await Product.findOne({_id:item.id});
			// console.log("DB Product",dbProduct);
	
		if(!dbProduct){
			return res.status(404).json(`Product not found in DB for itemId: ${item.id}`)
		}
		if(dbProduct.tranRate != item.price){
			 console.log(`product rate mismatch. Expected: ${dbProduct.tranRate}, Received: ${item.price}`);
			 return res.status(400).json(`Product Rate mismatch. Expected: ${dbProduct.tranRate}, Received: ${item.price}`)
		}
		}

		const calculatedTotal = products.reduce((acc, item) =>{
			return acc + (item.price * item.quantity);
		},0);

		if(parseFloat(calculatedTotal) != parseFloat(amount)){
			 console.log(`Order total mismatch. Expected: ${calculatedTotal}, Received: ${amount}`);
			  return res.status(400).json(`Order total mismatch. Expected: ${calculatedTotal}, Received: ${amount}`)
		}

		const destination = `${address.name}, ${address.area}, ${address.city}, ${address.state},${address.country}, ${address.pincode}`;

		const order = await Order.create({
			// orderNumber: uuidv4(), 
		user: {
          userID: ObjectId(user._id),
          userName: user.fullname,
		  email:user.email,
        },
			products,
			amount,
			address,
			paymentMethod,
		})
        // SEND ORDER TO SERVER
		const orderDataForAdmin = products.map((item) => ({
		tranId: 0,
        item_id: item.itemId,
        type_id: 0,
        style_id: 0,
        itemName: item.title || "",
        typeName: "",
        styleName: "",
        groupName: "",
        remarks: "",
        qty: item.quantity,
        rate: item.price,
        img_path: item.image || "",
        images: [],
        itemAttrib: [],
        token:tokengeneration(item.itemId,item.quantity,item.price),
		})) 

		const payloadToAdmin = {
        led_id: parseInt(user._id),
        // order_no: order.orderNumber,
		order_no:parseInt(order._id.toString()),
        // remarks: paymentType.toUpperCase() + " Order",
		remarks: "Order",
        destination,
        contact_id: parseInt(user._id),
        agentId: 0, //   set agentId to 0
        po: false,
        latitude: 0.0,
        longitude: 0.0,
        orderData: orderDataForAdmin,
		}

		 console.log("  Payload sent to admin panel:", payloadToAdmin);

      const adminRes = await axios.post(
        "https://web.accountsdeck.com/cartmob/createSaleOrder?comp=746",
        payloadToAdmin,
        {
          headers: {
            "Content-Type": "application/json",
            "API_TOKEN": process.env.API_TOKEN,
          },
        }
      );

      console.log("  Order sent to Admin Panel successfully");
      console.log("🧾 Admin Response:", adminRes.data);

	  const updatedOrder = await Order.findOneAndUpdate(
		order._id,
		{
		order_id: new String(adminRes.data.response_id),
		},
		{new:true}
	  )

	  console.log("updated order placed",updatedOrder);

		return res.json({
			...orderResponse.orderCreated,
			orderID: order._id,
		})

	} catch (err) {
		console.log(err)
		return res.status(500).json(orderResponse.unexpectedError)
	}
})
	
// Get order statistics - admin only
router.get("/stats", verifyAdminAccess, async (req, res) => {
	const date = new Date()
	const lastMonth = new Date(date.setMonth(date.getMonth() - 1))
	const previousMonth = new Date(date.setMonth(lastMonth.getMonth() - 1))

	try {
		const data = await Order.aggregate([
			{$match: {
				createdAt: { $gte: previousMonth },
			}},
			{$project: {
				month: { $month: "$createdAt" },
				sales: "$amount",
			}},
			{$group: {
				_id: "$month",
				sales: { $sum: "$sales"},
			}}
		])
		res.json(data)

	} catch (err) {
		console.error(err)
		return res.status(500).json(orderResponse.unexpectedError)
	}
})

// Get an order - authorized user & admin only
router.get("/:id", verifyToken, async (req, res) => {
	// cannot use 'verifyAuthorization' due to 'id' being 'orderID' here
	try {
		let order

		// manually verify authorization
		if (req.user.isAdmin) {
			order = await Order.findById(req.params.id)
		} else {
			order = await Order.findOne({
				_id: ObjectId(req.params.id),
				"user.userID": ObjectId(req.user.uid),
			})
		}

		if (!order) {
			return res.status(404).json(orderResponse.orderNotFound)
		} 
		order = await order.populate({
			path: "products.id",
			select: ["title", "price", "image"],
		})
		console.log("single order",order)
		return res.json({status: "ok", order})

	} catch (err) {
		console.error(err)
		return res.status(500).json(orderResponse.unexpectedError)
	}
})

// Update an order - admin only
router.put("/:id", 
	verifyAdminAccess, 
	// celebrate({ body: orderSchema.update }),
	async (req, res) => {
	try {
		await Order.findByIdAndUpdate(
			req.params.id,
			{$set: req.body},
			{new: true},
		)
		return res.json(orderResponse.orderUpdated)
		
	} catch (err) {
		console.error(err)
		return res.status(500).json(orderResponse.unexpectedError)
	}
})

// Delete an order - admin only
router.delete("/:id", verifyToken, async (req, res) => {
	try {
		await Order.findByIdAndDelete(req.params.id)
		res.json(orderResponse.orderDeleted)

	} catch (err) {
		console.log(err)
		return res.status(500).json(orderResponse.unexpectedError)
	}
})

// Get user orders - authorized user & admin only
router.get("/user/:id", verifyAuthorization, async (req, res) => {
	try {
		let orders = await Order.find({ "user.userID": ObjectId(req.params.id) })
			.populate({
				path: 'products.id',
				select: ['title','image','price'],
			})
			  console.log(orders);
		return res.json(orders)

	} catch (err) {
		console.error(err)
		return res.status(500).json(orderResponse.unexpectedError)
	}
})


const orderResponse = {
	orderCreated: { 
		status: "ok",
		message: "order has been created",
	},	
	orderUpdated: { 
		status: "ok",
		message: "order has been updated",
	},
	orderDeleted: { 
		status: "ok",
		message: "order has been deleted",
	},
	orderNotFound: {
		status: "error",
		message: "order not found",
	},
	unexpectedError: {
		status: "error",
		message: "an unexpected error occurred",
	},
}

module.exports = router