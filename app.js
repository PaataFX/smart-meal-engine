/* ==========================================================================
   0. FIREBASE ინტეგრაცია
   ========================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, writeBatch, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAYRhbFU5iw7TmUomzlipDngxvTACOVU80",
    authDomain: "smart-meal-engine.firebaseapp.com",
    projectId: "smart-meal-engine",
    storageBucket: "smart-meal-engine.firebasestorage.app",
    messagingSenderId: "408030080120",
    appId: "1:408030080120:web:424c76cdbdc367f732918d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const mealsCollection = collection(db, "meals");

/* ==========================================================================
   1. კატეგორიები, ინგრედიენტები და ლოკალური მეხსიერება
   ========================================================================== */
const CATEGORIES = {
    main: { icon: '🍲', title: 'ძირითადი' },
    soup: { icon: '🥣', title: 'წვნიანი' },
    salad: { icon: '🥗', title: 'სალათი' },
    cold: { icon: '🌿', title: 'ფხალეული' },
    bakery: { icon: '🥐', title: 'ცომეული' },
    garnish: { icon: '🍚', title: 'გარნირი' },
    sauce: { icon: '🥣', title: 'საწებელი' },
    dessert: { icon: '🍰', title: 'დესერტი' },
    extra: { icon: '🧀', title: 'დანამატი' }
};

const ADMIN_PIN = '62442';
const ALL_INGREDIENTS = ['ქათამი', 'კარტოფილი', 'ყველი', 'სულგუნი', 'კვერცხი', 'პომიდორი', 'კიტრი', 'ფარში', 'სოკო', 'ლობიო', 'ბრინჯი', 'მაკარონი', 'ნიგოზი', 'ბადრიჯანი', 'ისპანახი', 'ტუნა', 'კომბოსტო', 'სტაფილო', 'ჭარხალი', 'ნაღები', 'ბულგარული', 'მწვანილი', 'ნიორი', 'ხახვი', 'ცომი', 'ხორცი', 'ბაზილიკი', 'მაიონეზი', 'ზეთი', 'კარაქი'];

// LocalStorage-დან მონაცემების ამოღება
let userInventory = JSON.parse(localStorage.getItem('smartMealInventory')) || [];
let favoriteMeals = JSON.parse(localStorage.getItem('smartMealFavs')) || [];
let historySpins = JSON.parse(localStorage.getItem('smartMealHistory')) || [];
let mealData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadDataFromFirebase();
    renderIngredients();
    renderCustomCounters();
    populateAdminDropdown();
    setupEventListeners();
});

function loadDataFromFirebase() {
    onSnapshot(mealsCollection, (snapshot) => {
        mealData = [];
        snapshot.forEach((doc) => { mealData.push({ id: doc.id, ...doc.data() }); });
        if (mealData.length === 0) seedInitialData();
    });
}

async function seedInitialData() {
    try {
        const response = await fetch('meals.json');
        if (!response.ok) throw new Error("meals.json ვერ მოიძებნა!");
        const initialMeals = await response.json();
        const batch = writeBatch(db);
        initialMeals.forEach((meal) => { batch.set(doc(collection(db, "meals")), meal); });
        await batch.commit();
        console.log("✅ JSON მონაცემები აიტვირთა Firebase-ში!");
    } catch (error) { console.error("❌ შეცდომა JSON-ის ატვირთვისას:", error); }
}

/* ==========================================================================
   2. UI რენდერი (მაცივარი და მთვლელები)
   ========================================================================== */
function renderIngredients() {
    const container = document.getElementById('ingredient-list');
    container.innerHTML = '';
    ALL_INGREDIENTS.forEach(ing => {
        const chip = document.createElement('span');
        chip.className = `chip ${userInventory.includes(ing) ? 'active' : ''}`;
        chip.textContent = ing;
        chip.onclick = () => {
            toggleIngredient(ing, chip);
            localStorage.setItem('smartMealInventory', JSON.stringify(userInventory));
        };
        container.appendChild(chip);
    });
}

function toggleIngredient(ing, element) {
    if (userInventory.includes(ing)) {
        userInventory = userInventory.filter(i => i !== ing);
        element.classList.remove('active');
    } else {
        userInventory.push(ing);
        element.classList.add('active');
    }
}

function renderCustomCounters() {
    const container = document.getElementById('custom-counters-container');
    const template = document.getElementById('counter-template');
    if(!container || !template) return;
    
    container.innerHTML = '';
    for (const [key, data] of Object.entries(CATEGORIES)) {
        const node = template.content.cloneNode(true);
        const itemDiv = node.querySelector('.counter-item');
        const input = node.querySelector('.counter-input');
        
        itemDiv.dataset.category = key;
        node.querySelector('.counter-label').innerHTML = `${data.icon} ${data.title}`;
        if(key === 'main' || key === 'salad') input.value = 1;

        node.querySelector('.minus').onclick = () => { if(input.value > 0) input.value = parseInt(input.value) - 1; };
        node.querySelector('.plus').onclick = () => { if(input.value < 5) input.value = parseInt(input.value) + 1; };
        container.appendChild(node);
    }
}

function populateAdminDropdown() {
    const select = document.getElementById('dish-category');
    select.innerHTML = '';
    for (const [key, data] of Object.entries(CATEGORIES)) { select.innerHTML += `<option value="${key}">${data.icon} ${data.title}</option>`; }
}

/* ==========================================================================
   3. ჭკვიანი ფილტრები და რენდომაიზერი
   ========================================================================== */
function getFilteredMeals(category) {
    let filtered = mealData.filter(m => m.category === category);
    
    // დროის ფილტრი (< 30 წთ)
    if(document.getElementById('filter-time').checked) {
        filtered = filtered.filter(m => {
            const timeStr = m.time?.total || "";
            return !timeStr.includes("სთ") || timeStr === "1 სთ"; 
        });
    }
    // სირთულის ფილტრი (მარტივი ან ნახევარფაბრიკატი)
    if(document.getElementById('filter-easy').checked) {
        filtered = filtered.filter(m => m.difficulty === 'easy' || m.hasReadyMade === true);
    }
    
    return filtered;
}

function spinCombo(preset) {
    const container = document.getElementById('categories-container');
    container.innerHTML = ''; 
    document.getElementById('dissonance-alert-container').innerHTML = '';
    document.getElementById('share-menu-container').classList.add('hidden');

    let request = {};
    if (preset === 'quick') request = { main: 1, salad: 1 };
    else if (preset === 'date') request = { main: 1, salad: 1, dessert: 1, extra: 1 };
    else if (preset === 'feast') request = { main: 2, salad: 2, cold: 1, garnish: 1, sauce: 1, dessert: 1 };
    else if (preset === 'custom') {
        document.querySelectorAll('.counter-item').forEach(item => {
            const count = parseInt(item.querySelector('.counter-input').value);
            if(count > 0) request[item.dataset.category] = count;
        });
        if(Object.keys(request).length === 0) return alert("გთხოვთ, მიუთითოთ მინიმუმ 1 კერძის რაოდენობა (+ ღილაკით)");
    }

    let usedMeals = new Set();
    let comboResult = [];
    const categoriesToSpin = Object.keys(request).sort((a, b) => a === 'main' ? -1 : 1);

    categoriesToSpin.forEach(cat => {
        const count = request[cat];
        let itemsInCategory = getFilteredMeals(cat);
        // თუ ფილტრმა ყველა გააქრო, ვიღებთ ჩვეულებრივ სიას (Fallback)
        if(itemsInCategory.length === 0) itemsInCategory = mealData.filter(m => m.category === cat);

        for(let i = 0; i < count; i++) {
            let available = itemsInCategory.filter(m => !usedMeals.has(m.id));
            if(available.length === 0) available = itemsInCategory;
            
            const pick = available[Math.floor(Math.random() * available.length)];
            usedMeals.add(pick.id);
            comboResult.push(pick);
            createAndSpinCard(cat, pick, i + 1, count > 1);
        }
    });

    // სინერგიის (კუჭის სიმძიმის) შემოწმება
    checkDissonance(comboResult);
    
    // ისტორიაში შენახვა და გაზიარების ღილაკის გამოჩენა
    if(comboResult.length > 0) {
        historySpins.unshift({ date: new Date().toLocaleString(), meals: comboResult });
        if(historySpins.length > 5) historySpins.pop(); // ვინახავთ მხოლოდ ბოლო 5-ს
        localStorage.setItem('smartMealHistory', JSON.stringify(historySpins));
        
        document.getElementById('share-menu-container').classList.remove('hidden');
        document.getElementById('share-menu-btn').onclick = () => {
            const text = "დღევანდელი მენიუ:\n" + comboResult.map(m => `👉 ${m.name}`).join('\n');
            navigator.clipboard.writeText(text);
            alert("მენიუ დაკოპირდა გასაზიარებლად!");
        };
    }
}

function checkDissonance(combo) {
    let allSynergies = combo.flatMap(m => m.synergyTags || []);
    let msg = "";
    
    if(allSynergies.includes("თევზი") && allSynergies.includes("რძე")) {
        msg = "ყურადღება: თევზი და რძის პროდუქტები კუჭისთვის მძიმე კომბინაციაა.";
    } else if(allSynergies.filter(t => t === "მძიმე").length >= 2) {
        msg = "ყურადღება: შერჩეულია რამდენიმე მძიმე კერძი, გირჩევთ დაამატოთ მსუბუქი სალათი.";
    }
    
    if(msg) {
        document.getElementById('dissonance-alert-container').innerHTML = `
            <div class="dissonance-alert">
                <i class="fa-solid fa-triangle-exclamation"></i> ${msg}
            </div>`;
    }
}

/* ==========================================================================
   4. ბარათების გენერაცია და სლოტ-ანიმაცია
   ========================================================================== */
function createAndSpinCard(category, finalItem, index, showIndex) {
    const container = document.getElementById('categories-container');
    const template = document.getElementById('meal-card-template');
    const cardNode = template.content.cloneNode(true);
    
    const article = cardNode.querySelector('article');
    article.classList.add('loading'); // ვრთავთ Skeleton-ს
    
    cardNode.querySelector('.category-title').innerHTML = `${CATEGORIES[category].icon} ${CATEGORIES[category].title} ${showIndex ? `<span style="font-size:0.8rem; opacity:0.6">#${index}</span>` : ''}`;
    
    // რჩეულების (გულის) ღილაკის ლოგიკა
    const favBtn = cardNode.querySelector('.fav-card-btn');
    if(favoriteMeals.some(m => m.id === finalItem.id)) favBtn.classList.add('saved');
    
    favBtn.onclick = (e) => {
        e.stopPropagation(); // ხელს ვუშლით მოდალის გახსნას
        if(favBtn.classList.contains('saved')) {
            favoriteMeals = favoriteMeals.filter(m => m.id !== finalItem.id);
            favBtn.classList.remove('saved');
        } else {
            favoriteMeals.push(finalItem);
            favBtn.classList.add('saved');
        }
        localStorage.setItem('smartMealFavs', JSON.stringify(favoriteMeals));
    };

    container.appendChild(cardNode);
    runSlotAnimation(category, article, finalItem);
}

function runSlotAnimation(category, article, finalItem) {
    const resultEl = article.querySelector('.result-placeholder');
    const allNames = mealData.filter(m => m.category === category).map(m => m.name);
    if(allNames.length === 0) return resultEl.textContent = 'ცარიელია';

    let ticks = 0;
    const interval = setInterval(() => {
        resultEl.textContent = allNames[Math.floor(Math.random() * allNames.length)];
        ticks++;
        if(ticks >= 20) {
            clearInterval(interval);
            finishCardSetup(article, finalItem, resultEl);
        }
    }, 50); 
}

function finishCardSetup(article, item, resultEl) {
    resultEl.textContent = item.name;
    article.classList.remove('loading'); // ვთიშავთ Skeleton-ს
    article.classList.add('has-result');
    article.querySelector('.card-bg-overlay').style.backgroundImage = `url('${item.image}')`;
    
    // პროცენტული ბარის დათვლა
    let hasCount = 0;
    if(item.ingredients && item.ingredients.length > 0) {
        item.ingredients.forEach(ing => { if(userInventory.includes(ing)) hasCount++; });
        const percent = Math.round((hasCount / item.ingredients.length) * 100);
        setTimeout(() => { article.querySelector('.progress-bar-fill').style.width = `${percent}%`; }, 500);
    }

    // თეგების და კალორიების დამატება ბარათზე
    const tagsHtml = (item.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');
    const kcalTag = item.kcal ? `<span class="tag" style="color:#FFB74D; border-color:#FFB74D"><i class="fa-solid fa-fire"></i> ${item.kcal}</span>` : '';
    
    article.querySelector('.card-tags').innerHTML = tagsHtml + kcalTag;
    article.querySelector('.meal-meta').innerHTML = `
        <span><i class="fa-solid fa-clock"></i> ${item.time?.total || '-'}</span>
        <span><i class="fa-solid fa-wallet"></i> ${item.price || '$$'}</span>
    `;
    article.querySelector('.meal-meta-container').classList.add('visible');
    
    // ღილაკების Event-ები
    article.onclick = (e) => { if(!e.target.closest('button')) openDetailModal(item); };
    article.querySelector('.remove-card-btn').onclick = (e) => { e.stopPropagation(); article.remove(); };
    article.querySelector('.btn-spin-single').onclick = (e) => {
        e.stopPropagation();
        article.classList.remove('has-result');
        article.classList.add('loading');
        article.querySelector('.meal-meta-container').classList.remove('visible');
        article.querySelector('.progress-bar-fill').style.width = '0%';
        const available = getFilteredMeals(item.category);
        runSlotAnimation(item.category, article, available[Math.floor(Math.random() * available.length)]);
    };
}

/* ==========================================================================
   5. მოდალები (Click-Outside, საყიდლების კოპირება, "რა მოვამზადო")
   ========================================================================== */
function openDetailModal(item) {
    const modal = document.getElementById('meal-detail-modal');
    const body = document.getElementById('meal-detail-body');
    const storeToggle = document.getElementById('store-toggle').checked;
    
    let missing = item.ingredients ? item.ingredients.filter(ing => !userInventory.includes(ing)) : [];
    
    // 1-Click Copy ღილაკი საყიდლებისთვის
    let shopBtn = '';
    if (missing.length > 0) {
        shopBtn = `<button class="btn-outline btn-small" id="copy-shop-btn" data-list="საყიდელია: ${missing.join(', ')}"><i class="fa-solid fa-copy"></i> სიის კოპირება</button>`;
    }

    let badges = (item.ingredients || []).map(ing => {
        return userInventory.includes(ing) 
            ? `<span class="ing-badge ing-has"><i class="fa-solid fa-check"></i> ${ing}</span>` 
            : `<span class="ing-badge ing-missing"><i class="fa-solid fa-xmark"></i> ${ing}</span>`;
    }).join('');

    body.innerHTML = `
        <div class="meal-image-header" style="background-image: url('${item.image || ''}')"><div class="meal-image-overlay"></div></div>
        <div class="meal-detail-body">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                <h2 style="margin:0;">${item.name}</h2>
                ${shopBtn}
            </div>
            <div class="detail-meta">
                <span><i class="fa-solid fa-clock"></i> ${item.time?.total || '-'}</span>
                <span><i class="fa-solid fa-fire"></i> ${item.kcal || '-'}</span>
            </div>
            ${badges ? `<div class="smart-ingredients-list">${badges}</div>` : ''}
        </div>`;
    
    modal.showModal();

    const copyBtn = document.getElementById('copy-shop-btn');
    if(copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(copyBtn.dataset.list);
            copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> დაკოპირდა!`;
            setTimeout(() => { copyBtn.innerHTML = `<i class="fa-solid fa-copy"></i> სიის კოპირება`; }, 2000);
        };
    }
}

// "რა მოვამზადო?" ალგორითმი
function findMatchingMeals() {
    const storeToggle = document.getElementById('store-toggle').checked;
    const body = document.getElementById('smart-recipes-body');
    const modal = document.getElementById('smart-recipes-modal');
    
    let perfectMatches = [];
    let closeMatches = [];

    mealData.forEach(meal => {
        if (!meal.ingredients || meal.ingredients.length === 0) return;
        const missing = meal.ingredients.filter(ing => !userInventory.includes(ing));

        if (missing.length === 0) perfectMatches.push(meal);
        else if (missing.length <= 2 && storeToggle) closeMatches.push({ meal, missing });
    });

    let html = '';
    if (perfectMatches.length === 0 && closeMatches.length === 0) {
        html = `<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">თქვენს მაცივარში არსებული ინგრედიენტებით სრულფასოვანი კერძი ვერ მოიძებნა.</p>`;
    } else {
        if (perfectMatches.length > 0) {
            html += `<h3 class="smart-section-title perfect"><i class="fa-solid fa-circle-check"></i> ახლავე შეგიძლიათ მოამზადოთ:</h3><div class="sug-list">`;
            perfectMatches.forEach(m => { html += `<div class="recipe-sug-card" data-id="${m.id}"><img src="${m.image}" class="recipe-sug-img"><div class="recipe-sug-info"><h4>${m.name}</h4><span style="color:var(--text-muted); font-size:0.85rem;">ყველა ინგრედიენტი გაქვთ!</span></div></div>`; });
            html += `</div>`;
        }
        if (storeToggle && closeMatches.length > 0) {
            html += `<h3 class="smart-section-title close"><i class="fa-solid fa-person-walking"></i> აკლია 1-2 ინგრედიენტი:</h3><div class="sug-list">`;
            closeMatches.forEach(item => { html += `<div class="recipe-sug-card" data-id="${item.meal.id}"><img src="${item.meal.image}" class="recipe-sug-img"><div class="recipe-sug-info"><h4>${item.meal.name}</h4><span class="recipe-sug-missing">საყიდელია: ${item.missing.join(', ')}</span></div></div>`; });
            html += `</div>`;
        }
    }

    body.innerHTML = html;
    modal.showModal();

    body.querySelectorAll('.recipe-sug-card').forEach(card => {
        card.addEventListener('click', () => {
            const meal = mealData.find(m => m.id === card.dataset.id);
            if(meal) { modal.close(); openDetailModal(meal); }
        });
    });
}

function showListModal(title, itemsArray) {
    const modal = document.getElementById('list-modal');
    document.getElementById('list-modal-title').textContent = title;
    
    let html = '<div class="sug-list">';
    if(itemsArray.length === 0) html += '<p style="color:var(--text-muted); text-align:center;">სია ცარიელია</p>';
    
    itemsArray.forEach(m => {
        html += `<div class="recipe-sug-card" data-id="${m.id}"><img src="${m.image}" class="recipe-sug-img"><div class="recipe-sug-info"><h4>${m.name}</h4><span style="color:var(--text-muted); font-size:0.85rem;"><i class="fa-solid fa-clock"></i> ${m.time?.total || '-'}</span></div></div>`;
    });
    html += '</div>';
    
    document.getElementById('list-modal-body').innerHTML = html;
    modal.showModal();

    document.querySelectorAll('.recipe-sug-card').forEach(card => {
        card.onclick = () => { modal.close(); openDetailModal(mealData.find(m => m.id === card.dataset.id)); };
    });
}

/* ==========================================================================
   6. Event Listeners (კლავიატურა და Click-outside)
   ========================================================================== */
function setupEventListeners() {
    // Space ღილაკით დატრიალება
    document.addEventListener('keydown', (e) => {
        if(e.code === 'Space' && !document.querySelector('dialog[open]')) {
            e.preventDefault();
            document.getElementById('spin-combo-btn').click();
        }
    });

    // მოდალების გარეთ (Click-outside) დახურვა
    document.querySelectorAll('dialog').forEach(dialog => {
        dialog.addEventListener('click', (event) => {
            const rect = dialog.getBoundingClientRect();
            // ვამოწმებთ, დაწკაპება მოხდა თუ არა ფანჯრის საზღვრებს გარეთ
            const isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
                                rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
            if (!isInDialog) { dialog.close(); }
        });
    });

    document.getElementById('find-meals-btn').addEventListener('click', findMatchingMeals);
    
    document.getElementById('clear-inventory-btn').addEventListener('click', () => {
        userInventory = [];
        localStorage.removeItem('smartMealInventory');
        renderIngredients();
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            if(e.target.dataset.preset === 'custom') document.getElementById('custom-combo-builder').classList.remove('hidden');
            else document.getElementById('custom-combo-builder').classList.add('hidden');
        });
    });

    document.getElementById('spin-combo-btn').addEventListener('click', () => {
        spinCombo(document.querySelector('.preset-btn.active').dataset.preset);
    });

    // Header-ის ღილაკები
    document.getElementById('favorites-btn').addEventListener('click', () => showListModal("❤️ ჩემი რჩეულები", favoriteMeals));
    document.getElementById('history-btn').addEventListener('click', () => {
        const flatHistory = historySpins.flatMap(h => h.meals);
        const uniqueHistory = [...new Map(flatHistory.map(m => [m.id, m])).values()]; // ვშლით დუბლიკატებს
        showListModal("🕒 ბოლო დატრიალებები", uniqueHistory);
    });

    const adminModal = document.getElementById('admin-modal');
    document.getElementById('admin-btn').addEventListener('click', () => adminModal.showModal());
    document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => { btn.addEventListener('click', () => adminModal.close()); });
    document.querySelector('.close-detail-modal').addEventListener('click', () => document.getElementById('meal-detail-modal').close());
    document.querySelector('.close-smart-modal').addEventListener('click', () => document.getElementById('smart-recipes-modal').close());

    document.getElementById('admin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (document.getElementById('admin-pin').value !== ADMIN_PIN) return alert('❌ არასწორი PIN კოდი!');
        
        const newMeal = {
            name: document.getElementById('dish-name').value, category: document.getElementById('dish-category').value,
            difficulty: document.getElementById('dish-difficulty').value, price: document.getElementById('dish-price').value, image: document.getElementById('dish-image').value,
            time: { active: document.getElementById('dish-time-active').value, total: document.getElementById('dish-time-total').value },
            kcal: document.getElementById('dish-kcal').value, tags: [], ingredients: document.getElementById('dish-ingredients').value.split(',').map(i => i.trim()),
        };
        try { await addDoc(mealsCollection, newMeal); alert('✅ კერძი წარმატებით დაემატა!'); adminModal.close(); e.target.reset(); } catch(err) { alert('❌ შეცდომა!'); }
    });
}
