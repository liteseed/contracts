local utils = {}

function utils.filter(fn, data)
	local r, i = {}, 1
	for _, v in pairs(data) do
		if fn(v) then
			r[i] = v
			i = i + 1
		end
	end
	return r
end
return utils
