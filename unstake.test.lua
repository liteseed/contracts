require("liteseed")
local lu = require("luaunit")

local processId = "sl0sEQNHkzulrqpNO4H5Yj7yHpfkHwmp1H21LD4MSi6"
local userProcessId = "sl0sEQNHkzulrqpNO4H5Yj7yHpfkHwmp1H21LD4MSi4"

TestUnstake = {}
	function TestUnstake:setUp()
		Balances = {
			[processId] = 1000,
		}
		Stakers[userProcessId] = 100
		IndexedStakers[userProcessId] = userProcessId
	end

	function TestUnstake:testUnstake()
		local msg = {
			From = userProcessId,
			Tags = {
				Quantity = "100",
			},
			["Block-Height"] = "102"
		}
		Stakers[userProcessId] = { amount = 100, stakedAt = 1 }

		Unstake(msg)

		lu.assertEquals(Balances[userProcessId], 100)
		lu.assertItemsEquals(Stakers[userProcessId], { amount = 0, stakedAt = 1})
		lu.assertEquals(IndexedStakers[1], nil)
	end
	function TestUnstake:testUnstakeNotStaked()
		local msg = {
			From = userProcessId,
			Tags = {
				Quantity = "100",
			},
			["Block-Height"] = "102"
		}
		Stakers[userProcessId] = {}
		lu.assertErrorMsgContains("Not staked", Unstake, msg)
	end
	function TestUnstake:testUnstakeLargerThanStaked()
		local msg = {
			From = userProcessId,
			Tags = {
				Quantity = "101",
			},
			["Block-Height"] = "102"
		}
		Stakers[userProcessId] = { amount = 100, stakedAt = 1 }
		lu.assertErrorMsgContains("Requested amount greater than staked amount", Unstake, msg)
	end
	function TestUnstake:testUnstakeTimeDelayNotExpired()
		local msg = {
			From = userProcessId,
			Tags = {
				Quantity = "100",
			},
			["Block-Height"] = "10"
		}
		Stakers[userProcessId] = { amount = 100, stakedAt = 1 }
		lu.assertErrorMsgContains("Unstake time delay not expired", Unstake, msg)
	end

os.exit( lu.LuaUnit.run() )
