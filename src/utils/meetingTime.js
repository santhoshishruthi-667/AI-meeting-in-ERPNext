/**
 * Utility functions to manage meeting date, time, and active status.
 * Ensures the meeting link works ONLY on the assigned date and time.
 */

export function parseMeetingDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    let hours = 0;
    let minutes = 0;

    if (timeStr) {
      const cleanTime = String(timeStr).trim().toUpperCase();
      const isPM = cleanTime.includes('PM');
      const isAM = cleanTime.includes('AM');
      const timeOnly = cleanTime.replace(/[AP]M/, '').trim();
      const parts = timeOnly.split(':').map(Number);
      hours = isNaN(parts[0]) ? 0 : parts[0];
      minutes = isNaN(parts[1]) ? 0 : parts[1];

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  } catch {
    return null;
  }
}

export function formatTimeForDisplay(timeStr) {
  if (!timeStr) return '';
  const clean = String(timeStr).trim().toUpperCase();
  if (clean.includes('AM') || clean.includes('PM')) return clean;
  const parts = clean.split(':').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0])) {
    const hours = parts[0];
    const minutes = String(parts[1]).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  }
  return timeStr;
}

export function getMeetingTimeStatus(dateStr, timeStr, durationMinutes = 60) {
  const start = parseMeetingDateTime(dateStr, timeStr);
  if (!start) {
    return {
      isLive: true,
      status: 'active',
      badge: '🟢 Active Now',
      message: 'Meeting link is active.',
      countdown: 'Now'
    };
  }

  const now = new Date();
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const diffMs = start.getTime() - now.getTime();
  const formattedTime = formatTimeForDisplay(timeStr);

  if (diffMs > 0) {
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const secs = diffSecs % 60;

    let countdown = '';
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      countdown = `in ${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      countdown = `in ${hours}h ${mins}m`;
    } else if (mins > 0) {
      countdown = `in ${mins}m ${secs}s`;
    } else {
      countdown = `in ${secs}s`;
    }

    return {
      isLive: false,
      status: 'upcoming',
      badge: `🔒 Locked (${countdown})`,
      message: `The meeting link works only on the assigned date and time. It is scheduled for ${dateStr} at ${formattedTime}.`,
      countdown,
      diffMs,
      formattedTime
    };
  } else if (now.getTime() <= end.getTime()) {
    return {
      isLive: true,
      status: 'active',
      badge: '🟢 Active Now',
      message: 'The meeting is active right now! You can join the call.',
      countdown: 'Active',
      diffMs: 0,
      formattedTime
    };
  } else {
    return {
      isLive: false,
      status: 'expired',
      badge: '⏳ Expired',
      message: `This meeting was scheduled for ${dateStr} at ${formattedTime} and the session time has ended.`,
      countdown: 'Ended',
      diffMs: 0,
      formattedTime
    };
  }
}
