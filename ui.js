import { weatherCodes } from "./constants.js";
import {
    escapeHtml, toTemp, windText, getIcon, getMood,
    uvLabel, formatTime, shortName, getAlerts
} from "./utils.js";

export const els = {
    cityInput: document.getElementById("city-input"),
    searchBtn: document.getElementById("search-btn"),
    message: document.getElementById("message"),
    themeBtn: document.getElementById("theme-btn"),
    unitBtn: document.getElementById("unit-btn"),
    alerts: document.getElementById("alerts"),
    current: document.getElementById("current"),
    forecast: document.getElementById("forecast"),
    suggestions: document.getElementById("suggestions"),
    favorites: document.getElementById("favorites"),
    recent: document.getElementById("recent")
};

// ---------- Small controls ----------
export function showMessage(text) {
    els.message.textContent = text;
}

export function setSearching(isSearching) {
    els.searchBtn.disabled = isSearching;
}

export function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    els.themeBtn.textContent = theme === "light" ? "🌙 Dark" : "☀️ Light";
}

export function updateUnitButton(unit) {
    els.unitBtn.textContent = unit === "C" ? "Show °F" : "Show °C";
}

export function clearResults() {
    els.current.innerHTML = "";
    els.forecast.innerHTML = "";
    els.alerts.innerHTML = "";
    delete document.body.dataset.weather;
}

// ---------- Weather display ----------
function showAlerts(data, unit) {
    const alerts = getAlerts(data, unit);
    if (alerts.length === 0) {
        els.alerts.innerHTML = "";
        return;
    }
    els.alerts.innerHTML =
        alerts.map(text => `<div class="alert">${text}</div>`).join("") +
        `<p class="alert-note">Based on forecast data, not an official warning.</p>`;
}

function showCurrent(data, label, unit) {
    const current = data.current;
    const daily = data.daily;
    const description = weatherCodes[current.weather_code] || "Unknown weather";
    const icon = getIcon(current.weather_code, current.is_day);
    const updated = new Date(current.time).toLocaleString("en-US", {
        weekday: "short", day: "numeric", month: "short",
        hour: "numeric", minute: "2-digit"
    });

    const rain = daily.precipitation_probability_max[0];
    const rainText = rain == null ? "N/A" : `${rain}%`;
    const uv = daily.uv_index_max[0];
    const uvText = uv == null ? "N/A" : `${Math.round(uv)} · ${uvLabel(uv)}`;

    // Background mood follows the weather
    document.body.dataset.weather = getMood(current.weather_code, current.is_day);

    els.current.innerHTML = `
        <div class="hero">
            <div>
                <p class="location">${escapeHtml(label)}</p>
                <p class="timestamp">Updated ${updated} (local time)</p>
                <button id="fav-btn" class="fav-btn"></button>
            </div>
            <div class="hero-right">
                <div class="hero-temp">
                    <span class="icon">${icon}</span>
                    <span class="temp">${toTemp(current.temperature_2m, unit)}°</span>
                </div>
                <p class="condition">${description}</p>
            </div>
        </div>
        <div class="details">
            <div class="tile">
                <p class="tile-label">Feels like</p>
                <p class="tile-value">${toTemp(current.apparent_temperature, unit)}°${unit}</p>
            </div>
            <div class="tile">
                <p class="tile-label">Humidity</p>
                <p class="tile-value">${current.relative_humidity_2m}%</p>
            </div>
            <div class="tile">
                <p class="tile-label">Wind</p>
                <p class="tile-value">${windText(current.wind_speed_10m, unit)}</p>
            </div>
            <div class="tile">
                <p class="tile-label">Rain chance</p>
                <p class="tile-value">${rainText}</p>
            </div>
            <div class="tile">
                <p class="tile-label">UV index</p>
                <p class="tile-value">${uvText}</p>
            </div>
            <div class="tile">
                <p class="tile-label">Sun</p>
                <p class="tile-value sun">🌅 ${formatTime(daily.sunrise[0])}<br>🌇 ${formatTime(daily.sunset[0])}</p>
            </div>
        </div>
    `;
}

function showForecast(data, unit) {
    els.forecast.innerHTML = "";
    const daily = data.daily;

    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(daily.time[i]).toLocaleDateString("en-US", {
            weekday: "short", day: "numeric", month: "short"
        });
        const code = daily.weather_code[i];
        const dayDescription = weatherCodes[code] || "Unknown weather";
        const icon = getIcon(code, 1);

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <p class="day">${date}</p>
            <p class="card-icon">${icon}</p>
            <p class="temps"><span class="hi">${toTemp(daily.temperature_2m_max[i], unit)}°</span> <span class="lo">${toTemp(daily.temperature_2m_min[i], unit)}°</span></p>
            <p class="desc">${dayDescription}</p>
        `;
        els.forecast.appendChild(card);
    }
}

export function renderWeather(data, label, unit) {
    showCurrent(data, label, unit);
    showAlerts(data, unit);
    showForecast(data, unit);
}

export function updateFavButton(isFavorite) {
    const btn = document.getElementById("fav-btn");
    if (!btn) return;
    btn.textContent = isFavorite ? "★ Saved" : "☆ Save to favorites";
}

// ---------- Match picker ----------
export function showChoices(places, onPick) {
    els.current.innerHTML = `<p class="choose">Which one did you mean?</p>`;

    places.forEach(place => {
        const btn = document.createElement("button");
        btn.className = "choice";
        btn.textContent = place.label;
        btn.addEventListener("click", () => onPick(place));
        els.current.appendChild(btn);
    });
}

// ---------- Favorites and recent chips ----------
export function renderFavorites(favorites, activeLabel, handlers) {
    els.favorites.innerHTML = "";

    if (favorites.length === 0) {
        els.favorites.hidden = true;
        return;
    }

    const title = document.createElement("span");
    title.className = "chips-label";
    title.textContent = "★ Favorites";
    els.favorites.appendChild(title);

    favorites.forEach(fav => {
        const chip = document.createElement("div");
        chip.className = "chip";
        if (fav.label === activeLabel) chip.classList.add("active");

        const main = document.createElement("button");
        main.className = "chip-main";
        main.textContent = fav.name || shortName(fav.label);
        main.title = fav.label;
        main.addEventListener("click", () => handlers.onOpen(fav));

        const edit = document.createElement("button");
        edit.className = "chip-small";
        edit.textContent = "✎";
        edit.title = "Rename";
        edit.addEventListener("click", () => handlers.onRename(fav));

        const del = document.createElement("button");
        del.className = "chip-small";
        del.textContent = "✕";
        del.title = "Remove";
        del.addEventListener("click", () => handlers.onDelete(fav));

        chip.append(main, edit, del);
        els.favorites.appendChild(chip);
    });
    els.favorites.hidden = false;
}

export function renderRecent(recent, activeLabel, handlers) {
    els.recent.innerHTML = "";

    if (recent.length === 0) {
        els.recent.hidden = true;
        return;
    }

    const title = document.createElement("span");
    title.className = "chips-label";
    title.textContent = "Recent";
    els.recent.appendChild(title);

    recent.forEach(place => {
        const chip = document.createElement("div");
        chip.className = "chip";
        if (place.label === activeLabel) chip.classList.add("active");

        const main = document.createElement("button");
        main.className = "chip-main";
        main.textContent = shortName(place.label);
        main.title = place.label;
        main.addEventListener("click", () => handlers.onOpen(place));

        chip.appendChild(main);
        els.recent.appendChild(chip);
    });

    const clear = document.createElement("button");
    clear.className = "chip-clear";
    clear.textContent = "Clear";
    clear.addEventListener("click", handlers.onClear);
    els.recent.appendChild(clear);

    els.recent.hidden = false;
}

// ---------- Suggestions dropdown ----------
export function renderSuggestions(places, onPick) {
    els.suggestions.innerHTML = "";

    places.forEach(place => {
        const li = document.createElement("li");
        li.textContent = place.label;
        li.addEventListener("click", () => onPick(place));
        els.suggestions.appendChild(li);
    });
    els.suggestions.hidden = false;
}

export function hideSuggestions() {
    els.suggestions.hidden = true;
    els.suggestions.innerHTML = "";
}

export function setActiveSuggestion(index) {
    els.suggestions.querySelectorAll("li").forEach((li, i) => {
        li.classList.toggle("active", i === index);
    });
}