let binders = JSON.parse(localStorage.getItem("binders")) || [];

let currentBinder = null;
let editingCard = null;
let orderMode = false;

// Attempt to save data and catch storage errors if they occur
function saveData() {
    try {
        localStorage.setItem("binders", JSON.stringify(binders));
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            alert("Storage is full! Please delete some cards or upload smaller images.");
        } else {
            console.error("Failed to save data:", e);
        }
    }
}

// Automatically resizes and compresses image to save local storage space
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Scale image down to maximum width of 300px while keeping aspect ratio
            const MAX_WIDTH = 300;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG format with 60% quality (reduces size drastically)
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
            callback(compressedBase64);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function isLightColor(hex) {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
}

function renderBinders() {
    const list = document.getElementById("binderList");
    list.innerHTML = "";

    binders.forEach((binder, index) => {
        const owned = binder.cards.filter(c => c.qty > 0).length;
        const total = binder.cards.length;

        const div = document.createElement("div");
        const complete = total > 0 && owned === total;
        div.className = complete ? "binder complete" : "binder";

        const textColor = isLightColor(binder.color) ? "#000" : "#fff";
        div.style.background = binder.color;

        div.innerHTML = `
            <div class="binder-actions">
                <button class="binder-action edit-binder" onclick="event.stopPropagation(); editBinder(${index})">✎</button>
                <button class="binder-action delete-binder" onclick="event.stopPropagation(); deleteBinder(${index})">🗑</button>
            </div>
            <div class="binder-content" style="color:${textColor}">
                <h3>${binder.name}</h3>
                <p>${owned}/${total}</p>
                ${owned === total && total > 0 ? '<div class="binder-trophy">🏆</div>' : ''}
            </div>
        `;

        div.onclick = () => openBinder(index);
        list.appendChild(div);
    });
}

function openBinderModal() {
    editingBinder = null;
    document.getElementById("binderName").value = "";
    document.getElementById("binderColor").value = "#222222";
    document.querySelector("#binderDialog h2").textContent = "Create Binder";
    binderDialog.showModal();
}

let editingBinder = null;
function createBinder() {
    const name = document.getElementById("binderName").value.trim();
    const color = document.getElementById("binderColor").value;
    if (!name) return;
    finishCreateBinder(name, color);
}

function finishCreateBinder(name, color) {
    if (editingBinder !== null) {
        binders[editingBinder].name = name;
        binders[editingBinder].color = color;
    } else {
        binders.push({
            name,
            color,
            cards: [],
            sets: [] // Ensure sets is initialized
        });
    }

    saveData();
    renderBinders();
    binderDialog.close();

    document.getElementById("binderName").value = "";
    document.getElementById("binderColor").value = "#222222";
    editingBinder = null;
}

function editBinder(index) {
    editingBinder = index;
    const binder = binders[index];
    document.getElementById("binderName").value = binder.name;
    document.getElementById("binderColor").value = binder.color || "#222222";
    document.querySelector("#binderDialog h2").textContent = "Edit Binder";
    binderDialog.showModal();
}

function deleteBinder(index) {
    const binder = binders[index];
    const confirmed = confirm(
        `Are you sure you want to delete "${binder.name}"?\n\nAll cards inside this binder will be permanently deleted.`
    );
    if (!confirmed) return;

    binders.splice(index, 1);
    saveData();
    renderBinders();
}

function deleteCard(index) {
    const card = binders[currentBinder].cards[index];
    const confirmed = confirm(`Delete "${card.name}"?\n\nThis card will be permanently removed.`);
    if (!confirmed) return;

    binders[currentBinder].cards.splice(index, 1);
    saveData();
    renderCards();
}

function openBinder(index) {
    currentBinder = index;
    document.getElementById("homePage").classList.add("hidden");
    document.getElementById("binderPage").classList.remove("hidden");
    document.getElementById("binderTitle").innerText = binders[index].name;

    // Ensure sets list is initialized for old data
    if (!binders[index].sets) {
        binders[index].sets = [];
    }

    refreshSetDropdown();
    renderCards();
}

function goBack() {
    document.getElementById("binderPage").classList.add("hidden");
    document.getElementById("homePage").classList.remove("hidden");
    renderBinders();
}

function createSet() {
    const name = document.getElementById("setName").value;
    if (!name) return;

    binders[currentBinder].sets.push(name);
    saveData();
    refreshSetDropdown();
    document.getElementById("setName").value = "";
    setDialog.close();
}

function refreshSetDropdown() {
    const select = document.getElementById("cardSet");
    select.innerHTML = "";
    
    binders[currentBinder].sets.forEach(set => {
        const option = document.createElement("option");
        option.value = set;
        option.textContent = set;
        select.appendChild(option);
    });
}

function openCardModal(cardIndex = null) {
    editingCard = cardIndex;
    document.getElementById("cardDialogTitle").innerText = cardIndex === null ? "Add Card" : "Edit Card";
    document.getElementById("cardImage").value = ""; // Reset file picker

    if (cardIndex !== null) {
        const card = binders[currentBinder].cards[cardIndex];
        document.getElementById("cardName").value = card.name;
        document.getElementById("cardSet").value = card.set;
        document.getElementById("cardNumber").value = card.number;
    } else {
        document.getElementById("cardName").value = "";
        document.getElementById("cardNumber").value = "";
    }

    cardDialog.showModal();
}

function saveCard() {
    const file = document.getElementById("cardImage").files[0];
    const name = document.getElementById("cardName").value;
    const set = document.getElementById("cardSet").value;
    const number = document.getElementById("cardNumber").value;

    if (!name) return;

    if (file) {
        // Automatically compress before finishing the save operation
        compressImage(file, function (compressedBase64) {
            finishSave(compressedBase64, name, set, number);
        });
    } else {
        let image = "";
        if (editingCard !== null) {
            image = binders[currentBinder].cards[editingCard].image;
        }
        finishSave(image, name, set, number);
    }
}

function finishSave(image, name, set, number) {
    const card = {
        image,
        name,
        set,
        number,
        qty: editingCard !== null ? binders[currentBinder].cards[editingCard].qty : 0
    };

    if (editingCard === null) {
        binders[currentBinder].cards.push(card);
    } else {
        binders[currentBinder].cards[editingCard] = card;
    }

    saveData();
    renderCards();
    cardDialog.close();
}

function renderCards() {
    const grid = document.getElementById("cardsGrid");
    grid.innerHTML = "";

    binders[currentBinder].cards.forEach((card, index) => {
        const div = document.createElement("div");
        div.className = orderMode ? "card ordering-card" : "card";
        div.draggable = orderMode;
        div.dataset.index = index;

        div.innerHTML = `
            ${!orderMode ? `<button class="delete-card" onclick="deleteCard(${index})">×</button>` : ''}
            ${card.qty > 0 ? '<div class="check">✓</div>' : ''}
            <div class="card-image">
                <img src="${card.image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 150 200\'%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'%23222\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23555\' dominant-baseline=\'middle\' text-anchor=\'middle\'%3ENo Image%3C/text%3E%3C/svg%3E'}" alt="${card.name}">
            </div>
            <h3>${card.name}</h3>
            <p>${card.set}</p>
            <p>${card.number}</p>
            ${card.qty > 0 ? `<div class="qty">Qty: ${card.qty}</div>` : ''}
            ${!orderMode ? `
                <div class="card-buttons">
                    ${card.qty > 0 ? `<button class="minus" onclick="changeQty(${index},-1)">-</button>` : ''}
                    <button class="plus" onclick="changeQty(${index},1)">+</button>
                    <button class="edit" onclick="openCardModal(${index})">✎</button>
                </div>
            ` : ''}
        `;

        addDragEvents(div);
        grid.appendChild(div);
    });
}

function changeQty(index, value) {
    const card = binders[currentBinder].cards[index];
    card.qty += value;
    if (card.qty < 0) {
        card.qty = 0;
    }
    saveData();
    renderCards();
}

function toggleOrder() {
    orderMode = !orderMode;
    const orderBtn = document.getElementById("orderBtn");

    if (orderMode) {
        orderBtn.textContent = "✓ Accept";
        orderBtn.classList.add("accept-btn");
    } else {
        orderBtn.textContent = "Order";
        orderBtn.classList.remove("accept-btn");
        saveData();
    }

    document.querySelector(".floating").style.display = orderMode ? "none" : "block";
    renderCards();
    document.getElementById("cardsGrid").classList.toggle("ordering", orderMode);
}

let dragIndex = null;

function addDragEvents(el) {
    el.addEventListener("dragstart", () => {
        if (!orderMode) return;
        dragIndex = Number(el.dataset.index);
        el.classList.add("dragging");
    });

    el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
    });

    el.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    el.addEventListener("drop", () => {
        if (!orderMode) return;
        const targetIndex = Number(el.dataset.index);
        const cards = binders[currentBinder].cards;
        const dragged = cards.splice(dragIndex, 1)[0];
        cards.splice(targetIndex, 0, dragged);
        saveData();
        renderCards();
    });
}

renderBinders();