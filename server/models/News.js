const mongoose = require('mongoose')

const Schema = mongoose.Schema

const schema = new Schema({
  title: { type: String },
  image: { type: String },
  created: { type: Date },
  content: { type: String },
  audio: { type: String },
  source: { type: String },
  url: { type: String }
})

module.exports = mongoose.model('News', schema)
