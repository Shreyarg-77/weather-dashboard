// One place that handles network failures and bad status codes
async function request(url, serviceName) {
    let response;
    try {
        response = await fetch(url);
    } catch (error) {
        throw new Error("Couldn't reach the weather service. Check your internet connection.");
    }
    if (!response.ok) {
        throw new Error(`The ${serviceName} service had a problem (error ${response.status}). Please try again.`);
    }
    return response.json();
}

export async function getPlaces(city, count = 10) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=${count}`;
    const data = await request(url, "location");

    if (!data.results || data.results.length === 0) {
        throw new Error(`Couldn't find "${city}". Check the spelling and try again.`);
    }

    return data.results.map(place => ({
        latitude: place.latitude,
        longitude: place.longitude,
        label: [place.name, place.admin1, place.country].filter(Boolean).join(", ")
    }));
}

export function getWeatherData(place) {
    const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day` +
        `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,uv_index_max,sunrise,sunset` +
        `&timezone=auto`;
    return request(url, "weather");
}