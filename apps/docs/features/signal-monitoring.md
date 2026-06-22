# Signal Monitoring

HD Homey includes a real-time signal monitoring system that turns it into a tuner installation and diagnostic tool. View live signal strength, SNR quality, and symbol quality for every HDHomeRun tuner slot on any configured device.

## Overview

Signal data is fetched directly from the HDHomeRun device's HTTP API (`/status.json`) and delivered to the browser via **Server-Sent Events (SSE)**. No binary tools are required, and no historical data is stored — all graphs are computed from an in-memory rolling buffer.

## Accessing Signal Monitor

### From a Tuner Detail Page

1. Navigate to **Tuners → [your tuner]**
2. Click **📡 Signal Monitor** in the tuner action area
3. The signal monitor page opens at `/tuners/[id]/signal`

## Signal Metrics

Each tuner displays three metrics, updated every 2 seconds:

| Metric | Description | Source |
|--------|-------------|--------|
| **SS** (Signal Strength) | Raw RF power level at the tuner input | `SignalStrengthPercent` |
| **SNQ** (SNR Quality) | Modulation error ratio / signal-to-noise ratio | `SignalQualityPercent` |
| **SEQ** (Symbol Quality) | Symbol error rate — 100% means zero errors | `SymbolQualityPercent` |

## Signal Quality Thresholds

Color-coded badges provide instant visual feedback:

### Signal Strength (SS) & SNR Quality (SNQ)

| Color | Indicator | Value |
|-------|-----------|-------|
| 🟢 Green | Good | > 70% |
| 🟡 Yellow | Fair | 40–70% |
| 🔴 Red | Poor | < 40% |
| ⚪ Gray | Idle | — |

### Symbol Quality (SEQ)

| Color | Indicator | Value |
|-------|-----------|-------|
| 🟢 Green | Good | 100% (no errors) |
| 🟡 Yellow | Fair | 80–99% |
| 🔴 Red | Poor | < 80% |
| ⚪ Gray | Idle | — |

::: tip Antenna Alignment
For antenna alignment, focus primarily on **SEQ (Symbol Quality)**. A tuner can appear to have a strong SS but poor SEQ, indicating multipath interference or poor signal quality. Aim for SEQ = 100% (green).
:::

## Single-Tuner Signal Page

The single-tuner page (`/tuners/[id]/signal`) shows:

- **Signal gauges**: Live SS, SNQ, and SEQ with color-coded badges
- **Rolling graphs**: 60-point line charts (one point per 2 seconds = ~2 minutes of history)
- **Channel info**: Currently tuned channel name and number (or "Idle" if no channel is tuned)
- **Program listing** (P2): Shows all MPEG programs and PIDs on the currently tuned channel
- **ATSC 3.0 details** (P2): Physical layer pipe and L1 signaling data for NextGen TV devices

### Program and PID Listing

When a channel is tuned, a **"Programs on this channel"** collapsible section appears, showing:
- Program number and guide name
- Video PID(s) with codec type
- Audio PID(s) with codec type
- Data PID(s)
- A **Watch** link to stream that program

### ATSC 3.0 Details

If your HDHomeRun device detects an ATSC 3.0 (NextGen TV) signal, an additional section appears showing:

**PLP Info:**
- PLP ID and PLP Type
- SNR in dB
- FEC Type (e.g., LDPC)

**L1 Signaling:**
- FFT Size (e.g., 16K, 32K)
- Guard Interval
- Pilot Pattern
- L1-Basic and L1-Detail modulation schemes

::: info ATSC 3.0 Availability
This section only appears on devices that support ATSC 3.0 (e.g., HDHomeRun Flex 4K). On ATSC 1.0 devices, it is automatically hidden.
:::

### Reduced Motion

The rolling graphs respect the `prefers-reduced-motion` system preference. When enabled, graph animations are disabled and values update as static snapshots.

## Technical Details

- **Polling interval**: 2 seconds per device
- **Connection keepalive**: Ping events every 30 seconds (prevents proxy timeouts)
- **Device timeout**: 3 seconds (emits `error: "timeout"` if device is slow)
- **Graph buffer**: 60 data points × 2 seconds = 120 seconds of rolling history
- **Data source**: `http://{device-ip}/status.json` (standard HDHomeRun HTTP API)
- **Delivery**: Server-Sent Events (SSE) via Next.js Route Handler

## Device Compatibility

| Device Type | Signal Gauges | ATSC 3.0 Details |
|-------------|---------------|------------------|
| HDHomeRun Connect (ATSC 1.0) | ✅ | ❌ (hidden) |
| HDHomeRun Extend (ATSC 1.0) | ✅ | ❌ (hidden) |
| HDHomeRun Flex (ATSC 1.0) | ✅ | ❌ (hidden) |
| HDHomeRun Flex 4K (ATSC 3.0) | ✅ | ✅ |
| HDHomeRun Quatro (ATSC 1.0) | ✅ | ❌ (hidden) |
| European DVB-T/T2 devices | ✅ | ❌ (hidden) |

## Accessibility

All signal indicators comply with WCAG 2.2 AA:

- **Gauges**: Each gauge has an `aria-label` with the metric name and current value (e.g., *"Signal Strength 83 percent"*)
- **Quality badges**: Include both a color indicator and a text label ("Good", "Fair", "Poor") — not color alone
- **Graphs**: Wrapped in `role="img"` with an `aria-label` summarizing the current value for screen readers
