// product routes

// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// gracelli specific resource
// pull in Mongoose model for products
const Product = require('../models/product')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { product: { title: '', text: 'foo' } } -> { product: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// gracelli product specific starts here

// CREATE PRODUCTS
// POST /products
// Authenticated route
router.post('/products', requireToken, (req, res, next) => {
  // Request object will having some incoming data
  /*
  {
    "product": {
        "name": "",
        "description": "",
        "sku": "",
        "price": 1599,
        "units": 1000
    }
    }
    */
  // does not include the owner!
  const productData = req.body.product

  // Manually attaching the owner field to the productData
  // Request object also contains a key `user` which is the document
  // representing the currently signed in user
  // based on the token provided in the request
  // We only have this because of requireToken & passport
  productData.owner = req.user._id
  // Note: mongoose provides `id` (string) & `_id` (ObjectId)

  // Pass the productData to create the Product document
  Product.create(productData)
    // respond to successful `create` with status 201 and JSON of new "product"
    // .then(product => res.status(201).json({ product: product }))
    .then(product => res.status(201).json({ product }))
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// INDEX PRODUCTS
// GET /products
// Authenticated Route
router.get('/products', requireToken, (req, res, next) => {
  // What if we just want OUR products
  // Mongoose queries are objects where the key is a field on the model & the value is the value to filter by
  Product.find({ owner: req.user._id })
    // Just get all the products
    // Product.find()
    .then(products => res.json({ products }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// SHOW PRODUCT
// GET /products/:id
// :id will be the ID of the product we want to show
router.get('/products/:id', requireToken, (req, res, next) => {
  const id = req.params.id

  Product.findById(id)
    .then(handle404)
    // if `findById` is successful, respond with 200 and "product" JSON
    // Handle ownership
    // .then(product => requireOwnership(req, product))
    .then(product => {
      // Throw an error before sending the product back if the user doesn't own it
      // requireOwnership(req, product)
      res.status(200).json({ product })
    })
    // if an error occurs, pass it to the handler
    .catch(next)
})

// UPDATE
// PATCH /products/:id
// Authenticated Route
router.patch('/products/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  const id = req.params.id
  delete req.body.product.owner

  Product.findById(id)
    .then(handle404)
    .then(product => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, product)

      // pass the result of Mongoose's `.update` to the next `.then`
      return product.updateOne(req.body.product)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// DELETE PRODUCT
// (only if they're owned by the signed in user)
// DELETE /products/:id
// Authenticated route
// :id is a placeholder - knowns as a URL parameter
router.delete('/products/:id', requireToken, (req, res, next) => {
  const id = req.params.id

  Product.findById(id)
    .then(handle404)
    // throw an error if current user doesn't own `product`
    .then(product => requireOwnership(req, product))
    // delete the product ONLY IF the above didn't throw
    .then(product => product.deleteOne())
  // .then(product => {
  //     // 1. check if we own the document
  //     requireOwnership(req, product)
  //     // 2. delete if we do
  //     return product.deleteOne()
  // })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// IMPORTANT STEP
module.exports = router
