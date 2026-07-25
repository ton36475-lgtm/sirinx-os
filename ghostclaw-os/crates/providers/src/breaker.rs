//! Circuit breaker for opaque pools (P098 Rev D, M3.3).
//!
//! A gateway pool can close, empty, or fail at any time without notice. Three
//! consecutive failures or timeouts mark the pool DOWN for ten minutes; any
//! success resets the counter.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Consecutive failures that trip the breaker.
pub const TRIP_THRESHOLD: u32 = 3;

/// How long a tripped pool stays DOWN.
pub const DOWN_FOR: Duration = Duration::from_secs(10 * 60);

#[derive(Clone, Debug, Default, PartialEq, Eq)]
struct PoolState {
    consecutive_failures: u32,
    down_until: Option<Instant>,
}

/// Per-pool breaker state. Cheap to share behind an `Arc`.
#[derive(Debug, Default)]
pub struct CircuitBreaker {
    pools: Mutex<HashMap<String, PoolState>>,
}

/// A pool's breaker status at a point in time.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BreakerStatus {
    /// Requests may proceed.
    Closed { consecutive_failures: u32 },
    /// Pool is tripped; `remaining` is time left on the cooldown.
    Down { remaining: Duration },
}

impl CircuitBreaker {
    pub fn new() -> Self {
        Self::default()
    }

    /// Whether a request to `pool` may proceed right now.
    pub fn allows(&self, pool: &str) -> bool {
        matches!(self.status_at(pool, Instant::now()), BreakerStatus::Closed { .. })
    }

    /// Current status of `pool`.
    pub fn status(&self, pool: &str) -> BreakerStatus {
        self.status_at(pool, Instant::now())
    }

    fn status_at(&self, pool: &str, now: Instant) -> BreakerStatus {
        let mut pools = self.pools.lock().expect("breaker mutex poisoned");
        let state = pools.entry(pool.to_string()).or_default();

        if let Some(until) = state.down_until {
            if now < until {
                return BreakerStatus::Down { remaining: until - now };
            }
            // Cooldown elapsed — close the breaker and start clean.
            state.down_until = None;
            state.consecutive_failures = 0;
        }

        BreakerStatus::Closed { consecutive_failures: state.consecutive_failures }
    }

    /// Record a successful call. Resets the failure run.
    pub fn record_success(&self, pool: &str) {
        let mut pools = self.pools.lock().expect("breaker mutex poisoned");
        let state = pools.entry(pool.to_string()).or_default();
        state.consecutive_failures = 0;
        state.down_until = None;
    }

    /// Record a failure or timeout. Trips the breaker on the third in a row.
    pub fn record_failure(&self, pool: &str) {
        self.record_failure_at(pool, Instant::now());
    }

    fn record_failure_at(&self, pool: &str, now: Instant) {
        let mut pools = self.pools.lock().expect("breaker mutex poisoned");
        let state = pools.entry(pool.to_string()).or_default();
        state.consecutive_failures = state.consecutive_failures.saturating_add(1);
        if state.consecutive_failures >= TRIP_THRESHOLD {
            state.down_until = Some(now + DOWN_FOR);
            tracing::warn!(
                pool,
                failures = state.consecutive_failures,
                "pool tripped breaker, DOWN for 10 minutes"
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn closed_by_default() {
        let b = CircuitBreaker::new();
        assert!(b.allows("pool-a"));
        assert_eq!(b.status("pool-a"), BreakerStatus::Closed { consecutive_failures: 0 });
    }

    #[test]
    fn two_failures_do_not_trip() {
        let b = CircuitBreaker::new();
        b.record_failure("pool-a");
        b.record_failure("pool-a");
        assert!(b.allows("pool-a"), "breaker must stay closed below the threshold");
        assert_eq!(b.status("pool-a"), BreakerStatus::Closed { consecutive_failures: 2 });
    }

    #[test]
    fn three_consecutive_failures_trip_the_breaker() {
        let b = CircuitBreaker::new();
        for _ in 0..TRIP_THRESHOLD {
            b.record_failure("pool-a");
        }
        assert!(!b.allows("pool-a"), "third consecutive failure must trip the breaker");
        match b.status("pool-a") {
            BreakerStatus::Down { remaining } => {
                assert!(remaining <= DOWN_FOR);
                assert!(remaining > DOWN_FOR - Duration::from_secs(5));
            }
            other => panic!("expected Down, got {other:?}"),
        }
    }

    #[test]
    fn success_resets_the_failure_run() {
        let b = CircuitBreaker::new();
        b.record_failure("pool-a");
        b.record_failure("pool-a");
        b.record_success("pool-a");
        b.record_failure("pool-a");
        assert!(b.allows("pool-a"), "a success must clear the consecutive-failure run");
        assert_eq!(b.status("pool-a"), BreakerStatus::Closed { consecutive_failures: 1 });
    }

    #[test]
    fn breaker_is_per_pool() {
        let b = CircuitBreaker::new();
        for _ in 0..TRIP_THRESHOLD {
            b.record_failure("pool-a");
        }
        assert!(!b.allows("pool-a"));
        assert!(b.allows("pool-b"), "tripping one pool must not affect another");
    }

    #[test]
    fn breaker_closes_after_cooldown_elapses() {
        let b = CircuitBreaker::new();
        let now = Instant::now();
        for _ in 0..TRIP_THRESHOLD {
            b.record_failure_at("pool-a", now);
        }
        assert!(matches!(b.status_at("pool-a", now), BreakerStatus::Down { .. }));

        let after = now + DOWN_FOR + Duration::from_secs(1);
        assert_eq!(
            b.status_at("pool-a", after),
            BreakerStatus::Closed { consecutive_failures: 0 },
            "cooldown must expire and reset the run"
        );
    }
}
