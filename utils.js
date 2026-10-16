import { weatherIcons, nightIcons } from "./constants.js";

export function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

// Temperatures arrive in °C; convert only when displaying
export function toTemp(c, unit) {
    return Math.round(unit === "F" ? (c * 9) / 5 + 32 : c);
}

export function windText(kmh, unit) {
    return unit === "F" ? `${(kmh / 1.609).toFixed(1)} mph` : `${kmh} km/h`;
}

export function getIcon(code, isDay = 1) {
    if (!isDay && nightIcons[code]) {
        return nightIcons[code];
    }
    return weatherIcons[code] || "🌡️";
}

// Picks the page mood used by the background
export function getMood(code, isDay) {
    if (code >= 95) return "storm";
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
    if (code === 45 || code === 48) return "fog";
    if (!isDay) return "night";
    return code <= 1 ? "clear" : "cloudy";
}

export function uvLabel(uv) {
    if (uv < 3) return "Low";
    if (uv < 6) return "Moderate";
    if (uv < 8) return "High";
    if (uv < 11) return "Very high";
    return "Extreme";
}

// Sunrise/sunset strings are already in the city's local time
export function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });
}

export function shortName(label) {
    return label.split(",")[0];
}

export function samePlace(a, b) {
    return a.label === b.label;
}

// Builds simple warnings from forecast data (not official alerts)
export function getAlerts(data, unit) {
    const alerts = [];
    const current = data.current;
    const daily = data.daily;
    const codes = [current.weather_code, daily.weather_code[0]];

    if (codes.some(c => c >= 95)) {
        alerts.push("⛈️ Thunderstorm possible today. Stay indoors if you can.");
    }
    if (codes.some(c => c === 65 || c === 67 || c === 82)) {
        alerts.push("🌧️ Heavy rain expected today.");
    }
    if (codes.some(c => c === 75 || c === 86)) {
        alerts.push("❄️ Heavy snowfall expected today.");
    }
    if (daily.temperature_2m_max[0] >= 40) {
        alerts.push(`🔥 Extreme heat: up to ${toTemp(daily.temperature_2m_max[0], unit)}°${unit} today. Stay hydrated.`);
    }
    if (daily.temperature_2m_min[0] <= -10) {
        alerts.push(`🥶 Very cold: down to ${toTemp(daily.temperature_2m_min[0], unit)}°${unit} today.`);
    }
    if (current.wind_speed_10m >= 50) {
        alerts.push(`💨 Strong wind: ${windText(current.wind_speed_10m, unit)}.`);
    }
    const uv = daily.uv_index_max[0];
    if (uv != null && uv >= 8) {
        alerts.push(`☀️ Very high UV index (${Math.round(uv)}). Use sun protection.`);
    }
    return alerts;
}