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

const CATEGORIES = {
    main: { icon: '🍲', title: 'ძირითადი კერძები' },
    soup: { icon: '🥣', title: 'წვნიანები' },
    salad: { icon: '🥗', title: 'სალათები' },
    cold: { icon: '🌿', title: 'ფხალეული და ცივი' },
    bakery: { icon: '🥐', title: 'ცომეული' },
    garnish: { icon: '🍚', title: 'გარნირი' },
    sauce: { icon: '🥣', title: 'საწებელი' },
    dessert: { icon: '🍰', title: 'დესერტები' },
    extra: { icon: '🧀', title: 'დანამატი' }
};

const ADMIN_PIN = '62442';
const ALL_INGREDIENTS = ['ქათამი', 'კარტოფილი', 'ყველი', 'სულგუნი', 'კვერცხი', 'პომიდორი', 'კიტრი', 'ფარში', 'სოკო', 'ლობიო', 'ბრინჯი', 'მაკარონი', 'ნიგოზი', 'ბადრიჯანი', 'ისპანახი', 'ტუნა', 'კომბოსტო', 'სტაფილო', 'ჭარხალი', 'ნაღები', 'ბულგარული', 'მწვანილი', 'ნიორი', 'ხახვი', 'ცომი', 'ხორცი', 'ბაზილიკი', 'მაიონეზი', 'ზეთი', 'კარაქი'];

let userInventory = JSON.parse(localStorage.getItem('smartMealInventory')) || [];
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
    } catch (error) { console.error("შეცდომა JSON-ის ატვირთვისას:", error); }
}

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

function findMatchingMeals() {
    const storeToggle = document.getElementById('store-toggle').checked;
    const body = document.getElementById('smart-recipes-body');
    const modal = document.getElementById('smart-recipes-modal');
    
    let perfectMatches = [];
    let closeMatches = [];

    mealData.forEach(meal => {
        if (!meal.ingredients || meal.ingredients.length === 0) return;
        const missing = meal.ingredients.filter(ing => !userInventory.includes(ing));

        if (missing.length === 0) {
            perfectMatches.push(meal);
        } else if (missing.length <= 2 && storeToggle) {
            closeMatches.push({ meal, missing });
        }
    });

    let html = '';
    if (perfectMatches.length === 0 && closeMatches.length === 0) {
        html = `<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">თქვენს მაცივარში არსებული ინგრედიენტებით სრულფასოვანი კერძი ვერ მოიძებნა.</p>`;
    } else {
        if (perfectMatches.length > 0) {
            html += `<h3 class="smart-section-title perfect"><i class="fa-solid fa-circle-check"></i> ახლავე შეგიძლიათ მოამზადოთ:</h3><div class="sug-list">`;
            perfectMatches.forEach(m => {
                html += `<div class="recipe-sug-card" data-id="${m.id}"><img src="${m.image}" class="recipe-sug-img"><div class="recipe-sug-info"><h4>${m.name}</h4><span style="color:var(--text-muted); font-size:0.85rem;">ყველა ინგრედიენტი გაქვთ!</span></div></div>`;
            });
            html += `</div>`;
        }
        if (storeToggle && closeMatches.length > 0) {
            html += `<h3 class="smart-section-title close"><i class="fa-solid fa-person-walking"></i> აკლია 1-2 ინგრედიენტი:</h3><div class="sug-list">`;
            closeMatches.forEach(item => {
                html += `<div class="recipe-sug-card" data-id="${item.meal.id}"><img src="${item.meal.image}" class="recipe-sug-img"><div class="recipe-sug-info"><h4>${item.meal.name}</h4><span class="recipe-sug-missing">საყიდელია: ${item.missing.join(', ')}</span></div></div>`;
            });
            html += `</div>`;
        }
    }

    body.innerHTML = html;
    modal.showModal();

    body.querySelectorAll('.recipe-sug-card').forEach(card => {
        card.addEventListener('click', () => {
            const meal = mealData.find(m => m.id === card.dataset.id);
            if(meal) openDetailModal(meal);
        });
    });
}

function renderCustomCounters() {
    const container = document.getElementById('custom-counters-container');
    const template = document.getElementById('counter-template');
    if(!container || !template) return;
    
    container.innerHTML = '';
    for (const [key, data] of Object.entries(CATEGORIES)) {
        const node = template.content.cloneNode(true);
        const itemDiv = node.querySelector('.counter-item');
        const label = node.querySelector('.counter-label');
        const input = node.querySelector('.counter-input');
        
        itemDiv.dataset.category = key;
        label.innerHTML = `${data.icon} ${data.title}`;
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

function spinCombo(preset) {
    const container = document.getElementById('categories-container');
    container.innerHTML = ''; 

    let request = {};
    if (preset === 'quick') request = { main: 1, salad: 1 };
    else if (preset === 'date') request = { main: 1, salad: 1, dessert: 1, extra: 1 };
    else if (preset === 'feast') request = { main: 2, soup: 1, salad: 2, cold: 1, garnish: 1, sauce: 1, dessert: 1 };
    else if (preset === 'custom') {
        document.querySelectorAll('.counter-item').forEach(item => {
            const cat = item.dataset.category;
            const count = parseInt(item.querySelector('.counter-input').value);
            if(count > 0) request[cat] = count;
        });
        if(Object.keys(request).length === 0) return alert("გთხოვთ, მიუთითოთ მინიმუმ 1 კერძის რაოდენობა (+ ღილაკით)");
    }

    let usedMeals = new Set();
    let anchorTags = [];
    const categoriesToSpin = Object.keys(request).sort((a, b) => a === 'main' ? -1 : 1);

    categoriesToSpin.forEach(cat => {
        const count = request[cat];
        const itemsInCategory = mealData.filter(m => m.category === cat);
        
        for(let i = 0; i < count; i++) {
            let available = itemsInCategory.filter(m => !usedMeals.has(m.id));
            if(available.length === 0) available = itemsInCategory; 

            let weighted = [];
            available.forEach(item => {
                let weight = 10;
                let tags = item.tags || [];
                if (anchorTags.includes('ცომეული') && tags.includes('ცომეული')) weight = 1;
                if (anchorTags.includes('ხორციანი') && tags.includes('ხორციანი')) weight = 2;
                if (anchorTags.includes('მძიმე') && tags.includes('მსუბუქი')) weight = 30;
                for (let w = 0; w < weight; w++) weighted.push(item);
            });

            if (weighted.length === 0) continue;
            
            const pick = weighted[Math.floor(Math.random() * weighted.length)];
            usedMeals.add(pick.id); 
            
            if(cat === 'main' && anchorTags.length === 0) anchorTags = pick.tags || [];
            createAndSpinCard(cat, pick, i + 1, count > 1); 
        }
    });
}

function createAndSpinCard(category, finalItem, index, showIndex) {
    const container = document.getElementById('categories-container');
    const template = document.getElementById('meal-card-template');
    const cardNode = template.content.cloneNode(true);
    
    const article = cardNode.querySelector('article');
    const titleEl = cardNode.querySelector('.category-title');
    const resultEl = cardNode.querySelector('.result-placeholder');
    const metaEl = cardNode.querySelector('.meal-meta');
    const bgOverlay = cardNode.querySelector('.card-bg-overlay');
    
    const catData = CATEGORIES[category];
    titleEl.innerHTML = `${catData.icon} ${catData.title} ${showIndex ? `<span style="font-size:0.8rem; opacity:0.6">#${index}</span>` : ''}`;
    
    container.appendChild(cardNode);
    runSlotAnimation(category, article, finalItem, resultEl, metaEl, bgOverlay);

    cardNode.querySelector('.remove-card-btn').addEventListener('click', (e) => { e.stopPropagation(); article.remove(); });
    cardNode.querySelector('.btn-spin-single').addEventListener('click', (e) => {
        e.stopPropagation();
        article.classList.remove('has-result');
        bgOverlay.style.backgroundImage = 'none';
        metaEl.classList.remove('visible');
        
        const available = mealData.filter(m => m.category === category);
        const newPick = available[Math.floor(Math.random() * available.length)];
        runSlotAnimation(category, article, newPick, resultEl, metaEl, bgOverlay);
    });
}

function runSlotAnimation(category, article, finalItem, resultEl, metaEl, bgOverlay) {
    const allNames = mealData.filter(m => m.category === category).map(m => m.name);
    if(allNames.length === 0) return resultEl.textContent = 'ცარიელია';

    let ticks = 0;
    const maxTicks = 15 + Math.floor(Math.random() * 10); 
    
    const interval = setInterval(() => {
        resultEl.textContent = allNames[Math.floor(Math.random() * allNames.length)];
        ticks++;
        if(ticks >= maxTicks) {
            clearInterval(interval);
            resultEl.textContent = finalItem.name;
            article.classList.add('has-result');
            if(finalItem.image) bgOverlay.style.backgroundImage = `url('${finalItem.image}')`;
            
            metaEl.innerHTML = `<span><i class="fa-solid fa-clock"></i> ${finalItem.time?.active || '15 წთ'}</span>
                                <span><i class="fa-solid fa-wallet"></i> ${finalItem.price || '$$'}</span>`;
            metaEl.classList.add('visible');
            article.onclick = (e) => { if(!e.target.closest('button')) openDetailModal(finalItem); };
        }
    }, 60); 
}

// ახალი: ჭკვიანი ინგრედიენტების ჩვენება მოდალში
function openDetailModal(item) {
    const modal = document.getElementById('meal-detail-modal');
    const body = document.getElementById('meal-detail-body');
    const tagsHtml = (item.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');
    
    let missingIngredients = item.ingredients ? item.ingredients.filter(ing => !userInventory.includes(ing)) : [];
    let missingHtml = '';
    const storeToggle = document.getElementById('store-toggle');
    
    if (missingIngredients.length > 0 && (!storeToggle || !storeToggle.checked)) {
        missingHtml = `
            <div style="background: rgba(229, 115, 115, 0.1); border-left: 4px solid var(--accent-red); padding: 10px 15px; margin-top: 20px; border-radius: 4px;">
                <p style="color: var(--accent-red); margin: 0; font-size: 0.95rem;">
                    <i class="fa-solid fa-cart-shopping"></i> <strong>საყიდელი გაქვს:</strong> ${missingIngredients.join(', ')}
                </p>
            </div>`;
    }

    // ინგრედიენტების დინამიური ლისტი
    let smartIngredientsHtml = '';
    if (item.ingredients && item.ingredients.length > 0) {
        const badgesHtml = item.ingredients.map(ing => {
            const hasIng = userInventory.includes(ing);
            if(hasIng) {
                return `<span class="ing-badge ing-has"><i class="fa-solid fa-check"></i> ${ing}</span>`;
            } else {
                return `<span class="ing-badge ing-missing"><i class="fa-solid fa-xmark"></i> ${ing}</span>`;
            }
        }).join('');
        
        smartIngredientsHtml = `
            <div class="detail-ingredients">
                <h4><i class="fa-solid fa-basket-shopping"></i> ინგრედიენტები:</h4>
                <div class="smart-ingredients-list">
                    ${badgesHtml}
                </div>
            </div>`;
    }

    body.innerHTML = `
        <div class="meal-image-header" style="background-image: url('${item.image || ''}')"><div class="meal-image-overlay"></div></div>
        <div class="meal-detail-body">
            <h2>${item.name}</h2>
            <div class="detail-meta">
                <span><i class="fa-solid fa-clock"></i> ${item.time?.active || '-'} / ${item.time?.total || '-'}</span>
                <span><i class="fa-solid fa-fire"></i> ${item.difficulty === 'easy' ? 'მარტივი' : item.difficulty === 'hard' ? 'რთული' : 'საშუალო'}</span>
            </div>
            <div class="detail-tags">${tagsHtml}</div>
            ${smartIngredientsHtml}
            ${missingHtml}
        </div>`;
    modal.showModal();
}

function setupEventListeners() {
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
            
            const customPanel = document.getElementById('custom-combo-builder');
            if(e.target.dataset.preset === 'custom') customPanel.classList.remove('hidden');
            else customPanel.classList.add('hidden');
        });
    });

    document.getElementById('spin-combo-btn').addEventListener('click', () => {
        spinCombo(document.querySelector('.preset-btn.active').dataset.preset);
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
            difficulty: 'medium', price: document.getElementById('dish-price').value, image: document.getElementById('dish-image').value,
            time: { active: document.getElementById('dish-time-active').value, total: document.getElementById('dish-time-total').value },
            tags: [], ingredients: document.getElementById('dish-ingredients').value.split(',').map(i => i.trim()),
        };
        try { await addDoc(mealsCollection, newMeal); alert('✅ კერძი წარმატებით დაემატა!'); adminModal.close(); e.target.reset(); } catch(err) { alert('❌ შეცდომა!'); }
    });
}
