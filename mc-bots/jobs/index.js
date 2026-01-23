const farmer = require('./farmer')
const farmerWheat = require('./farmer-wheat')
const farmerPotatoes = require('./farmer-potatoes')
const farmerBeets = require('./farmer-beets')
const brigadier = require('./brigadier')
const guard = require('./guard')
const scout = require('./scout')

module.exports = {
  farmer,
  'farmer-wheat': farmerWheat,
  'farmer-potatoes': farmerPotatoes,
  'farmer-beets': farmerBeets,
  brigadier,
  guard,
  scout
}
