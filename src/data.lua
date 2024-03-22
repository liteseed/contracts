-- This contract tracks uploads that are queued across the network --

local json = require("json")
local utils = require(".utils")

---@type {[string]:{checksum:string, transaction: string, status: integer}}
Uploads = {} or Uploads

---Using the the transaction ID of the transfer and checksum of the data generate an upload ID
---@return string
function Initiate(msg)
  ---@type string
  local transaction = msg.Tags.Id
  ---@type string
  local checksum = msg.Tags.Checksum

  assert(transaction and #transaction and Uploads[transaction] == nil, "Transaction ID is required")
  assert(checksum and #checksum > 0, "Checksum is required")

  ---@type string
  local id = GenerateId()

  Uploads[id] = { transaction = transaction, checksum = checksum, status = 0 }
  return id
end

Handlers.add('initiate', Handlers.utils.hasMatchingTag('Action', 'Initiate'), Initiate)
Handlers.add('uploads', Handlers.utils.hasMatchingTag('Action', 'Uploads'),
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
  local past = utils.find(
    function(v)
      return id == Uploads[id].transaction
    end,
    Uploads
  )
  local recieved = utils.find(
    function(v)
      return v.Id == id
    end, 
    Inbox
  )
  return past == nil and recieved ~= nil
end
