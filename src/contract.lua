local ao = require('ao')
local json = require("json")

local bint = require('.bint')(256)
local utils = require(".utils")

---@type {[string]: string}
Balances = Balances or { [ao.id] = tostring(bint("100000000000000000000")) }

---@type string
Name = Name or "Liteseed"

---@type string
Ticker = Ticker or "LSD"

---@type integer
Denomination = Denomination or 12

---@type string
Logo = "SBCCXwwecBlDqRLUjb8dYABExTJXLieawf7m2aBJ-KY"

---@type {[string]:{status: string, size: string, bundler: string, bundle: string, payment: string}}
Uploads = Uploads or {}

---@type {id: string, url: string, reputation: string}[]
Stakers = Stakers or {}


---@param sender string
---@param recipient string
---@param quantity Bint
---@param cast unknown
function Transfer(sender, recipient, quantity, cast)
  Balances[sender] = Balances[sender] or tostring(0)
  Balances[recipient] = Balances[recipient] or tostring(0)

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

---UpdateReputation
---@param id string
---@param change integer
function UpdateReputation(id, change)
  local pos = -1
  for i = 1, #Stakers do
    if Stakers[i].id == id then
      pos = i
    end
  end
  assert(pos ~= -1, "Not Staked")
  Stakers[pos].reputation = Stakers[pos].reputation + change
end

--- Network
Handlers.add(
  'initiate',
  Handlers.utils.hasMatchingTag('Action', 'Initiate'),
  function(message, _)
    ---@type string
    local dataItem = message.Data
    assert(dataItem and #dataItem > 0, "Invalid DataItem ID")
    assert(Uploads[dataItem] == nil, "Already Queued")

    ---@type Bint
    local size = bint(message.Tags.Size)
    assert(size > 0, "Invalid Size")

    local stakerIndex = math.random(#Stakers)
    Uploads[dataItem] = {
      status = "0",
      size = tostring(size),
      block = tostring(message['Block-Height']),
      paid = "",
      bundler = Stakers[stakerIndex].id
    }

    ao.send({ Target = message.From, Data = json.encode(Stakers[stakerIndex]) })
  end
)

Handlers.add(
  'posted',
  Handlers.utils.hasMatchingTag('Action', 'Posted'),
  function(message, _)
    ---@type string
    local dataItem = message.Data
    assert(dataItem and #dataItem > 0, "Invalid DataItem ID")
    assert(Uploads[dataItem] ~= nil, "Upload does not exist")

    assert(Uploads[dataItem].bundler == message.From, "Not assigned to bundler")
    assert(Uploads[dataItem].status == "0", "Invalid Action")

    local transaction = message.Tags.Transaction
    assert(transaction and #transaction > 0, "Invalid Transaction ID")

    Uploads[dataItem].bundle = transaction
    Uploads[dataItem].status = "1"
    ao.assign({ Processes = { ao.id }, Message = transaction, Exclude = { "Data", "Signature", "content-type", "Tags", "TagsArray" } })
  end
)

Handlers.add(
  'release',
  Handlers.utils.hasMatchingTag('Action', 'Release'),
  function(message, _)
    ---@type string
    local dataItem = message.Data
    assert(dataItem and #dataItem > 0, "Invalid DataItem ID")

    local bundler = message.From
    assert(Uploads[dataItem].bundler == bundler, "Not assigned to bundler")
    assert(Uploads[dataItem].status == "1", "Invalid action")

    local exist = utils.includes(function(val) return val.Id == dataItem and val.From == bundler end, Inbox)
    assert(exist, "Unable to verify transaction")
    Uploads[dataItem].status = "2"

    ---@type Bint
    local reward = bint(Uploads[dataItem].size).__tdiv(bint(1024 * 1024 * 100))
    Transfer(ao.id, bundler, reward, "")
    UpdateReputation(bundler, 1)
  end
)


--- Vault
Handlers.add(
  'stake',
  Handlers.utils.hasMatchingTag('Action', 'Stake'),
  function(message, _)
    local exist = utils.includes(message.From, Stakers)
    assert(not exist, "Already staked")

    assert(bint(Balances[message.From]) >= bint("100000000000000000"), "Insufficient Balance")

    local url = message.Tags.Url;
    assert(url and #url > 0, "Invalid URL")

    Transfer(message.From, ao.id, bint("100000000000000000"), false)
    table.insert(Stakers, { id = message.From, url = url, reputation = 1000 })
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
    assert(pos ~= -1, "Not Staked")

    Transfer(ao.id, message.From, bint("100000000000000000"), false)
    table.remove(Stakers, pos)
  end
)

Handlers.add(
  'transfer',
  Handlers.utils.hasMatchingTag('Action', 'Transfer'),
  function(message, _)
    assert(type(message.Tags.Recipient) == 'string', 'Recipient is required!')
    assert(type(message.Tags.Quantity) == 'string', 'Quantity is required!')

    local quantity = bint(message.Tags.Quantity)
    assert(quantity > bint(0), 'Quantity is required!')

    Transfer(message.From, message.Tags.Recipient, quantity, message.Tags.Cast)
  end
)


Handlers.add(
  'uploads',
  Handlers.utils.hasMatchingTag('Action', 'Uploads'),
  function(message, _) ao.send({ Target = message.From, Data = json.encode(Uploads) }) end
)

Handlers.add(
  'upload',
  Handlers.utils.hasMatchingTag('Action', 'Upload'),
  function(message, _)
    ao.send({ Target = message.From, Data = json.encode(Uploads[message.Data]) })
  end
)

Handlers.add('info', Handlers.utils.hasMatchingTag('Action', 'Info'), function(msg)
  ao.send({
    Target = msg.From,
    Data = json.encode({
      Name = Name,
      Ticker = Ticker,
      Logo = Logo,
      Denomination = tostring(Denomination)
    })
  })
end)


Handlers.add(
  'balance',
  Handlers.utils.hasMatchingTag('Action', 'Balance'),
  function(message, _)
    local balanceOf = ""
    if message.Tags.Address == nil then
      balanceOf = message.From
    else
      balanceOf = message.Tags.Address
    end
    ao.send({ Target = message.From, Data = Balances[balanceOf] })
  end
)

Handlers.add(
  'balances',
  Handlers.utils.hasMatchingTag('Action', 'Balances'),
  function(message, _) ao.send({ Target = message.From, Data = json.encode(Balances) }) end
)

Handlers.add(
  'stakers',
  Handlers.utils.hasMatchingTag('Action', 'Stakers'),
  function(message, _)
    ao.send({ Target = message.From, Data = json.encode(Stakers) })
  end
)

Handlers.add(
  'staked',
  Handlers.utils.hasMatchingTag('Action', 'Staked'),
  function(message, _)
    local staker = ""
    if message.Tags.Address == nil then
      staker = message.From
    else
      staker = message.Tags.Address
    end
    local found = utils.find(
      function(val)
        return val.id == staker
      end,
      Stakers
    )

    if found then Data = "Yes" else Data = "No" end
    ao.send({ Target = message.From, Data = Data })
  end
)
