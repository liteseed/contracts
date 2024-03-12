-- This contract tracks transactions that are queued

Transactions = {} or Transactions

_ORBIT = "WSXUI2JjYUldJ7CKq9wE1MGwXs-ldzlUlHOQszwQe0s"

function GenerateID()
  return 0
end

function Generate(msg)
  local bytes = tonumber(msg.Tags.Bytes)
  local checksum = msg.Tags.Checksum

  assert(bytes and bytes > 0, "Size has to be greater than zero")
  assert(checksum and #checksum > 0, "Checksum is required to verify upload")

  local id = GenerateID()
  Transactions[id] = {bytes = bytes, checksum = checksum}
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
function(msg) ao.send({ Target = msg.From, Data = json.encode(Transactions) }) end)

Handlers.add('transactions', Handlers.utils.hasMatchingTag('Action', 'Transactions'),
  function(msg) ao.send({ Target = msg.From, Data = json.encode(Transactions) }) end)
  
Handlers.add('queue', Handlers.utils.hasMatchingTag('Action', 'Queue'),
  function(msg) ao.send({ Target = msg.From, Data = json.encode(Transactions) }) end)
