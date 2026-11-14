package visual

type RNG struct {
	state uint64
}

func newRNG(seed uint64) *RNG {
	return &RNG{state: seed}
}

func (r *RNG) next() uint64 {
	r.state += 0x9E3779B97F4A7C15

	z := r.state
	z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9
	z = (z ^ (z >> 27)) * 0x94D049BB133111EB

	return z ^ (z >> 31)
}

func (r *RNG) Float() float64 {
	return float64(r.next()>>11) / float64(uint64(1)<<53)
}

func (r *RNG) RangeF(min, max float64) float64 {
	return min + r.Float()*(max-min)
}

func (r *RNG) RangeI(min, max int) int {
	return min + int(r.next()%uint64(max-min+1))
}
