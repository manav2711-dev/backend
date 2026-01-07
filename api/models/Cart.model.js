const mongoose = require('mongoose')
const {ProductSchema} = require("../models/Product.model")
const ObjectId = mongoose.Schema.ObjectId

const CartSchema = new mongoose.Schema({
	user:{
			userID: {
			type: ObjectId,
			ref: 'User',
			required: true,
	       },
		   userName: {
			type: String,
			ref: 'User',
			required: true,
	       },
		   email: {
			type: String,
			ref: 'User',
			required: true,
	       },
    },
	products: [
		{
			_id:false,
			product: { 
				type: ProductSchema,
				required: false,
			}, 
			quantity: { 
				type: Number, 
				default: 1,
			},
		},
	],

}, 
	{timestamps: true}
)

module.exports = mongoose.model("Cart", CartSchema)