local json = require('json')
local utils = require(".utils")


if Name ~= 'Liteseed' then Name = 'Liteseed' end

if Ticker ~= 'LS' then Ticker = 'LS' end

if Denomination ~= 10 then Denomination = 10 end

if not Logo then Logo = 'optional arweave TXID of logo image' end

Balances = Balances or { [ao.id] = 100000000 }
Stakers = Stakers or {}
Reputations = Reputations or {}

IndexedStakers = IndexedStakers or {}
TotalStakers = TotalStakers or 0

function Stake(msg)
  local sender = msg.From

  local quantity = tonumber(msg.Tags.Quantity)
  local currentBlockHeight = tonumber(msg['Block-Height'])

  assert(Balances[sender] and Balances[sender] >= quantity, "Insufficient Balance")

  Balances[sender] = Balances[sender] - quantity

  local staker = Stakers[sender]

  -- Index staker to randomly select --
  if staker == nil then
    staker = 0
    TotalStakers = TotalStakers + 1
    IndexedStakers[TotalStakers] = sender
  end

  Stakers[sender] = (Stakers[sender] or {})
  Stakers[sender].amount = (Stakers[sender].amount or 0) + quantity
  Stakers[sender].stakedAt = currentBlockHeight
  Reputations[sender] = Reputations[sender] or 1000
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
  utils.filter(function(v) return (v ~= sender) end, IndexedStakers)
  TotalStakers = TotalStakers - 1
end

function Punish(msg, env)
  assert(msg.From == env.Process.Id, "Caller not owner")

  local stakerIndex = tonumber(msg.Tags.StakerIndex)
  local staker = IndexedStakers[stakerIndex]

  assert(staker, "Staker does not exist")
  assert(Reputations[staker], "Reputation does not exist")
  Reputations[staker] = Reputations[staker] - 100
end

function Reward(msg, env)
  assert(msg.From == env.Process.Id, "Caller not owner")

  local stakerIndex = tonumber(msg.Tags.StakerIndex)
  local staker = IndexedStakers[stakerIndex]

  assert(staker, "Staker does not exist")
  assert(Reputations[staker], "Reputation does not exist")

  Reputations[staker] = Reputations[staker] + 100
end

-- How do we know if a bundler request has been resolved?
-- Who can slash? Anyone - Slasher gets the reward
-- Slash When Reputation less than 200
function Slash(msg)
  local sender = msg.From
  local stakerIndex = tonumber(msg.Tags.StakerIndex)
  local staker = IndexedStakers[stakerIndex]

  assert(staker, "Staker does not exist")
  assert(Reputations[staker] and Reputations[staker] < 200 and Reputations[staker] > 0,
    "Reputation does not meet criteria")
  assert(Stakers[staker] and Stakers[staker].amount > 0, "Staker cannot be slashed")
  local amount = math.min(Stakers[staker].amount, 100)
  Reputations[staker] = 0
  Stakers[staker].amount = Stakers[staker].amount - amount
  Balances[sender] = (Balances[sender] or 0) + amount
end

function Mint(msg, env)
  assert(msg.From == env.Process.Id, "Caller not owner")
  local quantity = tonumber(msg.Tags.Quantity)

  assert(quantity and quantity > 0, 'Quantity is required!')
  Balances[env.Process.Id] = Balances[env.Process.Id] + quantity
end

function Transfer(msg)
  local sender = msg.From
  local recipient = msg.Tags.Recipient
  local quantity = tonumber(msg.Tags.Quantity)

  assert(recipient, "Recipient is required")
  assert(quantity and Balances[sender] and Balances[sender] > quantity, "Insufficient Balance")

  Balances[sender] = Balances[sender] - quantity
  Balances[recipient] = (Balances[recipient] or 0) + quantity


  if not msg.Tags.Cast then
    -- Send Credit-Notice to the Recipient
    ao.send({
      Target = msg.From,
      Tags = { Action = 'Debit-Notice', Recipient = msg.Tags.Recipient, Quantity = tostring(qty) }
    })
    ao.send({
      Target = msg.Tags.Recipient,
      Tags = { Action = 'Credit-Notice', Sender = msg.From, Quantity = tostring(qty) }
    })
  else
    ao.send({
      Target = msg.Tags.From,
      Tags = { Action = 'Transfer-Error', ['Message-Id'] = msg.Id, Error = 'Insufficient Balance!' }
    })
  end
end

Handlers.add('info', Handlers.utils.hasMatchingTag('Action', 'Info'), function(msg)
  ao.send(
    { Target = msg.From, Tags = { Name = Name, Ticker = Ticker, Logo = Logo, Denomination = tostring(Denomination) } })
end)

--[[
     Balance
   ]]
--
Handlers.add('balance', Handlers.utils.hasMatchingTag('Action', 'Balance'), function(msg)
  local bal = '0'

  -- If not Target is provided, then return the Senders balance
  if (msg.Tags.Target and Balances[msg.Tags.Target]) then
    bal = tostring(Balances[msg.Tags.Target])
  elseif Balances[msg.From] then
    bal = tostring(Balances[msg.From])
  end

  ao.send({
    Target = msg.From,
    Tags = { Target = msg.From, Balance = bal, Ticker = Ticker, Data = json.encode(tonumber(bal)) }
  })
end)

Handlers.add('balances', Handlers.utils.hasMatchingTag('Action', 'Balances'),
  function(msg) ao.send({ Target = msg.From, Data = json.encode(Balances) }) end)

Handlers.add('mint', Handlers.utils.hasMatchingTag('Action', 'Mint'), Mint)
Handlers.add('transfer', Handlers.utils.hasMatchingTag('Action', 'Transfer'), Transfer)
Handlers.add('stake', Handlers.utils.hasMatchingTag('Action', 'Stake'), Stake)
Handlers.add('unstake', Handlers.utils.hasMatchingTag('Action', 'Unstake'), Unstake)
Handlers.add('punish', Handlers.utils.hasMatchingTag('Action', 'Punish'), Punish)
Handlers.add('reward', Handlers.utils.hasMatchingTag('Action', 'Reward'), Reward)
Handlers.add('slash', Handlers.utils.hasMatchingTag('Action', 'Slash'), Slash)
