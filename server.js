const path = require('path')
const express = require('express')
const app = express()
const compression = require('compression')

const PORT = process.env.PORT || 1102

app.use(compression())
app.use(express.static('public'))
app.use(express.static('dist'))

app.route('/').get((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.route('/get_data').get((req, res) => {
  const data = require('./data.json')
  res.json(data)
})

app.listen(PORT, () => console.log(`App is listening on port: ${PORT}`))