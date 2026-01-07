const mongoose = require('mongoose')
const {ProductSchema} = require("../models/Product.model")
const ObjectId = mongoose.Schema.ObjectId

const OrderSchema = new mongoose.Schema({
// 	 orderNumber: {
//     type: String,
//     unique: true,
//     required: true,
//   },
 order_id: { type: String, default: null },
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
			id: {
				type: ObjectId,
				ref: 'Product',
				required: true,
			}, 
			itemId: {
				type: Number,
				ref: 'Product',
				required: true,
			},
			title :{
              type:String,
			  required:true,
			},
			price:{
              type:Number,
			  required:true,
			},
			image:{
             type:String,
			 required:true,
			},
			quantity: { 
				type: Number,
				required:true, 
				default: 1,
			},
		},
	],
	amount: {
		type: Number,
		required: true,
	},
	address: { 
		type: Object, 
		required: true,
	},
	status: {
		type: String,
		default: "pending",
	},
	paymentMethod: {
		type: String,
		default: "",
	},
   txn_orderId: { type: String, default: null },
   txn_uuid: { type: String, default: null },
   txnDate: { type: String, default: null },
   txnAmount: { type: Number, default: 0 },
   txnStatus: { type: String, default: null },
}, 
	{timestamps: true}
)

module.exports = mongoose.model("Order", OrderSchema)