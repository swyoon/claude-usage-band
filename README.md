# usage-band

A Claude Code mod that draws a one-line band above the prompt with how full the
context window is, your remaining rate-limit usage and how long the prompt cache
stays warm:

```
ctx ▰▰▱▱▱▱▱▱  23% 230k/1M │ 5h ▰▰▰▰▰▱▱▱  60% ↻ 2h30m │ 7d ▰▰▰▰▰▰▱▱  70% ↻ 2h40m │ cache ▰▰▰▰▰▰▰▰ 59m
```

- **ctx**: how full the context window is, with tokens used / window size
  (magenta, yellow at 60% or more, red at 80% or more).
- **5h / 7d**: percent of each rate-limit window left (green, yellow at 30% or less,
  red at 10% or less) and the time until it resets. Shown on subscription plans
  once the first response arrives.
- **cache**: time left on the prompt cache, counted from the end of the last turn.
  The TTL is assumed to be 60 minutes; change `CACHE_TTL_MIN` in
  `hooks/register.tsx` to `5` for a 5-minute cache.
- On narrow terminals the bars shrink, the token counts drop, then the bars disappear, so the band stays on one line.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install usage-band --marketplace swyoon/claude-usage-band
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

From a shell:

```
claude plugin install usage-band --marketplace swyoon/claude-usage-band
```
