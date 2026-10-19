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
   1. კატეგორიები და ინგრედიენტები
   ========================================================================== */
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
const ALL_INGREDIENTS = [
    'ქათამი', 'კარტოფილი', 'ყველი', 'სულგუნი', 'კვერცხი', 'პომიდორი', 'კიტრი', 
    'ფარში', 'სოკო', 'ლობიო', 'ბრინჯი', 'მაკარონი', 'ნიგოზი', 'ბადრიჯანი', 
    'ისპანახი', 'ტუნა', 'კომბოსტო', 'სტაფილო', 'ჭარხალი', 'ნაღები', 'ბულგარული', 
    'მწვანილი', 'ნიორი', 'ხახვი', 'ცომი', 'ხორცი'
];

let userInventory = [];
let mealData = [];

/* ==========================================================================
   2. აპლიკაციის ინიციალიზაცია და ბაზის ჩატვირთვა
   ========================================================================== */
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
        
        // თუ ბაზა ცარიელია, ვტვირთავთ ჩვენს JSON ფაილს
        if (mealData.length === 0) seedInitialData();
    });
}

async function seedInitialData() {
    try {
        console.log("ვიწყებ მონაცემების JSON-დან ჩატვირთვას...");
        const response = await fetch('meals.json');
        if (!response.ok) throw new Error("meals.json ვერ მოიძებნა!");
        
        const initialMeals = await response.json();
        const batch = writeBatch(db); // Batch Write - 92 კერძს 1 წამში ატვირთავს!
        
        initialMeals.forEach((meal) => {
            const docRef = doc(collection(db, "meals"));
            batch.set(docRef, meal);
        });

        await batch.commit();
        console.log('✅ 92-ვე კერძი წარმატებით აიტვირთა!');
    } catch (error) {
        console.error("❌ შეცდომა JSON-ის ატვირთვისას:", error);
    }
}

/* ==========================================================================
   3. UI რენდერი (მთვლელები + / -)
   ========================================================================== */
function renderIngredients() {
    const container = document.getElementById('ingredient-list');
    container.innerHTML = '';
    ALL_INGREDIENTS.forEach(ing => {
        const chip = document.createElement('span');
        chip.className = `chip ${userInventory.includes(ing) ? 'active' : ''}`;
        chip.textContent = ing;
        chip.onclick = () => toggleIngredient(ing, chip);
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

// შენით აწყობის მენიუში + / - ღილაკების დაგენერირება
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
        const btnMinus = node.querySelector('.minus');
        const btnPlus = node.querySelector('.plus');

        itemDiv.dataset.category = key;
        label.innerHTML = `${data.icon} ${data.title}`;
        
        if(key === 'main' || key === 'salad') input.value = 1;

        btnMinus.onclick = () => { if(input.value > 0) input.value = parseInt(input.value) - 1; };
        btnPlus.onclick = () => { if(input.value < 5) input.value = parseInt(input.value) + 1; };

        container.appendChild(node);
    }
}

function populateAdminDropdown() {
    const select = document.getElementById('dish-category');
    select.innerHTML = '';
    for (const [key, data] of Object.entries(CATEGORIES)) {
        select.innerHTML += `<option value="${key}">${data.icon} ${data.title}</option>`;
    }
}

/* ==========================================================================
   4. დინამიური რენდომაიზერი და სლოტ ანიმაცია
   ========================================================================== */
function spinCombo(preset) {
    const container = document.getElementById('categories-container');
    container.innerHTML = ''; // ვასუფთავებთ ეკრანს ზედმეტი ბარათებისგან!

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
            if(available.length === 0) available = itemsInCategory; // Fallback თუ კერძები გაგვითავდა

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
            usedMeals.add(pick.id); // ვიმახსოვრებთ კერძს, რომ 3 სალათის არჩევისას არ გამეორდეს
            
            if(cat === 'main' && anchorTags.length === 0) anchorTags = pick.tags || [];

            createAndSpinCard(cat, pick, i + 1, count > 1); // ვქმნით იმდენ ბარათს, რამდენიც ვითხოვეთ
        }
    });
}

// შაბლონიდან ხატავს ბარათს და ურთავს სლოტ ანიმაციას
function createAndSpinCard(category, finalItem, index, showIndex) {
    const container = document.getElementById('categories-container');
    const template = document.getElementById('meal-card-template');
    const cardNode = template.content.cloneNode(true);
    
    const article = cardNode.querySelector('article');
    const titleEl = cardNode.querySelector('.category-title');
    const resultEl = cardNode.querySelector('.result-placeholder');
    const metaEl = cardNode.querySelector('.meal-meta');
    const bgOverlay = cardNode.querySelector('.card-bg-overlay');
    const spinBtn = cardNode.querySelector('.btn-spin-single');
    const removeBtn = cardNode.querySelector('.remove-card-btn');
    
    const catData = CATEGORIES[category];
    titleEl.innerHTML = `${catData.icon} ${catData.title} ${showIndex ? `<span style="font-size:0.8rem; opacity:0.6">#${index}</span>` : ''}`;
    
    container.appendChild(cardNode);
    
    runSlotAnimation(category, article, finalItem, resultEl, metaEl, bgOverlay);

    // ინდივიდუალური ღილაკები
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); article.remove(); });

    spinBtn.addEventListener('click', (e) => {
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
            finishSpin(article, finalItem, resultEl, metaEl, bgOverlay);
        }
    }, 60); 
}

function finishSpin(article, item, resultEl, metaEl, bgOverlay) {
    resultEl.textContent = item.name;
    article.classList.add('has-result');
    if(item.image) bgOverlay.style.backgroundImage = `url('${item.image}')`;
    
    metaEl.innerHTML = `
        <span><i class="fa-solid fa-clock"></i> ${item.time?.active || '15 წთ'}</span>
        <span><i class="fa-solid fa-wallet"></i> ${item.price || '$$'}</span>
    `;
    metaEl.classList.add('visible');
    
    article.onclick = (e) => { if(!e.target.closest('button')) openDetailModal(item); };
}

/* ==========================================================================
   5. მოდალები და Event Listeners (მაცივრის ჭკვიანი ფილტრი)
   ========================================================================== */
function openDetailModal(item) {
    const modal = document.getElementById('meal-detail-modal');
    const body = document.getElementById('meal-detail-body');
    const tagsHtml = (item.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');
    
    let missingIngredients = [];
    if(item.ingredients) {
        missingIngredients = item.ingredients.filter(ing => !userInventory.includes(ing));
    }
    
    let missingHtml = '';
    const storeToggle = document.getElementById('store-toggle');
    if (missingIngredients.length > 0 && (!storeToggle || !storeToggle.checked)) {
        missingHtml = `
            <div style="background: rgba(229, 115, 115, 0.1); border-left: 4px solid var(--accent-red); padding: 10px 15px; margin-top: 20px; border-radius: 4px;">
                <p style="color: var(--accent-red); margin: 0; font-size: 0.95rem;">
                    <i class="fa-solid fa-cart-shopping"></i> <strong>საყიდელი გაქვს:</strong> ${missingIngredients.join(', ')}
                </p>
            </div>
        `;
    }

    body.innerHTML = `
        <div class="meal-image-header" style="background-image: url('${item.image || ''}')">
            <div class="meal-image-overlay"></div>
        </div>
        <div class="meal-detail-body">
            <h2>${item.name}</h2>
            <div class="detail-meta">
                <span><i class="fa-solid fa-clock"></i> აქტიური: ${item.time?.active || '-'} | სრული: ${item.time?.total || '-'}</span>
                <span><i class="fa-solid fa-wallet"></i> ${item.price || '$$'}</span>
                <span><i class="fa-solid fa-fire"></i> ${item.difficulty === 'easy' ? 'მარტივი' : item.difficulty === 'hard' ? 'რთული' : 'საშუალო'}</span>
            </div>
            <div class="detail-tags">${tagsHtml}</div>
            ${item.ingredients && item.ingredients.length > 0 ? `
            <div class="detail-ingredients">
                <h4><i class="fa-solid fa-basket-shopping"></i> ინგრედიენტები:</h4>
                <p>${item.ingredients.join(', ')}</p>
            </div>` : ''}
            ${missingHtml}
        </div>
    `;
    modal.showModal();
}

function setupEventListeners() {
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
    document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => adminModal.close());
    });
    
    document.querySelector('.close-detail-modal').addEventListener('click', () => {
        document.getElementById('meal-detail-modal').close();
    });

    document.getElementById('admin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (document.getElementById('admin-pin').value !== ADMIN_PIN) return alert('❌ არასწორი PIN კოდი!');
        
        const newMeal = {
            name: document.getElementById('dish-name').value,
            category: document.getElementById('dish-category').value,
            difficulty: 'medium',
            price: document.getElementById('dish-price').value,
            image: document.getElementById('dish-image').value,
            time: { active: document.getElementById('dish-time-active').value, total: document.getElementById('dish-time-total').value },
            tags: [], 
            ingredients: document.getElementById('dish-ingredients').value.split(',').map(i => i.trim()),
        };

        try {
            await addDoc(mealsCollection, newMeal);
            alert('✅ კერძი წარმატებით დაემატა!');
            adminModal.close();
            e.target.reset();
        } catch(err) { alert('❌ შეცდომა დამატებისას!'); }
    });
}
