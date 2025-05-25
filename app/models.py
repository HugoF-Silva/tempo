from datetime import datetime, timedelta
import numpy as np
from config import (
    ROLLING_WINDOW_MINUTES, FINE_GRAINED_MIN_SAMPLES, SLOT_MIN_SAMPLES, 
    MULTI_DAY_LOOKBACK_DAYS, MULTI_DAY_DECAY, DEFAULT_WAIT_BY_COLOR,
    IQR_OUTLIER_FACTOR, HIGH_CONFIDENCE_SAMPLES, MEDIUM_CONFIDENCE_SAMPLES, 
    TIME_SLOTS, SLOT_BOUNDARY_SMOOTHING_WINDOW_MIN
)
from utils import (
    rolling_window_bounds, compute_iqr, apply_iqr_filter, assign_time_slot,
    get_adjacent_slots, slot_boundaries
)
from data_store import DataStore

class WaitTimeEstimator:
    def __init__(self, datastore: DataStore):
        self.datastore = datastore

    def estimate_wait_time(self, unit: str, risk_color: str, query_time: datetime):
        # TIER 1: Fine-grained rolling window
        lower, upper = rolling_window_bounds(query_time, ROLLING_WINDOW_MINUTES)
        # samples = self.datastore.get_samples(unit, risk_color, lower, upper)
        samples = self.datastore.fetch_events(unit, risk_color, lower, upper)
        values = apply_iqr_filter(samples.values, IQR_OUTLIER_FACTOR)
        if len(values) >= FINE_GRAINED_MIN_SAMPLES:
            wait = float(np.median(values))
            iqr = compute_iqr(values)
            confidence, fallback_tier = self.confidence_label(len(values)), "rolling"
            return wait, confidence, len(values), fallback_tier, iqr, None

        # TIER 2: Slot-based, now with boundary smoothing
        slot = assign_time_slot(query_time, TIME_SLOTS)
        slot_start, slot_end = slot_boundaries(TIME_SLOTS, slot)
        slot_start_dt = query_time.replace(hour=slot_start.hour, minute=slot_start.minute, second=0, microsecond=0)
        slot_end_dt = query_time.replace(hour=slot_end.hour, minute=slot_end.minute, second=0, microsecond=0)
        # Correct for end < start (overnight slots)
        if slot_end < slot_start:
            slot_end_dt += timedelta(days=1)

        # Determine proximity to slot boundaries
        delta_to_start = (query_time - slot_start_dt).total_seconds() / 60.0  # Minutes from slot start
        delta_to_end = (slot_end_dt - query_time).total_seconds() / 60.0      # Minutes to slot end

        # If within smoothing window to start, blend with previous slot
        if 0 <= delta_to_start < SLOT_BOUNDARY_SMOOTHING_WINDOW_MIN:
            prev_slot, _ = get_adjacent_slots(TIME_SLOTS, slot)
            if prev_slot:
                # prev_samples = self.datastore.get_slot_samples(unit, risk_color, prev_slot, query_time.date())
                prev_samples = self.datastore.fetch_slot_events(unit, risk_color, prev_slot, query_time.date().isoformat())
                prev_values = apply_iqr_filter(prev_samples.values, IQR_OUTLIER_FACTOR)
                # samples = self.datastore.get_slot_samples(unit, risk_color, slot, query_time.date())
                cur_samples = self.datastore.fetch_slot_events(unit, risk_color, slot, query_time.date().isoformat())
                cur_values = apply_iqr_filter(cur_samples.values, IQR_OUTLIER_FACTOR)
                # Only blend if both slots have enough samples
                if len(prev_values) >= SLOT_MIN_SAMPLES and len(cur_values) >= SLOT_MIN_SAMPLES:
                    w = delta_to_start / SLOT_BOUNDARY_SMOOTHING_WINDOW_MIN
                    median = (1-w) * np.median(cur_values) + w * np.median(prev_values)
                    iqr = (1-w) * compute_iqr(cur_values) + w * compute_iqr(prev_values)
                    sample_size = int((1-w)*len(cur_values) + w*len(prev_values))
                    confidence = self.confidence_label(sample_size)
                    return median, confidence, sample_size, "slot-boundary", iqr, "Slot boundary smoothing (start)"
                # If not, fall back to using only this slot

        # If within smoothing window to end, blend with next slot
        if 0 <= delta_to_end < SLOT_BOUNDARY_SMOOTHING_WINDOW_MIN:
            _, next_slot = get_adjacent_slots(TIME_SLOTS, slot)
            if next_slot:
                # next_samples = self.datastore.get_slot_samples(unit, risk_color, next_slot, query_time.date())
                next_samples = self.datastore.fetch_slot_events(unit, risk_color, slot, query_time.date().isoformat())
                next_values = apply_iqr_filter(next_samples.values, IQR_OUTLIER_FACTOR)
                # samples = self.datastore.get_slot_samples(unit, risk_color, slot, query_time.date())
                cur_samples = self.datastore.fetch_slot_events(unit, risk_color, slot, query_time.date().isoformat())
                cur_values = apply_iqr_filter(cur_samples.values, IQR_OUTLIER_FACTOR)
                # Only blend if both slots have enough samples
                if len(next_values) >= SLOT_MIN_SAMPLES and len(cur_values) >= SLOT_MIN_SAMPLES:
                    w = delta_to_end / SLOT_BOUNDARY_SMOOTHING_WINDOW_MIN
                    median = (1-w) * np.median(cur_values) + w * np.median(next_values)
                    iqr = (1-w) * compute_iqr(cur_values) + w * compute_iqr(next_values)
                    sample_size = int((1-w)*len(cur_values) + w*len(next_values))
                    confidence = self.confidence_label(sample_size)
                    return median, confidence, sample_size, "slot-boundary", iqr, "Slot boundary smoothing (end)"
                # If not, fall back to using only this slot

        # Fallback to just this slot
        # samples = self.datastore.get_slot_samples(unit, risk_color, slot, query_time.date())
        samples = self.datastore.fetch_slot_events(unit, risk_color, slot, query_time.date().isoformat())
        values = apply_iqr_filter(samples.values, IQR_OUTLIER_FACTOR)
        if len(values) >= SLOT_MIN_SAMPLES:
            wait = float(np.median(values))
            iqr = compute_iqr(values)
            confidence, fallback_tier = self.confidence_label(len(values)), "slot-today"
            return wait, confidence, len(values), fallback_tier, iqr, None

        # TIER 3: Multi-day smoothing (weighted)
        # day_samples = self.datastore.get_multi_day_samples(unit, risk_color, slot, query_time.date(), MULTI_DAY_LOOKBACK_DAYS)
        day_samples = self.datastore.fetch_multi_day_events(unit, risk_color, slot, query_time.date().isoformat(), MULTI_DAY_LOOKBACK_DAYS)
        all_waits, weights = [], []
        for i, (day, sample_series) in enumerate(sorted(day_samples.items(), reverse=True)):
            vals = apply_iqr_filter(sample_series.values, IQR_OUTLIER_FACTOR)
            if len(vals) > 0:
                all_waits.extend(list(vals))
                # Weight: 1 for today, decay for past days
                weights.extend([MULTI_DAY_DECAY**i]*len(vals))
        if len(all_waits) >= SLOT_MIN_SAMPLES:
            wait = float(np.median(all_waits))  # Or use weighted median
            iqr = compute_iqr(np.array(all_waits))
            confidence, fallback_tier = self.confidence_label(len(all_waits)), "slot-multiday"
            return wait, confidence, len(all_waits), fallback_tier, iqr, None

        # TIER 4: Default fallback
        wait = DEFAULT_WAIT_BY_COLOR.get(risk_color, 60)
        iqr = 0
        confidence, fallback_tier = "low", "default"
        explanation = "Used default wait for color; not enough recent data."
        return wait, confidence, 0, fallback_tier, iqr, explanation

    def confidence_label(self, n: int) -> str:
        if n >= HIGH_CONFIDENCE_SAMPLES:
            return "high"
        elif n >= MEDIUM_CONFIDENCE_SAMPLES:
            return "medium"
        else:
            return "low"