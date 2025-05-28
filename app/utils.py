from datetime import datetime, time, timedelta
import numpy as np
from typing import List, Tuple, Optional
from WazeRouteCalculator import WazeRouteCalculator


def assign_time_slot(ts: datetime, slots: List[Tuple[str, str]]) -> str:
    t = ts.time()
    for start_str, end_str in slots:
        start = datetime.strptime(start_str, "%H:%M").time()
        end = datetime.strptime(end_str, "%H:%M").time()
        if start <= t < end:
            return f"{start_str}-{end_str}"
    return "off-hours"

def rolling_window_bounds(query_time: datetime, window_minutes: int) -> Tuple[datetime, datetime]:
    half = timedelta(minutes=window_minutes // 2)
    return query_time - half, query_time + half

def weighted_median(data: np.ndarray, weights: np.ndarray) -> float:
    sorter = np.argsort(data)
    data, weights = data[sorter], weights[sorter]
    cum_weights = np.cumsum(weights)
    cutoff = weights.sum() / 2.0
    return data[cum_weights >= cutoff][0]

def compute_iqr(values: np.ndarray) -> float:
    if len(values) == 0:
        return 0.0
    q75, q25 = np.percentile(values, [75, 25])
    return q75 - q25

def apply_iqr_filter(values: np.ndarray, factor: float = 1.5):
    if len(values) == 0:
        return np.array([])   # not 0.0!
    iqr = compute_iqr(values)
    q1, q3 = np.percentile(values, [25, 75])
    lower = q1 - factor * iqr
    upper = q3 + factor * iqr
    return values[(values >= lower) & (values <= upper)]

def get_adjacent_slots(slots: List[Tuple[str, str]], slot_label: str) -> Tuple[Optional[str], Optional[str]]:
    """Given a slot label, returns (previous_slot, next_slot) labels if exist."""
    slot_labels = [f"{start}-{end}" for start, end in slots]
    idx = slot_labels.index(slot_label) if slot_label in slot_labels else -1
    prev_slot = slot_labels[idx - 1] if idx > 0 else None
    next_slot = slot_labels[idx + 1] if idx >= 0 and idx + 1 < len(slot_labels) else None
    return prev_slot, next_slot

def slot_boundaries(slots: List[Tuple[str, str]], slot_label: str) -> Tuple[time, time]:
    """Returns (start_time, end_time) for the given slot label."""
    for start_str, end_str in slots:
        print(f"STRArtstr, end_str: {start_str, end_str}")
        print(f"SLOT_LABEL: {slot_label}")
        if slot_label == f"{start_str}-{end_str}":
            start = datetime.strptime(start_str, "%H:%M").time()
            end = datetime.strptime(end_str, "%H:%M").time()
            return start, end
    raise ValueError("Slot label not found")

def get_route_time(start_lat, start_lng, end_lat, end_lng):
    try:
        start = f"{start_lat},{start_lng}"
        end = f"{end_lat},{end_lng}"
        region = 'EU'  # Use 'EU' for Brazil
        calculator = WazeRouteCalculator(start, end, region)
        route_time, route_distance = calculator.calc_route_info()
        return route_time  # minutes
    except Exception as e:
        # Log error or return a high fallback value
        return None

