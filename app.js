import { getPlaces, getWeatherData } from "./api.js";
import { storeGet, storeSet, readList, writeList, readObject } from "./storage.js";
import { shortName, samePlace } from "./utils.js";
import * as ui from "./ui.js";

const { els } = ui;

// ---------- State ----------
const state = {
    data: null,
    place: null,
    unit: storeGet("unit") === "F" ? "F" : "C",
    theme: storeGet("theme") === "light" ? "light" : "dark"
    
};

const REFRESH_MS = 15 * 60 * 1000;   // 15 minutes
let lastFetch = 0;

// ---------- Drawing ----------
function redraw() {
    if (!state.data) return;
    ui.renderWeather(state.data, state.place.label, state.unit);
    ui.updateFavButton(isFavorite(state.place));
    
}

function clearAll() {
    state.data = null;
    state.place = null;
    ui.clearResults();
    refreshChips();
}

function refreshChips() {
    const activeLabel = state.place ? state.place.label : null;

    ui.renderFavorites(readList("favorites"), activeLabel, {
        onOpen: (place) => loadPlace(place),
        onRename: renameFavorite,
        onDelete: deleteFavorite
    });

    ui.renderRecent(readList("recent"), activeLabel, {
        onOpen: (place) => loadPlace(place, { reorder: false }),
        onClear: clearRecent
    });
}

// ---------- Loading weather ----------
async function loadPlace(place, { reorder = true } = {}) {
    ui.showMessage("Loading...");
    try {
        state.data = await getWeatherData(place);
        state.place = place;
        redraw();
        state.data = await getWeatherData(place);
        state.place = place;
        redraw();
        lastFetch = Date.now();
        ui.showMessage("");
        storeSet("lastPlace", JSON.stringify(place));
        addRecent(place, reorder);
        refreshChips();
    } catch (error) {
        clearAll();
        ui.showMessage(error.message);
    }
}

async function searchCity(city) {
    city = city.trim();

    if (!city) {
        ui.showMessage("Please enter a city name.");
        return;
    }

    ui.showMessage("Loading...");
    ui.setSearching(true);

    try {
        const places = await getPlaces(city);
        if (places.length === 1) {
            await loadPlace(places[0]);
        } else {
            clearAll();
            ui.showChoices(places, (place) => loadPlace(place));
            ui.showMessage("");
        }
    } catch (error) {
        clearAll();
        ui.showMessage(error.message);
    } finally {
        ui.setSearching(false);
    }
}

// ---------- Recent searches ----------
function addRecent(place, reorder) {
    let recent = readList("recent");
    const exists = recent.some(p => samePlace(p, place));

    // Opening a chip must not shuffle the list
    if (exists && !reorder) return;

    recent = recent.filter(p => !samePlace(p, place));
    recent.unshift({
        latitude: place.latitude,
        longitude: place.longitude,
        label: place.label
    });
    writeList("recent", recent.slice(0, 5));
}

function clearRecent() {
    writeList("recent", []);
    refreshChips();
}

// ---------- Favorites (Create, Read, Update, Delete) ----------
function isFavorite(place) {
    return readList("favorites").some(f => samePlace(f, place));
}

function toggleFavorite() {
    if (!state.place) return;
    let favorites = readList("favorites");

    if (isFavorite(state.place)) {
        favorites = favorites.filter(f => !samePlace(f, state.place));      // Delete
    } else {
        favorites.push({                                                     // Create
            latitude: state.place.latitude,
            longitude: state.place.longitude,
            label: state.place.label,
            name: shortName(state.place.label)
        });
    }
    writeList("favorites", favorites);
    refreshChips();
    ui.updateFavButton(isFavorite(state.place));
}

function renameFavorite(fav) {
    const input = prompt("Rename this favorite:", fav.name || shortName(fav.label));
    if (input === null) return;
    const name = input.trim();
    if (!name) return;

    const favorites = readList("favorites").map(f =>                         // Update
        samePlace(f, fav) ? { ...f, name } : f
    );
    writeList("favorites", favorites);
    refreshChips();
}

function deleteFavorite(fav) {
    const favorites = readList("favorites").filter(f => !samePlace(f, fav)); // Delete
    writeList("favorites", favorites);
    refreshChips();
    if (state.place) ui.updateFavButton(isFavorite(state.place));
}

// ---------- Suggestions (autocomplete) ----------
let suggestTimer = null;
let suggestRequest = 0;
let currentSuggestions = [];
let activeIndex = -1;

function closeSuggestions() {
    suggestRequest++;
    clearTimeout(suggestTimer);
    currentSuggestions = [];
    activeIndex = -1;
    ui.hideSuggestions();
}

function chooseSuggestion(place) {
    closeSuggestions();
    els.cityInput.value = shortName(place.label);
    loadPlace(place);
}

els.cityInput.addEventListener("input", () => {
    clearTimeout(suggestTimer);
    const text = els.cityInput.value.trim();

    if (text.length < 2) {
        closeSuggestions();
        return;
    }

    // Wait 300 ms after the last keystroke before asking the API
    suggestTimer = setTimeout(async () => {
        const requestId = ++suggestRequest;
        try {
            const places = await getPlaces(text, 6);
            if (requestId !== suggestRequest) return; // a newer request exists
            currentSuggestions = places;
            activeIndex = -1;
            ui.renderSuggestions(places, chooseSuggestion);
        } catch (error) {
            if (requestId === suggestRequest) closeSuggestions();
        }
    }, 300);
});

els.cityInput.addEventListener("keydown", (event) => {
    const count = currentSuggestions.length;

    if (event.key === "ArrowDown" && count) {
        event.preventDefault();
        activeIndex = (activeIndex + 1) % count;
        ui.setActiveSuggestion(activeIndex);
    } else if (event.key === "ArrowUp" && count) {
        event.preventDefault();
        activeIndex = (activeIndex - 1 + count) % count;
        ui.setActiveSuggestion(activeIndex);
    } else if (event.key === "Enter") {
        if (activeIndex >= 0) {
            chooseSuggestion(currentSuggestions[activeIndex]);
        } else {
            closeSuggestions();
            searchCity(els.cityInput.value);
        }
    } else if (event.key === "Escape") {
        closeSuggestions();
    }
});

// Close the list when clicking anywhere outside the search box
document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-box")) {
        closeSuggestions();
    }
});

// ---------- Other events ----------
els.searchBtn.addEventListener("click", () => {
    closeSuggestions();
    searchCity(els.cityInput.value);
});

els.themeBtn.addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    storeSet("theme", state.theme);
    ui.applyTheme(state.theme);
});

els.unitBtn.addEventListener("click", () => {
    state.unit = state.unit === "C" ? "F" : "C";
    storeSet("unit", state.unit);
    ui.updateUnitButton(state.unit);
    redraw();
});

// The favorite button is created each time the weather is drawn,
// so one listener on its parent handles it
els.current.addEventListener("click", (event) => {
    if (event.target.closest("#fav-btn")) {
        toggleFavorite();
    }
});

// ---------- Auto-refresh ----------
let refreshing = false;

function isStale() {
    return state.place && Date.now() - lastFetch >= REFRESH_MS;
}

// Updates the data without showing "Loading..." or clearing the screen
async function refreshQuietly() {
    if (!state.place || refreshing) return;
    refreshing = true;
    const place = state.place;

    try {
        const data = await getWeatherData(place);
        if (state.place !== place) return;   // the user switched city meanwhile
        state.data = data;
        redraw();
        lastFetch = Date.now();
    } catch (error) {
        console.warn("Auto-refresh failed, keeping the old data:", error.message);
    } finally {
        refreshing = false;
    }
}

// Check once a minute, but never while the tab is hidden
setInterval(() => {
    if (!document.hidden && isStale()) refreshQuietly();
}, 60 * 1000);

// Catch up as soon as you come back to the tab
document.addEventListener("visibilitychange", () => {
    if (!document.hidden && isStale()) refreshQuietly();
});

// ...and when the internet comes back
window.addEventListener("online", () => {
    if (isStale()) refreshQuietly();
});

// ---------- Start ----------
ui.applyTheme(state.theme);
ui.updateUnitButton(state.unit);
refreshChips();

const savedPlace = readObject("lastPlace");
if (savedPlace && savedPlace.label && typeof savedPlace.latitude === "number") {
    els.cityInput.value = shortName(savedPlace.label);
    loadPlace(savedPlace, { reorder: false });
}