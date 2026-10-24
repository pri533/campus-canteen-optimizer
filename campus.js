"use strict";

// ---------- PAGE ELEMENTS ----------

const menuGrid = document.getElementById("menu-grid");
const menuSearch = document.getElementById("menu-search");
const filterButtons = document.querySelectorAll(".filter-button");
const foodCards = document.querySelectorAll("#menu-grid .food-card");
const noMenuResults = document.getElementById("no-menu-results");

const cartItems = document.getElementById("cart-items");
const emptyCartMessage = document.getElementById("empty-cart-message");
const cartItemCount = document.getElementById("cart-item-count");
const headerCartCount = document.getElementById("header-cart-count");
const cartTotal = document.getElementById("cart-total");
const cartFeedback = document.getElementById("cart-feedback");

// ---------- APPLICATION DATA ----------

// Stores available dishes using the data on each Add button.
// Later, this information will come from Spring Boot.
const menuItems = new Map();

document.querySelectorAll("#menu-grid .add-to-cart-button").forEach(
    function (button) {
        const id = button.dataset.id;
        const name = button.dataset.name;
        const price = Number(button.dataset.price);

        if (!id || !name || !Number.isFinite(price) || price < 0) {
            button.disabled = true;
            return;
        }

        menuItems.set(id, {
            id: id,
            name: name,
            price: price
        });
    }
);

// Each cart entry contains an item and its quantity.
const cart = new Map();

let selectedCategory = "all";

// Remembers which dropdowns were open before a search.
let savedDropdownStates = null;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
});

function formatPrice(amount) {
    return currencyFormatter.format(amount);
}

// ---------- ADD TO CART ----------

// One listener handles all menu Add buttons.
menuGrid.addEventListener("click", function (event) {
    const button = event.target.closest(".add-to-cart-button");

    if (!button || !menuGrid.contains(button) || button.disabled) {
        return;
    }

    const item = menuItems.get(button.dataset.id);

    if (!item) {
        return;
    }

    const existingItem = cart.get(item.id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.set(item.id, {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1
        });
    }

    renderCart();

    cartFeedback.textContent =
        `${item.name} added. Quantity: ${cart.get(item.id).quantity}.`;
});

// ---------- CREATE CART BUTTONS ----------

function createCartButton(text, action, item, accessibleLabel) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = action === "remove"
        ? "remove-item-button"
        : "quantity-button";

    button.textContent = text;
    button.dataset.action = action;
    button.dataset.id = item.id;
    button.setAttribute("aria-label", accessibleLabel);

    return button;
}

// ---------- DISPLAY CART ----------

function renderCart() {
    cartItems.replaceChildren();

    let totalQuantity = 0;
    let totalPrice = 0;

    cart.forEach(function (item) {
        totalQuantity += item.quantity;
        totalPrice += item.price * item.quantity;

        const row = document.createElement("li");
        row.className = "cart-item";

        const information = document.createElement("div");
        information.className = "cart-item-information";

        const name = document.createElement("h3");
        name.className = "cart-item-name";
        name.textContent = item.name;

        const unitPrice = document.createElement("p");
        unitPrice.className = "cart-unit-price";
        unitPrice.textContent = `${formatPrice(item.price)} each`;

        information.append(name, unitPrice);

        const controls = document.createElement("div");
        controls.className = "cart-item-controls";

        const quantityControls = document.createElement("div");
        quantityControls.className = "quantity-controls";
        quantityControls.setAttribute("role", "group");
        quantityControls.setAttribute(
            "aria-label",
            `Quantity for ${item.name}`
        );

        const decreaseButton = createCartButton(
            "−",
            "decrease",
            item,
            `Decrease quantity of ${item.name}`
        );

        const quantity = document.createElement("span");
        quantity.className = "quantity-value";
        quantity.textContent = item.quantity;

        const increaseButton = createCartButton(
            "+",
            "increase",
            item,
            `Increase quantity of ${item.name}`
        );

        quantityControls.append(
            decreaseButton,
            quantity,
            increaseButton
        );

        const lineTotal = document.createElement("strong");
        lineTotal.className = "cart-line-total";
        lineTotal.textContent = formatPrice(item.price * item.quantity);

        controls.append(quantityControls, lineTotal);

        const removeButton = createCartButton(
            "Remove",
            "remove",
            item,
            `Remove ${item.name} from tray`
        );

        row.append(information, controls, removeButton);
        cartItems.append(row);
    });

    const isEmpty = cart.size === 0;

    emptyCartMessage.hidden = !isEmpty;
    cartItems.hidden = isEmpty;

    cartItemCount.textContent = totalQuantity;
    headerCartCount.textContent = totalQuantity;
    headerCartCount.setAttribute(
        "aria-label",
        `${totalQuantity} ${totalQuantity === 1 ? "item" : "items"}`
    );

    cartTotal.textContent = formatPrice(totalPrice);
}

// ---------- CHANGE QUANTITY OR REMOVE ----------

cartItems.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");

    if (!button || !cartItems.contains(button)) {
        return;
    }

    const id = button.dataset.id;
    const action = button.dataset.action;
    const item = cart.get(id);

    if (!item) {
        return;
    }

    // Remember the position to restore keyboard focus after rendering.
    const oldPosition = Array.from(cart.keys()).indexOf(id);
    const itemName = item.name;

    if (action === "increase") {
        item.quantity += 1;
    } else if (action === "decrease") {
        item.quantity -= 1;

        if (item.quantity === 0) {
            cart.delete(id);
        }
    } else if (action === "remove") {
        cart.delete(id);
    } else {
        return;
    }

    renderCart();

    if (cart.has(id)) {
        cartFeedback.textContent =
            `${itemName}: quantity ${cart.get(id).quantity}.`;
    } else {
        cartFeedback.textContent = `${itemName} removed from your tray.`;
    }

    restoreCartFocus(id, action, oldPosition);
});

function restoreCartFocus(id, action, oldPosition) {
    const buttons = Array.from(
        cartItems.querySelectorAll("button[data-action]")
    );

    const matchingButton = buttons.find(function (button) {
        return button.dataset.id === id &&
               button.dataset.action === action;
    });

    if (matchingButton) {
        matchingButton.focus();
        return;
    }

    // If the item was removed, focus a neighbouring cart item.
    const remainingRows = cartItems.querySelectorAll(".cart-item");

    if (remainingRows.length > 0) {
        const nextPosition = Math.min(
            oldPosition,
            remainingRows.length - 1
        );

        remainingRows[nextPosition].querySelector("button").focus();
    } else {
        // If the cart is empty, return focus to the item's Add button.
        const addButton = Array.from(
            menuGrid.querySelectorAll(".add-to-cart-button")
        ).find(function (button) {
            return button.dataset.id === id;
        });

        const card = addButton?.closest(".food-card");
        const variant = addButton?.closest(".variant-item");

        if (addButton && !card.hidden && !variant.hidden) {
            addButton.closest("details").open = true;
            addButton.focus();
        } else {
            menuSearch.focus();
        }
    }
}

// ---------- SEARCH AND CATEGORY FILTERS ----------

function normalizeText(text) {
    return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function filterMenu() {
    const searchText = normalizeText(menuSearch.value);
    let visibleCardCount = 0;

    // Save dropdown state when searching begins.
    if (searchText && savedDropdownStates === null) {
        savedDropdownStates = new Map();

        foodCards.forEach(function (card) {
            const dropdown = card.querySelector(".food-options");
            savedDropdownStates.set(dropdown, dropdown.open);
        });
    }

    foodCards.forEach(function (card) {
        const categoryMatches =
            selectedCategory === "all" ||
            card.dataset.category === selectedCategory;

        const title = normalizeText(
            card.querySelector("h3").textContent
        );

        const titleMatches = title.includes(searchText);
        const variants = card.querySelectorAll(".variant-item");
        const dropdown = card.querySelector(".food-options");

        let matchingVariantCount = 0;

        variants.forEach(function (variant) {
            const itemName = normalizeText(
                variant.querySelector("h4").textContent
            );

            const matches =
                searchText === "" ||
                titleMatches ||
                itemName.includes(searchText);

            variant.hidden = !matches;

            if (matches) {
                matchingVariantCount += 1;
            }
        });

        const showCard = categoryMatches && matchingVariantCount > 0;

        card.hidden = !showCard;

        if (showCard) {
            visibleCardCount += 1;
        }

        // Open matching dropdowns to reveal search results.
        if (searchText) {
            dropdown.open = showCard;
        } else if (savedDropdownStates !== null) {
            dropdown.open = savedDropdownStates.get(dropdown);
        }

        const countLabel = card.querySelector(".options-count");

        countLabel.textContent = searchText
            ? `${matchingVariantCount} found`
            : `${variants.length} varieties`;
    });

    noMenuResults.hidden = visibleCardCount > 0;

    if (!searchText) {
        savedDropdownStates = null;
    }
}

menuSearch.addEventListener("input", filterMenu);

filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        selectedCategory = button.dataset.category;

        filterButtons.forEach(function (filterButton) {
            const isSelected = filterButton === button;

            filterButton.classList.toggle("active", isSelected);
            filterButton.setAttribute(
                "aria-pressed",
                String(isSelected)
            );
        });

        filterMenu();
    });
});

// ---------- INITIAL DISPLAY ----------

renderCart();
filterMenu();