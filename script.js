const API_URL = "http://lmpss3.dev.spsejecna.net/procedure2.php";

function make_base_auth(user, password) {
    return "Basic " + btoa(user + ":" + password);
}

const username = "coffe";
const password = "kafe";
const AUTH_HEADER = make_base_auth(username, password);

const OFFLINE_KEY = "offlineDrinks";

document.addEventListener("DOMContentLoaded", async () => {

    const usersDiv = document.getElementById("users");
    const drinksDiv = document.getElementById("drinks");
    const form = document.getElementById("drinkForm");
    const output = document.getElementById("output");

    async function api(cmd) {
        const res = await fetch(`${API_URL}?cmd=${cmd}`, {
            method: "GET",
            credentials: "include",
            headers: { "Authorization": AUTH_HEADER }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }

    function saveOffline(data) {
        const existing = JSON.parse(localStorage.getItem(OFFLINE_KEY)) || [];
        existing.push(data);
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(existing));
    }

    async function syncOffline() {
        const data = JSON.parse(localStorage.getItem(OFFLINE_KEY)) || [];
        if (data.length === 0) return;

        for (let item of data) {
            try {
                await fetch(`${API_URL}?cmd=saveDrinks`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": AUTH_HEADER
                    },
                    credentials: "include",
                    body: JSON.stringify(item)
                });
            } catch {
                return;
            }
        }

        localStorage.removeItem(OFFLINE_KEY);
        output.textContent = "Offline data odeslána ✔";
    }

    window.addEventListener("online", syncOffline);

    function renderUsers(users) {
        const select = document.createElement("select");
        select.name = "user";
        select.required = true;

        select.innerHTML = `<option value="">-- Vyber uživatele --</option>`;

        Object.values(users).forEach(u => {
            const option = document.createElement("option");
            option.value = u.ID;
            option.textContent = u.name;
            select.appendChild(option);
        });

        usersDiv.appendChild(select);
    }

    function renderDrinks(drinks) {
        Object.values(drinks).forEach(d => {
            const row = document.createElement("div");
            row.className = "drink-row";

            row.innerHTML = `
                <span>${d.typ}</span>
                <div class="counter">
                    <button type="button" class="minus">−</button>
                    <input type="number" min="0" value="0" data-type="${d.typ}">
                    <button type="button" class="plus">+</button>
                </div>
            `;

            const input = row.querySelector("input");

            row.querySelector(".plus").onclick = () => input.value++;
            row.querySelector(".minus").onclick = () => input.value = Math.max(0, input.value - 1);

            drinksDiv.appendChild(row);
        });
    }

    try {
        const users = await api("getPeopleList");
        const drinks = await api("getTypesList");

        renderUsers(users);
        renderDrinks(drinks);

        syncOffline();

    } catch {
        output.textContent = "Offline režim ⚠";
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const user = new FormData(form).get("user");

        const drinksArr = [];
        document.querySelectorAll("input[type='number']").forEach(input => {
            drinksArr.push({
                type: input.dataset.type,
                value: parseInt(input.value)
            });
        });

        const payload = { user, drinks: drinksArr };

        try {
            await fetch(`${API_URL}?cmd=saveDrinks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": AUTH_HEADER
                },
                credentials: "include",
                body: JSON.stringify(payload)
            });

            output.textContent = "Uloženo ✔";
            form.reset();

            saveDailyStats(drinksArr);

        } catch {
            saveOffline(payload);
            output.textContent = "Offline – uloženo lokálně 💾";
        }
    });

    function saveDailyStats(drinks) {
        const today = new Date().toDateString();
        const stats = JSON.parse(localStorage.getItem("dailyStats")) || {};

        if (!stats[today]) stats[today] = [];
        stats[today].push(...drinks);

        localStorage.setItem("dailyStats", JSON.stringify(stats));
    }

    function showNotification() {
        if (Notification.permission !== "granted") return;

        const today = new Date().toDateString();
        const stats = JSON.parse(localStorage.getItem("dailyStats")) || {};
        const todayData = stats[today] || [];

        const sum = {};
        todayData.forEach(d => {
            sum[d.type] = (sum[d.type] || 0) + d.value;
        });

        let text = "Dnes vypito:\n";
        for (let key in sum) {
            text += `${key}: ${sum[key]}\n`;
        }

        new Notification("☕ Denní přehled", {
            body: text
        });
    }

    if ("Notification" in window) {
        Notification.requestPermission();
    }

    setInterval(showNotification, 60000);
});