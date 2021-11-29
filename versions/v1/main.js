const path = require('path')
const express = require('express')
const router = express.Router()

const raw = require('./routes/raw')
const texture = require('./routes/texture')
const textures = require('./routes/textures')
const contribution = require('./routes/contribution')
const addon = require('./routes/addon')

router.use('/raw', raw)
router.use('/texture', texture)
router.use('/textures', textures)
router.use('/contribution', contribution)
router.use('/addon', addon)

router.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '..', '..', '/page.html'))
})

module.exports = router