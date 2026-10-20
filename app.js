import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, writeBatch, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyAYRhbFU5iw7TmUomzlipDngxvTACOVU80", authDomain: "smart-meal-engine.firebaseapp.com", projectId: "smart-meal-engine" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const mealsCollection = collection(db, "meals");

const CATEGORIES = { main: { icon: '🍲', title: 'ძირითადი' }, soup: { icon: '🥣', title: 'წვნიანი' }, salad: { icon: '🥗', title: 'სალათი' }, cold: { icon: '🌿', title: 'ფხალეული' }, bakery: { icon: '🥐', title: 'ცომეული' }, garnish: { icon: '🍚', title: 'გარნირი' }, sauce: { icon: '🥣', title: 'საწებელი' }, dessert: { icon: '🍰', title: 'დესერტი' }, extra: { icon: '🧀', title: 'დანამატი' } };
const ALL_INGREDIENTS = ['ქათამი', 'კარტოფილი', 'ყველი', 'სულგუნი', 'კვერცხი', 'პომიდორი', 'კიტრი', 'ფარში', 'სოკო', 'ლობიო', 'ბრინჯი', 'მაკარონი', 'ნიგოზი', 'ბადრიჯანი', 'ისპანახი', 'ტუნა', 'კომბოსტო', 'სტაფილო', 'ჭარხალი', 'ნაღები', 'ბულგარული', 'მწვანილი', 'ნიორი', 'ხახვი', 'ცომი', 'ხორცი', 'ბაზილიკი', 'მაიონეზი', 'ზეთი', 'კარაქი'];

let userInventory = JSON.parse(localStorage.getItem('smartMealInventory')) || [];
let favoriteMeals = JSON.parse(localStorage.getItem('smartMealFavs')) || [];
let historySpins = JSON.parse(localStorage.getItem('smartMealHistory')) || [];
let mealData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadDataFromFirebase();
    renderIngredients();
    renderCustomCounters();
    setupEventListeners();
});

function loadDataFromFirebase() {
    onSnapshot(mealsCollection, (snapshot) => {
        mealData = [];
        snapshot.forEach(doc => mealData.push({ id: doc.id, ...doc.data() }));
        if (mealData.length === 0) seedInitialData();
    });
}

async function seedInitialData() {
    try {
        const response = await fetch('meals.json');
        const initialMeals = await response.json();
        const batch = writeBatch(db);
        initialMeals.forEach(meal => batch.set(doc(collection(db, "meals")), meal));
        await batch.commit();
    } catch (e) { console.error("Error loading JSON:", e); }
}

function renderIngredients() {
    const container = document.getElementById('ingredient-list');
    container.innerHTML = '';
    ALL_INGREDIENTS.forEach(ing => {
        const chip = document.createElement('span');
        chip.className = `chip ${userInventory.includes(ing) ? 'active' : ''}`;
        chip.textContent = ing;
        chip.onclick = () => { toggleIngredient(ing, chip); localStorage.setItem('smartMealInventory', JSON.stringify(userInventory)); };
        container.appendChild(chip);
    });
}

function toggleIngredient(ing, el) {
    if (userInventory.includes(ing)) { userInventory = userInventory.filter(i => i !== ing); el.classList.remove('active'); }
    else { userInventory.push(ing); el.classList.add('active'); }
}

// === ახალი ფილტრები ===
function getFilteredMeals(category) {
    let filtered = mealData.filter(m => m.category === category);
    
    // დროის ფილტრი
    if(document.getElementById('filter-time').checked) {
        filtered = filtered.filter(m => {
            const timeStr = m.time?.total || "";
            return !timeStr.includes("სთ") || timeStr === "1 სთ"; // უხეში ლოგიკა სწრაფისთვის
        });
    }
    // სირთულის ფილტრი
    if(document.getElementById('filter-easy').checked) {
        filtered = filtered.filter(m => m.difficulty === 'easy' || m.hasReadyMade === true);
    }
    return filtered;
}

function spinCombo(preset) {
    const container = document.getElementById('categories-container');
    container.innerHTML = ''; 
    document.getElementById('dissonance-alert-container').innerHTML = '';

    let request = {};
    if (preset === 'quick') request = { main: 1, salad: 1 };
    else if (preset === 'date') request = { main: 1, salad: 1, dessert: 1, extra: 1 };
    else if (preset === 'feast') request = { main: 2, salad: 2, cold: 1, garnish: 1, sauce: 1, dessert: 1 };
    else if (preset === 'custom') {
        document.querySelectorAll('.counter-item').forEach(item => {
            const count = parseInt(item.querySelector('.counter-input').value);
            if(count > 0) request[item.dataset.category] = count;
        });
        if(Object.keys(request).length === 0) return alert("მიუთითეთ მინიმუმ 1 რაოდენობა");
    }

    let usedMeals = new Set();
    let comboResult = [];
    const categoriesToSpin = Object.keys(request).sort((a, b) => a === 'main' ? -1 : 1);

    categoriesToSpin.forEach(cat => {
        const count = request[cat];
        let itemsInCategory = getFilteredMeals(cat);
        if(itemsInCategory.length === 0) itemsInCategory = mealData.filter(m => m.category === cat); // Fallback

        for(let i = 0; i < count; i++) {
            let available = itemsInCategory.filter(m => !usedMeals.has(m.id));
            if(available.length === 0) available = itemsInCategory;
            
            const pick = available[Math.floor(Math.random() * available.length)];
            usedMeals.add(pick.id);
            comboResult.push(pick);
            createAndSpinCard(cat, pick, i + 1, count > 1);
        }
    });

    // სინერგიის შემოწმება
    checkDissonance(comboResult);
    
    // ისტორიაში შენახვა
    if(comboResult.length > 0) {
        historySpins.unshift({ date: new Date().toLocaleString(), meals: comboResult });
        if(historySpins.length > 5) historySpins.pop();
        localStorage.setItem('smartMealHistory', JSON.stringify(historySpins));
        
        document.getElementById('share-menu-container').classList.remove('hidden');
        document.getElementById('share-menu-btn').onclick = () => {
            const text = "დღევანდელი მენიუ:\n" + comboResult.map(m => `🍲 ${m.name}`).join('\n');
            navigator.clipboard.writeText(text);
            alert("მენიუ დაკოპირდა გასაზიარებლად!");
        };
    }
}

function checkDissonance(combo) {
    let allSynergies = combo.flatMap(m => m.synergyTags || []);
    let msg = "";
    if(allSynergies.includes("თევზი") && allSynergies.includes("რძე")) msg = "⚠️ ყურადღება: თევზი და რძის პროდუქტები კუჭისთვის მძიმე კომბინაციაა.";
    else if(allSynergies.filter(t => t === "მძიმე").length > 2) msg = "⚠️ ყურადღება: შერჩეულია რამდენიმე მძიმე კერძი, რეკომენდებულია მსუბუქი სალათის დამატება.";
    
    if(msg) {
        document.getElementById('dissonance-alert-container').innerHTML = `<div class="dissonance-alert"><i class="fa-solid fa-triangle-exclamation"></i> ${msg}</div>`;
    }
}

function createAndSpinCard(category, finalItem, index, showIndex) {
    const container = document.getElementById('categories-container');
    const template = document.getElementById('meal-card-template');
    const cardNode = template.content.cloneNode(true);
    
    const article = cardNode.querySelector('article');
    article.classList.add('loading'); // Skeleton on
    
    cardNode.querySelector('.category-title').innerHTML = `${CATEGORIES[category].icon} ${CATEGORIES[category].title}`;
    
    const favBtn = cardNode.querySelector('.fav-card-btn');
    if(favoriteMeals.some(m => m.id === finalItem.id)) favBtn.classList.add('saved');
    favBtn.onclick = (e) => {
        e.stopPropagation();
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
    if(allNames.length === 0) return;

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
    article.classList.remove('loading');
    article.classList.add('has-result');
    article.querySelector('.card-bg-overlay').style.backgroundImage = `url('${item.image}')`;
    
    // პროცენტული ბარის დათვლა
    let hasCount = 0;
    if(item.ingredients && item.ingredients.length > 0) {
        item.ingredients.forEach(ing => { if(userInventory.includes(ing)) hasCount++; });
        const percent = Math.round((hasCount / item.ingredients.length) * 100);
        setTimeout(() => { article.querySelector('.progress-bar-fill').style.width = `${percent}%`; }, 500);
    }

    const tagsHtml = (item.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');
    // კალორიების დამატება თეგად
    const kcalTag = item.kcal ? `<span class="tag" style="color:#FFB74D; border-color:#FFB74D"><i class="fa-solid fa-fire"></i> ${item.kcal}</span>` : '';
    
    article.querySelector('.card-tags').innerHTML = tagsHtml + kcalTag;
    article.querySelector('.meal-meta').innerHTML = `<span><i class="fa-solid fa-clock"></i> ${item.time?.total || ''}</span>`;
    article.querySelector('.meal-meta-container').classList.add('visible');
    
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

// =================== Modals & Helpers ===================

function openDetailModal(item) {
    const modal = document.getElementById('meal-detail-modal');
    const body = document.getElementById('meal-detail-body');
    const storeToggle = document.getElementById('store-toggle').checked;
    
    let missing = item.ingredients ? item.ingredients.filter(ing => !userInventory.includes(ing)) : [];
    
    let shopBtn = missing.length > 0 ? `<button class="btn-outline btn-small" onclick="navigator.clipboard.writeText('საყიდელია: ${missing.join(', ')}'); alert('სია დაკოპირდა!')"><i class="fa-solid fa-copy"></i> სიის კოპირება</button>` : '';

    let badges = (item.ingredients || []).map(ing => 
        userInventory.includes(ing) ? `<span class="ing-badge ing-has"><i class="fa-solid fa-check"></i> ${ing}</span>` 
                                    : `<span class="ing-badge ing-missing"><i class="fa-solid fa-xmark"></i> ${ing}</span>`
    ).join('');

    body.innerHTML = `
        <div class="meal-image-header" style="background-image: url('${item.image}')"><div class="meal-image-overlay"></div></div>
        <div class="meal-detail-body">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2>${item.name}</h2>
                ${shopBtn}
            </div>
            <div class="detail-meta">
                <span><i class="fa-solid fa-clock"></i> ${item.time?.total || '-'}</span>
                <span><i class="fa-solid fa-fire"></i> ${item.kcal || '-'}</span>
            </div>
            ${badges ? `<div class="smart-ingredients-list">${badges}</div>` : ''}
        </div>`;
    modal.showModal();
}

function showListModal(title, itemsArray) {
    const modal = document.getElementById('list-modal');
    document.getElementById('list-modal-title').textContent = title;
    let html = '<div class="sug-list">';
    if(itemsArray.length === 0) html += '<p style="color:var(--text-muted); text-align:center;">სია ცარიელია</p>';
    
    itemsArray.forEach(m => {
        html += `<div class="recipe-sug-card" data-id="${m.id}"><img src="${m.image}" class="recipe-sug-img"><div class="recipe-sug-info"><h4>${m.name}</h4><span style="color:var(--text-muted); font-size:0.85rem;"><i class="fa-solid fa-clock"></i> ${m.time?.total}</span></div></div>`;
    });
    html += '</div>';
    document.getElementById('list-modal-body').innerHTML = html;
    modal.showModal();

    document.querySelectorAll('.recipe-sug-card').forEach(card => {
        card.onclick = () => { modal.close(); openDetailModal(mealData.find(m => m.id === card.dataset.id)); };
    });
}

function renderCustomCounters() {
    const container = document.getElementById('custom-counters-container');
    const template = document.getElementById('counter-template');
    if(!container || !template) return;
    for (const [key, data] of Object.entries(CATEGORIES)) {
        const node = template.content.cloneNode(true);
        node.querySelector('.counter-item').dataset.category = key;
        node.querySelector('.counter-label').innerHTML = `${data.icon} ${data.title}`;
        if(key === 'main' || key === 'salad') node.querySelector('.counter-input').value = 1;
        node.querySelector('.minus').onclick = (e) => { const inp = e.target.closest('.counter-controls').querySelector('input'); if(inp.value > 0) inp.value--; };
        node.querySelector('.plus').onclick = (e) => { const inp = e.target.closest('.counter-controls').querySelector('input'); if(inp.value < 5) inp.value++; };
        container.appendChild(node);
    }
}

function setupEventListeners() {
    // Keyboard Space key for spin
    document.addEventListener('keydown', (e) => {
        if(e.code === 'Space' && !document.querySelector('dialog[open]')) {
            e.preventDefault();
            document.getElementById('spin-combo-btn').click();
        }
    });

    // Close Modals on click outside
    document.querySelectorAll('dialog').forEach(dialog => {
        dialog.addEventListener('click', (e) => {
            const rect = dialog.getBoundingClientRect();
            if (e.clientY < rect.top || e.clientY > rect.top + rect.height || e.clientX < rect.left || e.clientX > rect.left + rect.width) dialog.close();
        });
        const closeBtn = dialog.querySelector('.close-modal, .close-detail-modal, .close-smart-modal');
        if(closeBtn) closeBtn.onclick = () => dialog.close();
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById('custom-combo-builder').classList.toggle('hidden', e.target.dataset.preset !== 'custom');
        };
    });

    document.getElementById('spin-combo-btn').onclick = () => spinCombo(document.querySelector('.preset-btn.active').dataset.preset);
    
    document.getElementById('favorites-btn').onclick = () => showListModal("❤️ ჩემი რჩეულები", favoriteMeals);
    document.getElementById('history-btn').onclick = () => {
        const flatHistory = historySpins.flatMap(h => h.meals);
        showListModal("🕒 ბოლო დატრიალებები", [...new Map(flatHistory.map(m => [m.id, m])).values()]);
    };
    
    document.getElementById('clear-inventory-btn').onclick = () => { userInventory = []; localStorage.removeItem('smartMealInventory'); renderIngredients(); };
}
