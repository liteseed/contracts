-- This contract tracks uploads that are queued across the network --

local json = require("json")
local utils = require(".utils")

---@type {[string]:{checksum:string, transaction: string}}
Uploads = {} or Uploads

---Using the the transaction ID of the transfer and checksum of the data generate an upload ID
---@return string
function Generate(msg)
  ---@type string
  local transaction = msg.Tags.Id
  ---@type string
  local checksum = msg.Tags.Checksum

  assert(transaction and #transaction and Uploads[transaction] == nil, "Transaction ID is required")
  assert(checksum and #checksum > 0, "Checksum is required")

  ---@type string
  local id = GenerateId()

  Uploads[id] = { transaction = transaction, checksum = checksum }
  return id
end

function Queue(msg, env)
  assert(msg.From == env.Process.Id, "Caller not owner")
  local quantity = tonumber(msg.Tags.Quantity)

  assert(quantity and quantity > 0, 'Quantity is required!')
  Balances[env.Process.Id] = Balances[env.Process.Id] + quantity
end

function Verify(msg, env)
  assert(msg.From == env.Process.Id, "Caller not owner")
  local quantity = tonumber(msg.Tags.Quantity)

  assert(quantity and quantity > 0, 'Quantity is required!')
  Balances[env.Process.Id] = Balances[env.Process.Id] + quantity
end

Handlers.add('verify', Handlers.utils.hasMatchingTag('Action', 'Verify'),
  function(msg) ao.send({ Target = msg.From, Data = json.encode(Uploads) }) end)

Handlers.add('transactions', Handlers.utils.hasMatchingTag('Action', 'Transactions'),
  function(msg) ao.send({ Target = msg.From, Data = json.encode(Uploads) }) end)

Handlers.add('queue', Handlers.utils.hasMatchingTag('Action', 'Queue'),
  function(msg) ao.send({ Target = msg.From, Data = json.encode(Uploads) }) end)



---Generate an ID for upload. Is this a good idea? Probably not.
---@return string
function GenerateId()
  ---@type string
  local id = ""
  for _ = 1, 10, 1
  do
    local ch = string.char(math.random(65, 65 + 25))
    id = id + ch
  end
  return id
end

---Validate a transaction
---@param id string
---@return boolean
function ValidateTransaction(id)
  local found = utils.find(
    function(v)
     return id == Uploads[id].transaction
    end,
    Uploads
  )

  return !found
end

function CheckOracle(id)
  return true
end
  
