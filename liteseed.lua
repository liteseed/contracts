require('./dao.lua')
require('./token.lua')

Balances = Balances or {}
Stakers = Stakers or {}
Unstaking = Unstaking or {}
Votes = Votes or {}

Handler.stake = stake
