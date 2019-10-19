const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const { GraphQLServer } = require('graphql-yoga')

const rss = require('./utils/rss')

dotenv.config()

const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/tapnews'
mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.set('useCreateIndex', true)
mongoose.set('useFindAndModify', false)
const db = mongoose.connection
db.on('error', console.error.bind(console, 'Mongo connection ERROR :('))
db.once('open', () => {
  console.log(`Mongo connected to ${mongoURL} :)`)
  rss()
})

const typeDefs = 'schemas/index.graphql'
const resolvers = require('./resolvers')
const production = process.env.NODE_ENV === 'production'

const server = new GraphQLServer({
  typeDefs,
  resolvers
})
const port = process.env.SERVER_PORT || 3000

server.express.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  )
  next()
})

server.express.use('/uploads', express.static('../uploads'))

server.start(
  {
    port,
    endpoint: '/graphql',
    playground: '/playground',
    bodyParserOptions: { limit: '10mb', type: 'application/json' },
    debug: production ? false : true
  },
  () => {
    console.log(`Server is running on port:${port}`)
  }
)
