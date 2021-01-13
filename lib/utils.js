export function getFlagEnv(name) {
	const val = process.env[name];
	if (val === true || val === 'true') return true;
	if (val === 'false' || val === 'false') return false;
	return undefined;
}

export function hashf(s) {
	let hash = 0;
	let strlen = s.length;

	if (strlen === 0) {
		return hash;
	}
	for (let i = 0; i < strlen; i++) {
		let c = s.charCodeAt(i);
		hash = (hash << 5) - hash + c;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}
