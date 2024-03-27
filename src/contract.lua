local bint = require('.bint')(256)
local ao = require('ao')
local utils = require(".utils")

---@type {[string]: string}
Balances = { [ao.id] = tostring(bint(1e18)) }

---@type string
Name = "Bundler"

---@type string
Ticker = "BUN"

---@type integer
Denomination = 18

---@type string
Logo = 'SBCCXwwecBlDqRLUjb8dYABExTJXLieawf7m2aBJ-KY'

---@type {[string]:{checksum:string, status: integer, quantity: string, index: integer, block: integer}}
Uploads = Uploads or {}

---@type {id: string, url: string, reputation: integer}[]
Stakers = Stakers or {}

---@type string[]
Slashed = Slashed or {}

---@param sender string
---@param recipient string
---@param quantity Bint
---@param cast unknown
function Transfer(sender, recipient, quantity, cast)
  local balance = bint(Balances[sender])
  if bint.__le(quantity, balance) then
    Balances[sender] = tostring(bint.__sub(balance, quantity))
    Balances[recipient] = tostring(bint.__add(Balances[recipient], quantity))

    if not cast then
      ao.send({
        Target = sender,
        Action = 'Debit-Notice',
        Recipient = recipient,
        Quantity = tostring(quantity),
        Data = Colors.gray ..
            "You transferred " ..
            Colors.blue .. tostring(quantity) .. Colors.gray .. " to " .. Colors.green .. recipient .. Colors.reset
      })
      -- Send Credit-Notice to the Recipient
      ao.send({
        Target = recipient,
        Action = 'Credit-Notice',
        Sender = sender,
        Quantity = tostring(quantity),
        Data = Colors.gray ..
            "You received " ..
            Colors.blue .. tostring(quantity) .. Colors.gray .. " from " .. Colors.green .. sender .. Colors.reset
      })
    end
  else
    ao.send({
      Target = sender,
      Action = 'Transfer-Error',
      Error = 'Insufficient Balance!'
    })
  end
end

---Verify an upload
---@param id string
function Verify(id)
  assert(id and #id > 0, "Invalid data item id")
  assert(Uploads[id].status == 3, "Upload incomplete")
  return true
end

---Update Reputation of Staker
---@param index integer
---@param amount integer
function UpdateReputation(index, amount)
  Stakers[index].reputation = Stakers[index].reputation + amount
end

--- Network
Handlers.add(
  'initiate',
  Handlers.utils.hasMatchingTag('Action', 'Initiate'),
  function(message, _)
    ---@type string
    local id = message.Transaction
    assert(id and #id > 0, "Invalid data item id")

    ---@type string
    local checksum = message.Checksum
    assert(checksum and #checksum > 0, "Invalid checksum")

    ---@type Bint
    local quantity = bint(message.Quantity)
    assert(quantity and quantity > 0, "Invalid quantity")

    Transfer(message.From, ao.id, quantity, nil)

    Uploads[id] = {
      checksum = checksum,
      status = 0,
      quantity = tostring(quantity),
      bundler = math.random(#Stakers),
      block = message['Block-Height']
    }
  end
)

--- Vault
Handlers.add(
  'stake',
  Handlers.utils.hasMatchingTag('Action', 'Stake'),
  function(message, _)
    local exist = utils.includes(message.From, Stakers)
    assert(~exist, "already staked")

    local url = message.URL;

    Transfer(message.From, ao.id, bint("1000"), false)
    table.insert(Stakers, {id = message.From, url = url, reputation = 1000})
  end
)

Handlers.add(
  'unstake',
  Handlers.utils.hasMatchingTag('Action', 'Unstake'),
  function(message, _)
    local pos = -1
    for i = 1, #Stakers do
      if Stakers[i].id == message.From then
        pos = i
      end
    end
    assert(pos ~= -1, "not staked")

    Transfer(ao.id, message.From, bint("1000"), false)
    table.remove(Stakers, pos)
  end
)


---Bundler can release its reward
Handlers.add(
  'notify',
  Handlers.utils.hasMatchingTag('Action', 'Notify'),
  function(message, _)
    ---@type string
    local id = message.Transaction
    assert(id and #id > 0, "Invalid data item id")

    local bundler = Stakers[Uploads[id].index]
    assert(bundler == message.From, "Not owner")

    assert(Uploads[id].status ~= 3, "Upload already complete")

    local status = tonumber(message.Status)
    assert(status and utils.includes(status, { -1, 2, 3 }), "Invalid status")

    Uploads[id].status = status
  end
)

---Bundler can release its reward
Handlers.add(
  'release',
  Handlers.utils.hasMatchingTag('Action', 'Release'),
  function(message, _)
    ---@type string
    local id = message.Transaction
    assert(id and #id > 0, "Invalid data item id")

    local bundler = Stakers[Uploads[id].index]
    assert(bundler == message.From, "Not owner")

    assert(Uploads[id].status == 3, "Upload incomplete")

    Verify(id)
    UpdateReputation(Uploads[id].index, 100)

    local quantity = bint(Uploads[id].quantity)
    Transfer(ao.id, message.From, quantity, nil)
  end
)
