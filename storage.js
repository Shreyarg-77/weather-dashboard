export function storeSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.error("Could not save:", error);
    }
}

export function storeGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

export function readList(key) {
    try {
        const value = JSON.parse(storeGet(key));
        return Array.isArray(value) ? value : [];
    } catch (error) {
        return [];
    }
}

export function writeList(key, list) {
    storeSet(key, JSON.stringify(list));
}

export function readObject(key) {
    try {
        return JSON.parse(storeGet(key));
    } catch (error) {
        return null;
    }
}