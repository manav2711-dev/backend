const mongoose = require('mongoose')

const passwordSchema = new mongoose.Schema({
    userId:{
        type:String,
        required:true,
    },
    name: {
        type: String,
        required: true,
    },
    iv: {
        type: String,
        required: false,
    },
    ciphertext: {
        type: String,
        required: false,
    },
    authTag: {
        type: String,
        default: false,
    },
}, 
    {timestamps: true}
)

module.exports = mongoose.model("Password", passwordSchema)