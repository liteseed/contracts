local lu = require("luaunit")
require("liteseed")

local processId = "sl0sEQNHkzulrqpNO4H5Yj7yHpfkHwmp1H21LD4MSi6"
local userProcessId = "sl0sEQNHkzulrqpNO4H5Yj7yHpfkHwmp1H21LD4MSi4"

TestReward = {}
	function TestReward:setUp()
		Stakers[userProcessId] = { amount = 0, stakedAt = 1 }
		IndexedStakers[1] = userProcessId
		Reputations[userProcessId] = 1000
	end
	function TestReward:testPass()
		local msg = {
			From = processId,
			Tags = {
				StakerIndex = "1",
			},
			["Block-Height"] = "102"
		}
		local env = { Process = { Id = processId } }

		Reward(msg, env)
		lu.assertEquals(Reputations[userProcessId], 1100)
	end
	function TestReward:testCallerNotOwner()
		local msg = {
			From = processId,
			Tags = {
				StakerIndex = "1",
			},
			["Block-Height"] = "102"
		}
		local env = { Process = { Id = userProcessId } }
		lu.assertErrorMsgContains("Caller not owner", Reward, msg, env)
	end
	function TestReward:testStakerDoesNotExist()
		local msg = {
			From = processId,
			Tags = {
				StakerIndex = "2",
			},
			["Block-Height"] = "102"
		}
		local env = { Process = { Id = processId } }
		lu.assertErrorMsgContains("Staker does not exist", Reward, msg, env)
	end
	function TestReward:testReputationDoesNotExist()
		local msg = {
			From = processId,
			Tags = {
				StakerIndex = "1",
			},
			["Block-Height"] = "102"
		}
		local env = { Process = { Id = processId } }
		Reputations[userProcessId] = nil
		lu.assertErrorMsgContains("Reputation does not exist", Reward, msg, env)
	end
os.exit( lu.LuaUnit.run() )
