local bint = require('.bint')(256)
local ao = require('ao')
local utils = require(".utils")
local json = require("json")

---@type {[string]: string}
Balances = Balances or { [ao.id] = tostring(bint(1e18)) }

---@type string
Name = Name or "Bundler"

---@type string
Ticker = Ticker or "BUN"

---@type integer
Denomination = Denomination or 18

---@type string
Logo = 'SBCCXwwecBlDqRLUjb8dYABExTJXLieawf7m2aBJ-KY'

---@type {[string]:{checksum:string, status: integer, quantity: string, bundler: integer, block: integer}}
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

---Verify an upload
---@param id string
function Verify(id)
  assert(id and #id > 0, "Invalid data item id")
  assert(Uploads[id].status == 3, "Upload incomplete")
  --TODO: Actually check Arweave upload
  return true
end

--- Network
Handlers.add(
  'initiate',
  Handlers.utils.hasMatchingTag('Action', 'Initiate'),
  function(message, _)
    ---@type string
    local id = message.Tags.DataItemId
    assert(id and #id > 0, "Invalid DataItemId")

    ---@type string
    local checksum = message.Tags.Checksum
    assert(checksum and #checksum > 0, "Invalid Checksum")

    ---@type Bint
    local quantity = bint(message.Tags.Quantity)
    assert(quantity and quantity > 0, "Invalid Quantity")

    assert(Balances[message.From] and bint(Balances[message.From]) >= quantity, "Insufficient Balance")
    Transfer(message.From, ao.id, quantity, false)

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
    assert(not exist, "Already staked")

    assert(bint(Balances[message.From]) >= bint("1000"), "Insufficient Balance")

    local url = message.Tags.URL;
    assert(url and #url > 0, "Invalid URL")

    Transfer(message.From, ao.id, bint("1000"), false)
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

    Transfer(ao.id, message.From, bint("1000"), false)
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


---Bundler can release its reward
Handlers.add(
  'notify',
  Handlers.utils.hasMatchingTag('Action', 'Notify'),
  function(message, _)
    local id = message.Tags.DataItemId
    assert(id and #id > 0, "Invalid DataItemId")

    assert(Stakers[Uploads[id].bundler].id == message.From, "Not Owner")

    local status = tonumber(message.Tags.Status, 10)
    assert(utils.includes(status, { -1, 0, 1, 2, 3 }), "Invalid Status")

    assert(Uploads[id].status ~= 3, "Upload Already Complete")

    if (Uploads[id].status == 3) then
      verify = Verify(id)
      assert(verify, "verification failed")
    end

    Uploads[id].status = status
  end
)

---Bundler can release its reward
Handlers.add(
  'release',
  Handlers.utils.hasMatchingTag('Action', 'Release'),
  function(message, _)
    local id = message.Tags.DataItemId
    assert(id and #id > 0, "Invalid DataItemId")

    local index = Uploads[id].bundler
    assert(Stakers[index].id == message.From, "Not Owner")

    assert(Uploads[id].status == 3, "Upload incomplete")

    Transfer(ao.id, message.From, bint(Uploads[id].quantity), false)
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
    ao.send({ Target = message.From, Data = json.encode(Uploads[message.Tags.DataItemId]) })
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
