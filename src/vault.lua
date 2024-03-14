local ao = require('ao')
local json = require('json')
local utils = require(".utils")

if not Stakers then Stakers = {} end
IndexedStakers = IndexedStakers or {}

function Stake(msg)
  assert(Balances[msg.From] and tonumber(Balances[msg.From]) >= 1000, "Insufficient Balance")
  Balances[msg.From] = Balances[msg.From] - 1000

  if Stakers[msg.From] == nil then
    Stakers[msg.From] = 0
    IndexedStakers[#IndexedStakers + 1] = msg.From
  end
  
  Stakers[msg.From] = Stakers[msg.From] + 1000
end

function Unstake(msg)
  local sender = msg.From
  local quantity = tonumber(msg.Tags.Quantity)
  local blockHeight = tonumber(msg['Block-Height'])

  assert(Stakers[sender] and Stakers[sender].amount, "Not staked")
  assert(Stakers[sender].amount >= quantity, "Requested amount greater than staked amount")
  assert(Stakers[sender].stakedAt + 100 < blockHeight, "Unstake time delay not expired")

  Stakers[sender].amount = Stakers[sender].amount - quantity
  Balances[sender] = (Balances[sender] or 0) + quantity
  if Stakers[sender].amount == 0 then
    Stakers[sender] = nil
    IndexedStakers = utils.filter(function(v) return (v ~= sender) end, IndexedStakers)
    -- Reputations[sender] = nil
  end
end

function Punish(msg, env)
  assert(msg.From == env.Process.Id, "Caller not owner")

  local stakerIndex = tonumber(msg.Tags.StakerIndex)
  local staker = IndexedStakers[stakerIndex]

  assert(staker, "Staker does not exist")
  -- assert(Reputations[staker], "Reputation does not exist")
  -- Reputations[staker] = Reputations[staker] - 100
end

function Reward(msg, env)
  assert(msg.From == env.Process.Id, "Caller not owner")

  local stakerIndex = tonumber(msg.Tags.StakerIndex)
  local staker = IndexedStakers[stakerIndex]

  assert(staker, "Staker does not exist")
  -- assert(Reputations[staker], "Reputation does not exist")

  -- Reputations[staker] = Reputations[staker] + 100
end

-- How do we know if a bundler request has been resolved?
-- Who can slash? Anyone - Slasher gets the reward
-- Slash When Reputation less than 200
function Slash(msg)
  local sender = msg.From
  local stakerIndex = tonumber(msg.Tags.StakerIndex)
  local staker = IndexedStakers[stakerIndex]

  assert(staker, "Staker does not exist")
  -- assert(Reputations[staker] and Reputations[staker] < 200 and Reputations[staker] > 0,
  --   "Reputation does not meet criteria")
  assert(Stakers[staker] and Stakers[staker].amount > 0, "Staker cannot be slashed")
  local amount = math.min(Stakers[staker].amount, 100)
  -- Reputations[staker] = 0
  Stakers[staker].amount = Stakers[staker].amount - amount
  Balances[sender] = (Balances[sender] or 0) + amount
end

Handlers.add('stakers', Handlers.utils.hasMatchingTag('Action', 'Stakers'),
  function(msg) ao.send({ Target = msg.From, Data = json.encode(Stakers) }) end)


Handlers.add('indexedStakers', Handlers.utils.hasMatchingTag('Action', 'IndexedStakers'),
  function(msg) ao.send({ Target = msg.From, Data = json.encode(IndexedStakers) }) end)
Handlers.add('stake', Handlers.utils.hasMatchingTag('Action', 'Stake'), Stake)
Handlers.add('unstake', Handlers.utils.hasMatchingTag('Action', 'Unstake'), Unstake)
Handlers.add('punish', Handlers.utils.hasMatchingTag('Action', 'Punish'), Punish)
Handlers.add('reward', Handlers.utils.hasMatchingTag('Action', 'Reward'), Reward)
Handlers.add('slash', Handlers.utils.hasMatchingTag('Action', 'Slash'), Slash)
