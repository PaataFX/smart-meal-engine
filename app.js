/* ==========================================================================
   0. FIREBASE ინტეგრაცია და კონფიგურაცია
   ========================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
   1. საბაზისო კონფიგურაცია და კატეგორიები
   ========================================================================== */
const CATEGORIES = {
    main: { icon: '🍲', title: 'ძირითადი კერძები' },
    soup: { icon: '🥣', title: 'წვნიანები' },
    salad: { icon: '🥗', title: 'სალათები' },
    cold: { icon: '🌿', title: 'ფხალეული და ცივი' },
    bakery: { icon: '🥐', title: 'ცომეული და გამომცხვარი' },
    garnish: { icon: '🍚', title: 'გარნირი და ფაფა' },
    sauce: { icon: '🥣', title: 'საწებელი და სოუსი' },
    dessert: { icon: '🍰', title: 'დესერტები' },
    extra: { icon: '🧀', title: 'დანამატი / მწნილი' }
};

const ADMIN_PIN = '62442';

const ALL_INGREDIENTS = ['კარტოფილი', 'ქათამი', 'ყველი', 'კვერცხი', 'პომიდორი', 'კიტრი', 'მაკარონი', 'ფარში', 'სოკო', 'ლობიო', 'ბრინჯი'];
let userInventory = [];
let mealData = [];

/* ==========================================================================
   2. საწყისი მონაცემთა ბაზა (თუ Firebase ცარიელია)
   ========================================================================== */
const INITIAL_MEALS = [
    { name: 'ცეზარი', category: 'salad', tags: ['მსუბუქი', 'ხორციანი'], ingredients: ['ქათამი', 'ყველი'] },
    { name: 'კატლეტი', category: 'main', tags: ['ხორციანი', 'მძიმე'], ingredients: ['ფარში'], synergyTags: ['გარნირი'], dissonanceTags: ['ცომეული'] },
    { name: 'პიურე', category: 'garnish', tags: ['გარნირი', 'ვეგეტარიანული'], ingredients: ['კარტოფილი'] },
    { name: 'შქმერული', category: 'main', tags: ['ხორციანი', 'ნიორი'], ingredients: ['ქათამი'] },
    { name: 'ბაჟე', category: 'sauce', tags: ['ნიგვზიანი', 'ცივი'], ingredients: [] },
    { name: 'პასტა ბოლონეზე', category: 'main', tags: ['ხორციანი', 'ცომეული'], ingredients: ['მაკარონი', 'ფარში', 'პომიდორი'] },
    { name: 'ბერძნული სალათი', category: 'salad', tags: ['მსუბუქი', 'ვეგეტარიანული'], ingredients: ['პომიდორი', 'კიტრი', 'ყველი'] },
    { name: 'ჩიზქეიქი', category: 'dessert', tags: ['ტკბილი', 'ყველიანი'], ingredients: ['ყველი'] }
];

/* ==========================================================================
   3. აპლიკაციის ინიციალიზაცია და ბაზასთან კავშირი
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromFirebase();
    renderCategories();
    renderIngredients();
    setupEventListeners();
});

function loadDataFromFirebase() {
    onSnapshot(mealsCollection, (snapshot) => {
        mealData = [];
        snapshot.forEach((doc) => {
            mealData.push({ id: doc.id, ...doc.data() });
        });
        
        if (mealData.length === 0) {
            seedInitialData();
        }
    });
}

async function seedInitialData() {
    for (const meal of INITIAL_MEALS) {
        await addDoc(mealsCollection, meal);
    }
}

async function saveMealToFirebase(newMeal) {
    try {
        await addDoc(mealsCollection, newMeal);
        alert('✅ კერძი წარმატებით დაემატა ბაზაში!');
    } catch (e) {
        console.error("შეცდომა დამატებისას: ", e);
        alert('❌ მოხდა შეცდომა კერძის დამატებისას. შეამოწმე Firebase-ის წესები (Rules).');
    }
}

/* ==========================================================================
   4. UI რენდერი (კატეგორიები და ინგრედიენტები)
   ========================================================================== */
function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    for (const [key, data] of Object.entries(CATEGORIES)) {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="card-header">
                <h3>${data.icon} ${data.title}</h3>
            </div>
            <div class="card-body">
                <div class="result-placeholder" id="res-${key}">დაატრიალე...</div>
            </div>
            <button class="btn-spin-single" data-category="${key}">
                <i class="fa-solid fa-rotate-right"></i>
            </button>
        `;
        container.appendChild(card);
    }
}

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

/* ==========================================================================
   5. რენდომაიზერის ძრავი
   ========================================================================== */
function spinSingle(category) {
    const resultDiv = document.getElementById(`res-${category}`);
    const availableMeals = mealData.filter(m => m.category === category);
    
    if (availableMeals.length === 0) {
        resultDiv.textContent = 'კერძი არ მოიძებნა';
        return;
    }

    resultDiv.style.opacity = '0.5';
    resultDiv.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        const randomItem = availableMeals[Math.floor(Math.random() * availableMeals.length)];
        resultDiv.innerHTML = `<strong>${randomItem.name}</strong>`;
        resultDiv.style.opacity = '1';
        resultDiv.style.transform = 'scale(1)';
        resultDiv.style.color = '#D4AF37';
    }, 300);
}

function spinCombo(preset) {
    Object.keys(CATEGORIES).forEach(k => {
        const div = document.getElementById(`res-${k}`);
        if(div) {
            div.textContent = 'დაატრიალე...';
            div.style.color = 'var(--accent-gold)';
            div.style.opacity = '0.6';
        }
    });

    let categoriesToSpin = [];
    if (preset === 'quick') categoriesToSpin = ['main', 'salad'];
    else if (preset === 'date') categoriesToSpin = ['main', 'salad', 'dessert', 'extra'];
    else if (preset === 'feast') categoriesToSpin = ['main', 'soup', 'salad', 'cold', 'garnish', 'sauce', 'dessert'];
    else categoriesToSpin = ['main', 'salad', 'garnish'];

    let anchorTags = [];
    if (categoriesToSpin.includes('main')) {
        const mains = mealData.filter(m => m.category === 'main');
        if (mains.length > 0) {
            const anchor = mains[Math.floor(Math.random() * mains.length)];
            displayResult('main', anchor.name);
            anchorTags = anchor.tags || [];
            categoriesToSpin = categoriesToSpin.filter(c => c !== 'main');
        }
    }

    categoriesToSpin.forEach(cat => {
        let items = mealData.filter(m => m.category === cat);
        if (items.length === 0) return;

        let weightedItems = [];
        items.forEach(item => {
            let weight = 10;
            let itemTags = item.tags || [];

            if (anchorTags.includes('ცომეული') && itemTags.includes('ცომეული')) weight = 1;
            if (anchorTags.includes('ხორციანი') && itemTags.includes('ხორციანი')) weight = 2;
            if (anchorTags.includes('მძიმე') && itemTags.includes('მსუბუქი')) weight = 30;

            for (let i = 0; i < weight; i++) {
                weightedItems.push(item);
            }
        });

        const randomPick = weightedItems[Math.floor(Math.random() * weightedItems.length)];
        displayResult(cat, randomPick.name);
    });
}

function displayResult(category, text) {
    const div = document.getElementById(`res-${category}`);
    if(div) {
        setTimeout(() => {
            div.innerHTML = `<strong>${text}</strong>`;
            div.style.color = '#fff';
            div.style.opacity = '1';
        }, Math.random() * 500);
    }
}

/* ==========================================================================
   6. Event Listeners და Admin Panel (PIN დაცვა)
   ========================================================================== */
function setupEventListeners() {
    document.getElementById('categories-container').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-spin-single');
        if (btn) {
            spinSingle(btn.dataset.category);
        }
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    document.getElementById('spin-combo-btn').addEventListener('click', () => {
        const activePreset = document.querySelector('.preset-btn.active').dataset.preset;
        spinCombo(activePreset);
    });

    const modal = document.getElementById('admin-modal');
    document.getElementById('admin-btn').addEventListener('click', () => modal.classList.remove('hidden'));
    document.querySelector('.close-modal').addEventListener('click', () => modal.classList.add('hidden'));
    document.querySelector('.cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));

    document.getElementById('admin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const pin = document.getElementById('admin-pin').value;
        if (pin !== ADMIN_PIN) {
            alert('❌ არასწორი PIN კოდი!');
            return;
        }

        const newMeal = {
            name: document.getElementById('dish-name').value,
            category: document.getElementById('dish-category').value,
            difficulty: document.getElementById('dish-difficulty').value,
            tags: [], 
            ingredients: [],
            createdAt: new Date()
        };

        await saveMealToFirebase(newMeal);
        
        modal.classList.add('hidden');
        e.target.reset();
    });
}
