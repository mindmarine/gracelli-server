// product mongoose model

const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  sku: String,
  price: Number,
  units: Number,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
},
{
  timestamps: true
})

// VERY IMPORTANT STEP
module.exports = mongoose.model('Product', productSchema)
