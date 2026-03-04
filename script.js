const API_URL = "http://lmpss3.dev.spsejecna.net/procedure.php";

document.addEventListener("DOMContentLoaded", async () => {

    const usersDiv = document.getElementById("users");
    const drinksDiv = document.getElementById("drinks");
    const form = document.getElementById("drinkForm");
    const output = document.getElementById("output");

    async function api(cmd) {
        const res = await fetch(`${API_URL}?cmd=${cmd}`);
        return await res.json();
    }

    function saveUser(id) {
        localStorage.setItem("lastUser", id);
        sessionStorage.setItem("lastUser", id);
        document.cookie = `lastUser=${id}; path=/; max-age=31536000`;
    }

    function getSavedUser() {
        return sessionStorage.getItem("lastUser") ||
               localStorage.getItem("lastUser") ||
               document.cookie.split("; ")
               .find(row => row.startsWith("lastUser="))
               ?.split("=")[1];
    }

function renderUsers(users) {
    const saved = getSavedUser();

    const fs = document.createElement("fieldset");
    fs.innerHTML = "<legend>Uživatel</legend>";

    let select = document.createElement("select");
    select.name = "user";
    select.required = true;

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Vyber uživatele --";
    select.appendChild(defaultOption);

    Object.values(users).forEach(u => {
        const option = document.createElement("option");
        option.value = u.ID;
        option.textContent = u.name;

        if (saved == u.ID) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    fs.appendChild(select);
    usersDiv.appendChild(fs);
}

function renderDrinks(drinks) {
    const fs = document.createElement("fieldset");
    fs.innerHTML = "<legend>Nápoje</legend>";

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
        row.querySelector(".plus").addEventListener("click", () => {
            input.value = parseInt(input.value) + 1;
        });
        row.querySelector(".minus").addEventListener("click", () => {
            input.value = Math.max(0, parseInt(input.value) - 1);
        });

        fs.appendChild(row);
    });

    drinksDiv.appendChild(fs);
}

    const users = await api("getPeopleList");
    const drinks = await api("getTypesList");

    renderUsers(users);
    renderDrinks(drinks);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const user = new FormData(form).get("user");
        saveUser(user);

        const drinksArr = [];
        document.querySelectorAll("input[type='number']").forEach(input => {
            drinksArr.push({
                type: input.dataset.type,
                value: parseInt(input.value)
            });
        });

        const payload = {
            user: user,
            drinks: drinksArr
        };

        output.textContent = "Odesílám...";

        try {
            await fetch(`${API_URL}?cmd=saveDrinks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            output.textContent = "Uloženo ✔";
            form.reset();
        } catch {
            output.textContent = "Chyba při odesílání";
        }
    });
});