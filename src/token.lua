local json = require('json')

if Name ~= 'Bundler' then Name = 'Bundler' end
if Ticker ~= 'BUN' then Ticker = 'BUN' end
if Denomination ~= 10 then Denomination = 10 end
if not Logo then Logo = 'optional arweave TXID of logo image' end

Balances = Balances or { [ao.id] = 100000000 }

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
  assert(quantity and quantity > 0 and Balances[sender] and Balances[sender] > quantity, "Insufficient Balance")

  Balances[sender] = Balances[sender] - quantity
  Balances[recipient] = (Balances[recipient] or 0) + quantity

  if not msg.Tags.Cast then
    -- Send Credit-Notice to the Recipient
    ao.send({
      Target = msg.From,
      Tags = { Action = 'Debit-Notice', Recipient = msg.Tags.Recipient, Quantity = tostring(quantity) }
    })
    ao.send({
      Target = msg.Tags.Recipient,
      Tags = { Action = 'Credit-Notice', Sender = msg.From, Quantity = tostring(quantity) }
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
