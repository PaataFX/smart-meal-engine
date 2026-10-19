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

// ინგრედიენტების სია ფილტრისთვის (მაცივარი)
const ALL_INGREDIENTS = ['კარტოფილი', 'ქათამი', 'ყველი', 'კვერცხი', 'პომიდორი', 'კიტრი', 'მაკარონი', 'ფარში', 'სოკო', 'ლობიო', 'ბრინჯი'];
let userInventory = [];
let storeToggle = false;

/* ==========================================================================
   2. საწყისი მონაცემთა ბაზა (Seed Data)
   აქ ჩასმულია რამდენიმე ნიმუში. დანარჩენი Excel-იდან უნდა დაემატოს
   ========================================================================== */
const INITIAL_MEALS = [
    { id: '1', name: 'ცეზარი', category: 'salad', tags: ['მსუბუქი', 'ხორციანი'], ingredients: ['ქათამი', 'ყველი'] },
    { id: '2', name: 'კატლეტი', category: 'main', tags: ['ხორციანი', 'მძიმე'], ingredients: ['ფარში'], synergyTags: ['გარნირი'], dissonanceTags: ['ცომეული'] },
    { id: '3', name: 'პიურე', category: 'garnish', tags: ['გარნირი', 'ვეგეტარიანული'], ingredients: ['კარტოფილი'] },
    { id: '4', name: 'შქმერული', category: 'main', tags: ['ხორციანი', 'ნიორი'], ingredients: ['ქათამი'] },
    { id: '5', name: 'ბაჟე', category: 'sauce', tags: ['ნიგვზიანი', 'ცივი'], ingredients: [] },
    { id: '6', name: 'პასტა ბოლონეზე', category: 'main', tags: ['ხორციანი', 'ცომეული'], ingredients: ['მაკარონი', 'ფარში', 'პომიდორი'] },
    { id: '7', name: 'ბერძნული სალათი', category: 'salad', tags: ['მსუბუქი', 'ვეგეტარიანული'], ingredients: ['პომიდორი', 'კიტრი', 'ყველი'] },
    { id: '8', name: 'ჩიზქეიქი', category: 'dessert', tags: ['ტკბილი', 'ყველიანი'], ingredients: ['ყველი'] }
];

let mealData = [];

/* ==========================================================================
   3. აპლიკაციის ინიციალიზაცია (ჩატვირთვა)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderCategories();
    renderIngredients();
    setupEventListeners();
});

// მონაცემების წამოღება (თუ ცარიელია, ტვირთავს საწყის ბაზას)
function loadData() {
    const stored = localStorage.getItem('smartMealsData');
    if (stored) {
        mealData = JSON.parse(stored);
    } else {
        mealData = [...INITIAL_MEALS];
        saveData();
    }
}

// მონაცემების შენახვა (შემდგომში აქ ჩაჯდება Firebase-ის კოდი)
function saveData() {
    localStorage.setItem('smartMealsData', JSON.stringify(mealData));
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
   5. რენდომაიზერის ძრავი (ალგორითმი)
   ========================================================================== */

// ერთი კატეგორიის დატრიალება
function spinSingle(category) {
    const resultDiv = document.getElementById(`res-${category}`);
    const availableMeals = mealData.filter(m => m.category === category);
    
    if (availableMeals.length === 0) {
        resultDiv.textContent = 'კერძი არ მოიძებნა';
        return;
    }

    // ანიმაციის ეფექტი
    resultDiv.style.opacity = '0.5';
    resultDiv.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        const randomItem = availableMeals[Math.floor(Math.random() * availableMeals.length)];
        resultDiv.innerHTML = `<strong>${randomItem.name}</strong>`;
        resultDiv.style.opacity = '1';
        resultDiv.style.transform = 'scale(1)';
        resultDiv.style.color = '#D4AF37'; // ოქროსფერი
    }, 300);
}

// კომბოს დატრიალება (Synergy & Dissonance)
function spinCombo(preset) {
    // 1. ვასუფთავებთ ყველა წინა შედეგს
    Object.keys(CATEGORIES).forEach(k => {
        const div = document.getElementById(`res-${k}`);
        if(div) {
            div.textContent = 'დაატრიალე...';
            div.style.color = 'var(--accent-gold)';
            div.style.opacity = '0.6';
        }
    });

    // 2. განვსაზღვროთ რომელი კატეგორიები უნდა დატრიალდეს პრესეტის მიხედვით
    let categoriesToSpin = [];
    if (preset === 'quick') categoriesToSpin = ['main', 'salad'];
    else if (preset === 'date') categoriesToSpin = ['main', 'salad', 'dessert', 'extra'];
    else if (preset === 'feast') categoriesToSpin = ['main', 'soup', 'salad', 'cold', 'garnish', 'sauce', 'dessert'];
    else categoriesToSpin = ['main', 'salad', 'garnish']; // Custom default

    // 3. ვირჩევთ "Anchor" კერძს (მთავარ კერძს) სინერგიებისთვის
    let anchorTags = [];
    if (categoriesToSpin.includes('main')) {
        const mains = mealData.filter(m => m.category === 'main');
        if (mains.length > 0) {
            const anchor = mains[Math.floor(Math.random() * mains.length)];
            displayResult('main', anchor.name);
            anchorTags = anchor.tags || [];
            categoriesToSpin = categoriesToSpin.filter(c => c !== 'main'); // ამოვიღოთ სიიდან
        }
    }

    // 4. ვტრიალებთ დანარჩენ კატეგორიებს წონითი ალგორითმით
    categoriesToSpin.forEach(cat => {
        let items = mealData.filter(m => m.category === cat);
        if (items.length === 0) return;

        // წონების მინიჭება (Weighted Random)
        let weightedItems = [];
        items.forEach(item => {
            let weight = 10; // საბაზისო წონა
            let itemTags = item.tags || [];

            // დისონანსი: თუ Anchor-ს და ამ კერძს ერთნაირი მძიმე თეგები აქვთ (მაგ. ორივე ცომეულია)
            if (anchorTags.includes('ცომეული') && itemTags.includes('ცომეული')) {
                weight = 1; // შანსი ეცემა
            }
            if (anchorTags.includes('ხორციანი') && itemTags.includes('ხორციანი')) {
                weight = 2; // ორი ხორციანი კერძი ნაკლებად გვინდა ერთად
            }

            // სინერგია: მსუბუქი აბალანსებს მძიმეს
            if (anchorTags.includes('მძიმე') && itemTags.includes('მსუბუქი')) {
                weight = 30; // შანსი სამმაგდება
            }

            // ვამრავლებთ ელემენტს მასივში წონის მიხედვით
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
        }, Math.random() * 500); // პატარა დაყოვნება ეფექტისთვის
    }
}

/* ==========================================================================
   6. Event Listeners და Admin Panel (PIN დაცვა)
   ========================================================================== */
function setupEventListeners() {
    // Single Category Spinners
    document.getElementById('categories-container').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-spin-single');
        if (btn) {
            spinSingle(btn.dataset.category);
        }
    });

    // Preset Buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Spin Combo Button
    document.getElementById('spin-combo-btn').addEventListener('click', () => {
        const activePreset = document.querySelector('.preset-btn.active').dataset.preset;
        spinCombo(activePreset);
    });

    // Admin Modal Toggle
    const modal = document.getElementById('admin-modal');
    document.getElementById('admin-btn').addEventListener('click', () => modal.classList.remove('hidden'));
    document.querySelector('.close-modal').addEventListener('click', () => modal.classList.add('hidden'));
    document.querySelector('.cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));

    // Admin Form Submit
    document.getElementById('admin-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const pin = document.getElementById('admin-pin').value;
        if (pin !== ADMIN_PIN) {
            alert('❌ არასწორი PIN კოდი!');
            return;
        }

        const newMeal = {
            id: Date.now().toString(),
            name: document.getElementById('dish-name').value,
            category: document.getElementById('dish-category').value,
            difficulty: document.getElementById('dish-difficulty').value,
            tags: [], // აქ შეგიძლია დაამატო თეგების ველები მომავალში
            ingredients: []
        };

        mealData.push(newMeal);
        saveData();
        
        alert('✅ კერძი წარმატებით დაემატა ბაზაში!');
        modal.classList.add('hidden');
        e.target.reset(); // ფორმის გასუფთავება
    });
}