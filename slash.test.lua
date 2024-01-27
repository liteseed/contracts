local lu = require("luaunit")
require("liteseed")

local processId = "sl0sEQNHkzulrqpNO4H5Yj7yHpfkHwmp1H21LD4MSi6"
local userProcessId0 = "sl0sEQNHkzulrqpNO4H5Yj7yHpfkHwmp1H21LD4MSi4"
local userProcessId1 = "sl0sEQNHkzulrqpNO4H5Yj7yHpfkHwmp1H21LD4MSi3"
TestSlash = {}
	function TestSlash:setUp()
		Stakers[userProcessId0] = { amount = 100, stakedAt = 1 }
		IndexedStakers[1] = userProcessId0
		Reputations[userProcessId0] = 100
	end
	
	function TestSlash:testPass()
		local msg = {
			From = userProcessId1,
			Tags = { StakerIndex = "1" }
		}
		Slash(msg)
		lu.assertEquals(Stakers[userProcessId0], { amount = 0, stakedAt = 1 })
		lu.assertEquals(Reputations[userProcessId0], 0)
		lu.assertEquals(Balances[userProcessId1], 100)
	end
	
	function TestSlash:testStakerDoesNotExist()
		local msg = {
			From = userProcessId1,
			Tags = { StakerIndex = "2" }
		}
		lu.assertErrorMsgContains("Staker does not exist", Slash, msg)
	end
	
	function TestSlash:testReputationDoesNotMeetCriteria()
		local msg = {
			From = userProcessId1,
			Tags = { StakerIndex = "1" }
		}
		Reputations[userProcessId0] = 200
		lu.assertErrorMsgContains("Reputation does not meet criteria", Slash, msg)
	end

	function TestSlash:testReputationDoesNotExist()
		local msg = {
			From = userProcessId1,
			Tags = {
				StakerIndex = "1",
			},
			["Block-Height"] = "102"
		}
		Reputations[userProcessId0] = nil
		lu.assertErrorMsgContains("Reputation does not meet criteria", Slash, msg)
	end


os.exit( lu.LuaUnit.run() )
