local lu = require("luaunit")
require("liteseed")

local processId = "sl0sEQNHkzulrqpNO4H5Yj7yHpfkHwmp1H21LD4MSi6"
local userProcessId = "sl0sEQNHkzulrqpNO4H5Yj7yHpfkHwmp1H21LD4MSi4"

TestPunish = {}
	function TestPunish:setUp()
		Stakers[userProcessId] = { amount = 0, stakedAt = 1 }
		IndexedStakers[1] = userProcessId
		Reputations[userProcessId] = 1000
	end
	function TestPunish:testPass()
		local msg = {
			From = processId,
			Tags = {
				StakerIndex = "1",
			},
			["Block-Height"] = "102"
		}
		local env = { Process = { Id = processId } }

		Punish(msg, env)
		lu.assertEquals(Reputations[userProcessId], 900)
	end
	function TestPunish:testCallerNotOwner()
		local msg = {
			From = processId,
			Tags = {
				StakerIndex = "1",
			},
			["Block-Height"] = "102"
		}
		local env = { Process = { Id = userProcessId } }
		lu.assertErrorMsgContains("Caller not owner", Punish, msg, env)
	end
	function TestPunish:testStakerDoesNotExist()
		local msg = {
			From = processId,
			Tags = {
				StakerIndex = "2",
			},
			["Block-Height"] = "102"
		}
		local env = { Process = { Id = processId } }
		lu.assertErrorMsgContains("Staker does not exist", Punish, msg, env)
	end
	function TestPunish:testReputationDoesNotExist()
		local msg = {
			From = processId,
			Tags = {
				StakerIndex = "1",
			},
			["Block-Height"] = "102"
		}
		local env = { Process = { Id = processId } }
		Reputations[userProcessId] = nil
		lu.assertErrorMsgContains("Reputation does not exist", Punish, msg, env)
	end
os.exit( lu.LuaUnit.run() )
