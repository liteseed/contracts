require("liteseed")
local lu = require("luaunit")

local processId = "sl0sEQNHkzulrqpNO4H5Yj7yHpfkHwmp1H21LD4MSi6"
local userProcessId = "sl0sEQNHkzulrqpNO4H5Yj7yHpfkHwmp1H21LD4MSi4"

TestStake = {}
	function TestStake:setUp()
		Balances = {
			[processId] = 1000,
			[userProcessId] = 100,
		}
	end
	function TestStake:testStake()
		local msg = {
			From = userProcessId,
			Tags = {
				Quantity = "100",
			},
			["Block-Height"] = "1"

		}
		Stake(msg)
		lu.assertEquals(0, Balances[userProcessId])
		lu.assertEquals(Stakers[userProcessId], { amount = 100, stakedAt = 1})
		lu.assertEquals(userProcessId, IndexedStakers[1])
		lu.assertEquals(1, TotalStakers)
		lu.assertEquals(1000, Reputations[userProcessId])
	end
	function TestStake:testStakeInsufficientBalance()
		local msg = {
			From = userProcessId,
			Tags = {
				Quantity = "1000",
			},
			["Block-Height"] = "1"

		}
		lu.assertErrorMsgContains("Insufficient Balance", Stake, msg)
	end

os.exit( lu.LuaUnit.run() )
