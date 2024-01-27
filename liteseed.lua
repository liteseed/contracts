local utils = require("utils")
Balances = Balances or {}
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
	utils.filter(function (v) return (v ~= sender) end, IndexedStakers)
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
	assert(Reputations[staker] and Reputations[staker] < 200 and Reputations[staker] > 0, "Reputation does not meet criteria")
	assert(Stakers[staker] and Stakers[staker].amount > 0, "Staker cannot be slashed")
	local amount = math.min(Stakers[staker].amount, 100)
	Reputations[staker] = 0
	Stakers[staker].amount = Stakers[staker].amount - amount
	Balances[sender] = (Balances[sender] or 0) + amount 
end
