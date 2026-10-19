/* ==========================================================================
   0. FIREBASE ინტეგრაცია
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
   1. კატეგორიები და ინგრედიენტები
   ========================================================================== */
const CATEGORIES = {
    main: { icon: '🍲', title: 'ძირითადი კერძები' },
    soup: { icon: '🥣', title: 'წვნიანები' },
    salad: { icon: '🥗', title: 'სალათები' },
    cold: { icon: '🌿', title: 'ფხალეული და ცივი' },
    bakery: { icon: '🥐', title: 'ცომეული / გამომცხვარი' },
    garnish: { icon: '🍚', title: 'გარნირი და ფაფა' },
    sauce: { icon: '🥣', title: 'საწებელი და სოუსი' },
    dessert: { icon: '🍰', title: 'დესერტები' },
    extra: { icon: '🧀', title: 'დანამატი / მწნილი' }
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
   2. სრული მონაცემთა ბაზა (92 კერძი სრული სტრუქტურით)
   ========================================================================== */
const INITIAL_MEALS = [
    { name: 'ცეზარი', category: 'salad', difficulty: 'medium', price: '$$', time: { active: '15 წთ', total: '20 წთ' }, tags: ['მსუბუქი', 'ხორციანი'], ingredients: ['ქათამი', 'ყველი', 'პომიდორი', 'კვერცხი'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'ტუნა', category: 'salad', difficulty: 'easy', price: '$$', time: { active: '10 წთ', total: '15 წთ' }, tags: ['მსუბუქი', 'თევზიანი'], ingredients: ['ტუნა', 'კვერცხი', 'კიტრი'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'ბოსტნეულის', category: 'salad', difficulty: 'easy', price: '$', time: { active: '10 წთ', total: '10 წთ' }, tags: ['ვეგანური', 'მსუბუქი'], ingredients: ['პომიდორი', 'კიტრი', 'ხახვი'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'აწეწილი', category: 'salad', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '30 წთ' }, tags: ['ხორციანი'], ingredients: ['ხორცი', 'მაიონეზი'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'ოლივიე', category: 'salad', difficulty: 'medium', price: '$$', time: { active: '30 წთ', total: '45 წთ' }, tags: ['მძიმე', 'ხორციანი'], ingredients: ['კარტოფილი', 'კვერცხი', 'სტაფილო'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'ბერძნული', category: 'salad', difficulty: 'easy', price: '$$', time: { active: '10 წთ', total: '10 წთ' }, tags: ['ვეგეტარიანული', 'ყველიანი'], ingredients: ['პომიდორი', 'კიტრი', 'ყველი'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'ტაბულე', category: 'salad', difficulty: 'easy', price: '$', time: { active: '15 წთ', total: '20 წთ' }, tags: ['ვეგანური', 'მსუბუქი'], ingredients: ['ბულგარული', 'მწვანილი', 'პომიდორი'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'კომბოსტოს-სტაფილოს', category: 'salad', difficulty: 'easy', price: '$', time: { active: '10 წთ', total: '10 წთ' }, tags: ['ვეგანური', 'დიეტური'], ingredients: ['კომბოსტო', 'სტაფილო'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'ვინეგრეტი', category: 'salad', difficulty: 'medium', price: '$', time: { active: '25 წთ', total: '40 წთ' }, tags: ['ვეგანური', 'დიეტური'], ingredients: ['ჭარხალი', 'კარტოფილი', 'სტაფილო'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'ჭარხლის', category: 'salad', difficulty: 'easy', price: '$', time: { active: '15 წთ', total: '30 წთ' }, tags: ['ვეგანური', 'ტკბილი'], ingredients: ['ჭარხალი', 'ნიგოზი'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'კარტოფილი', category: 'salad', difficulty: 'easy', price: '$', time: { active: '15 წთ', total: '25 წთ' }, tags: ['ვეგეტარიანული', 'მძიმე'], ingredients: ['კარტოფილი', 'კვერცხი', 'ხახვი'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'ლობიო სირსვალი', category: 'salad', difficulty: 'medium', price: '$', time: { active: '20 წთ', total: '1 სთ' }, tags: ['ვეგანური', 'მძიმე'], ingredients: ['ლობიო', 'ნიგოზი', 'ნიორი'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'კინოა', category: 'salad', difficulty: 'easy', price: '$$', time: { active: '15 წთ', total: '20 წთ' }, tags: ['ვეგანური', 'დიეტური'], ingredients: ['კინოა', 'ბოსტნეული'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'ბრინჯი', category: 'salad', difficulty: 'easy', price: '$', time: { active: '15 წთ', total: '25 წთ' }, tags: ['ვეგეტარიანული'], ingredients: ['ბრინჯი', 'სიმინდი'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'მაკარონი', category: 'salad', difficulty: 'easy', price: '$', time: { active: '10 წთ', total: '20 წთ' }, tags: ['ვეგეტარიანული', 'მძიმე'], ingredients: ['მაკარონი', 'ყველი', 'პომიდორი'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { name: 'ბორში', category: 'soup', difficulty: 'hard', price: '$$', time: { active: '30 წთ', total: '1 სთ 30 წთ' }, tags: ['ცხელი', 'ხორციანი'], ingredients: ['ჭარხალი', 'კომბოსტო', 'ხორცი'], image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600' },
    { name: 'ჩიხირთმა', category: 'soup', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '50 წთ' }, tags: ['ცხელი', 'ხორციანი'], ingredients: ['ქათამი', 'კვერცხი'], image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600' },
    { name: 'ოსპის კრემსუპი', category: 'soup', difficulty: 'easy', price: '$', time: { active: '15 წთ', total: '30 წთ' }, tags: ['ცხელი', 'ვეგანური'], ingredients: ['ოსპი', 'სტაფილო', 'ხახვი'], image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600' },
    { name: 'სოკოს კრემსუპი', category: 'soup', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '40 წთ' }, tags: ['ცხელი', 'ვეგეტარიანული'], ingredients: ['სოკო', 'ნაღები'], image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600' },
    { name: 'ააზიური წვნიანები', category: 'soup', difficulty: 'hard', price: '$$$', time: { active: '25 წთ', total: '45 წთ' }, tags: ['ცხელი', 'ცხარე'], ingredients: ['მაკარონი', 'ხორცი'], image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600' },
    { name: 'ლობიოს წვნიანი', category: 'soup', difficulty: 'medium', price: '$', time: { active: '15 წთ', total: '1 სთ' }, tags: ['ცხელი', 'ვეგანური'], ingredients: ['ლობიო', 'ნიორი', 'მწვანილი'], image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600' },
    { name: 'გოგრის კრემსუპი', category: 'soup', difficulty: 'easy', price: '$$', time: { active: '15 წთ', total: '35 წთ' }, tags: ['ცხელი', 'ვეგეტარიანული'], ingredients: ['გოგრა', 'ნაღები'], image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600' },
    { name: 'ხორცის წვნიანი', category: 'soup', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '1 სთ' }, tags: ['ცხელი', 'ხორციანი'], ingredients: ['ხორცი', 'კარტოფილი', 'სტაფილო'], image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600' },
    { name: 'შვრიის ფაფა', category: 'garnish', difficulty: 'easy', price: '$', time: { active: '5 წთ', total: '10 წთ' }, tags: ['ცხელი', 'დიეტური'], ingredients: [], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'მანი ქაში', category: 'garnish', difficulty: 'easy', price: '$', time: { active: '5 წთ', total: '10 წთ' }, tags: ['ცხელი', 'ტკბილი'], ingredients: [], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'კორკოტი', category: 'garnish', difficulty: 'medium', price: '$', time: { active: '20 წთ', total: '45 წთ' }, tags: ['ცხელი', 'ტკბილი'], ingredients: [], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'წანდილი', category: 'garnish', difficulty: 'medium', price: '$', time: { active: '20 წთ', total: '45 წთ' }, tags: ['ცხელი', 'ტკბილი'], ingredients: [], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'ბრინჯის ფლავი', category: 'garnish', difficulty: 'medium', price: '$$', time: { active: '15 წთ', total: '40 წთ' }, tags: ['ცხელი', 'ხორციანი'], ingredients: ['ბრინჯი', 'სტაფილო'], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'ღომი', category: 'garnish', difficulty: 'medium', price: '$', time: { active: '20 წთ', total: '1 სთ' }, tags: ['ცხელი', 'ვეგანური', 'მძიმე'], ingredients: [], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'ელარჯი', category: 'garnish', difficulty: 'hard', price: '$$', time: { active: '30 წთ', total: '1 სთ' }, tags: ['ცხელი', 'ვეგეტარიანული', 'მძიმე'], ingredients: ['სულგუნი'], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'წიწიბურა', category: 'garnish', difficulty: 'easy', price: '$', time: { active: '5 წთ', total: '20 წთ' }, tags: ['ცხელი', 'ვეგანური'], ingredients: [], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'მწვანე ოსპი+ბურგული', category: 'garnish', difficulty: 'easy', price: '$$', time: { active: '15 წთ', total: '35 წთ' }, tags: ['ცხელი', 'ვეგანური'], ingredients: [], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'ტკბილი ფლავი', category: 'garnish', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '40 წთ' }, tags: ['ცხელი', 'ტკბილი'], ingredients: [], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'ნიგვზიანი ბადრიჯანი', category: 'cold', difficulty: 'medium', price: '$$', time: { active: '25 წთ', total: '45 წთ' }, tags: ['ცივი', 'ვეგანური', 'ნიგვზიანი'], ingredients: ['ბადრიჯანი', 'ნიგოზი', 'ნიორი'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'ისპანახი', category: 'cold', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '40 წთ' }, tags: ['ცივი', 'ვეგანური', 'ნიგვზიანი'], ingredients: ['ისპანახი', 'ნიგოზი'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'ჭარხალი და სტაფილო', category: 'cold', difficulty: 'easy', price: '$', time: { active: '15 წთ', total: '30 წთ' }, tags: ['ცივი', 'ვეგანური'], ingredients: ['ჭარხალი', 'სტაფილო', 'ნიგოზი'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'ფხალი', category: 'cold', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '40 წთ' }, tags: ['ცივი', 'ვეგანური', 'ნიგვზიანი'], ingredients: ['ისპანახი', 'ნიგოზი', 'ნიორი'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'ჭინჭარი', category: 'cold', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '40 წთ' }, tags: ['ცივი', 'ვეგანური', 'ნიგვზიანი'], ingredients: ['ნიგოზი', 'ნიორი'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'მწვანე ლობიოს ფხალი', category: 'cold', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '40 წთ' }, tags: ['ცივი', 'ვეგანური', 'ნიგვზიანი'], ingredients: ['ლობიო', 'ნიგოზი'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'ბულგარულის', category: 'cold', difficulty: 'easy', price: '$', time: { active: '10 წთ', total: '15 წთ' }, tags: ['ცივი', 'ვეგანური'], ingredients: ['ბულგარული', 'ზეთი'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'ჯონჯოლის ფხ', category: 'cold', difficulty: 'easy', price: '$$', time: { active: '10 წთ', total: '15 წთ' }, tags: ['ცივი', 'ვეგანური'], ingredients: ['ხახვი', 'ზეთი'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'ყვავ. კომბ.ფხ.', category: 'cold', difficulty: 'medium', price: '$$', time: { active: '15 წთ', total: '30 წთ' }, tags: ['ცივი', 'ვეგანური', 'ნიგვზიანი'], ingredients: ['ნიგოზი', 'ნიორი'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'ხის სოკო', category: 'cold', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '35 წთ' }, tags: ['ცივი', 'ვეგანური', 'მწვანილი'], ingredients: ['სოკო', 'მწვანილი'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'სოკო სულგუნით', category: 'cold', difficulty: 'easy', price: '$$', time: { active: '15 წთ', total: '25 წთ' }, tags: ['ცხელი', 'ვეგეტარიანული', 'ყველიანი'], ingredients: ['სოკო', 'სულგუნი'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'ლაზანია', category: 'bakery', difficulty: 'hard', price: '$$$', time: { active: '30 წთ', total: '1 სთ 30 წთ' }, tags: ['ცხელი', 'ხორციანი', 'ცომეული'], ingredients: ['მაკარონი', 'ფარში', 'ყველი'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'აჩმა', category: 'bakery', difficulty: 'hard', price: '$$', time: { active: '40 წთ', total: '2 სთ' }, tags: ['ცხელი', 'ყველიანი', 'ცომეული'], ingredients: ['ცომი', 'ყველი'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'მადამ ბოვარი', category: 'main', difficulty: 'hard', price: '$$$', time: { active: '30 წთ', total: '1 სთ' }, tags: ['ცხელი', 'ხორციანი'], ingredients: ['ხორცი', 'ყველი', 'კარტოფილი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'მაკენდყველი', category: 'bakery', difficulty: 'medium', price: '$$', time: { active: '15 წთ', total: '35 წთ' }, tags: ['ცხელი', 'ყველიანი', 'ცომეული'], ingredients: ['მაკარონი', 'ყველი'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'პიცა', category: 'bakery', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '45 წთ' }, tags: ['ცხელი', 'ცომეული'], ingredients: ['ცომი', 'ყველი', 'პომიდორი'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'ხაჭაპური', category: 'bakery', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '40 წთ' }, tags: ['ცხელი', 'ყველიანი', 'ცომეული'], ingredients: ['ცომი', 'ყველი'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'ლობიანი', category: 'bakery', difficulty: 'medium', price: '$', time: { active: '20 წთ', total: '50 წთ' }, tags: ['ცხელი', 'ვეგანური', 'ცომეული'], ingredients: ['ცომი', 'ლობიო'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'ღვეზელი ტარხუნით და ბრი.', category: 'bakery', difficulty: 'medium', price: '$', time: { active: '20 წთ', total: '50 წთ' }, tags: ['ცხელი', 'ვეგეტარიანული', 'ცომეული'], ingredients: ['ცომი', 'ბრინჯი'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'ღვეზელი', category: 'bakery', difficulty: 'medium', price: '$', time: { active: '20 წთ', total: '45 წთ' }, tags: ['ცხელი', 'ცომეული'], ingredients: ['ცომი'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'ხორც.ბლინები', category: 'main', difficulty: 'medium', price: '$$', time: { active: '25 წთ', total: '45 წთ' }, tags: ['ცხელი', 'ხორციანი', 'ცომეული'], ingredients: ['ცომი', 'ფარში'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'ჩიბურეკი', category: 'bakery', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '40 წთ' }, tags: ['ცხელი', 'ხორციანი', 'ცომეული'], ingredients: ['ცომი', 'ფარში'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'ჭვიშტარი', category: 'bakery', difficulty: 'medium', price: '$$', time: { active: '15 წთ', total: '30 წთ' }, tags: ['ცხელი', 'ყველიანი'], ingredients: ['სულგუნი'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'შემწვარი კარტოფი', category: 'garnish', difficulty: 'easy', price: '$', time: { active: '15 წთ', total: '25 წთ' }, tags: ['ცხელი', 'ვეგანური'], ingredients: ['კარტოფილი'], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'შქმერული', category: 'main', difficulty: 'medium', price: '$$$', time: { active: '20 წთ', total: '50 წთ' }, tags: ['ცხელი', 'ხორციანი', 'ნიორი'], ingredients: ['ქათამი', 'ნიორი', 'ნაღები'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'აჯაბსანდალი', category: 'main', difficulty: 'medium', price: '$$', time: { active: '30 წთ', total: '1 სთ' }, tags: ['ცხელი', 'ვეგანური', 'ბოსტნეული'], ingredients: ['ბადრიჯანი', 'პომიდორი', 'ბულგარული', 'კარტოფილი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'ხინკალი', category: 'main', difficulty: 'hard', price: '$$', time: { active: '40 წთ', total: '1 სთ 30 წთ' }, tags: ['ცხელი', 'ხორციანი', 'ცომეული'], ingredients: ['ფარში', 'ცომი', 'ხახვი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'საცივი', category: 'main', difficulty: 'hard', price: '$$$', time: { active: '40 წთ', total: '3 სთ' }, tags: ['ცივი', 'ხორციანი', 'ნიგვზიანი'], ingredients: ['ქათამი', 'ნიგოზი', 'ნიორი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'ტოლმა', category: 'main', difficulty: 'medium', price: '$$', time: { active: '30 წთ', total: '1 სთ 30 წთ' }, tags: ['ცხელი', 'ხორციანი'], ingredients: ['ფარში', 'ბრინჯი', 'კომბოსტო'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'მჭადი', category: 'bakery', difficulty: 'easy', price: '$', time: { active: '10 წთ', total: '20 წთ' }, tags: ['ცხელი', 'ვეგანური'], ingredients: [], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'თაშმიჯაბი', category: 'garnish', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '40 წთ' }, tags: ['ცხელი', 'ყველიანი', 'მძიმე'], ingredients: ['კარტოფილი', 'სულგუნი'], image: 'https://images.unsplash.com/photo-1615486171430-802c65910901?w=600' },
    { name: 'ნადუღი პიტნით', category: 'cold', difficulty: 'easy', price: '$$', time: { active: '5 წთ', total: '10 წთ' }, tags: ['ცივი', 'ვეგეტარიანული', 'მსუბუქი'], ingredients: ['პიტნა'], image: 'https://images.unsplash.com/photo-1576087563533-e5d0383b7076?w=600' },
    { name: 'პასტა', category: 'main', difficulty: 'easy', price: '$$', time: { active: '15 წთ', total: '25 წთ' }, tags: ['ცხელი', 'ვეგეტარიანული', 'ცომეული'], ingredients: ['მაკარონი', 'ყველი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'ატრია', category: 'main', difficulty: 'easy', price: '$', time: { active: '10 წთ', total: '20 წთ' }, tags: ['ცხელი', 'ვეგეტარიანული', 'ცომეული'], ingredients: ['მაკარონი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'კვერცხი მწვანე ხახვით', category: 'main', difficulty: 'easy', price: '$', time: { active: '5 წთ', total: '10 წთ' }, tags: ['ცხელი', 'ვეგეტარიანული', 'საუზმე'], ingredients: ['კვერცხი', 'ხახვი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'შაკშუკა სულგუნით', category: 'main', difficulty: 'easy', price: '$$', time: { active: '15 წთ', total: '25 წთ' }, tags: ['ცხელი', 'ვეგეტარიანული', 'საუზმე'], ingredients: ['კვერცხი', 'პომიდორი', 'სულგუნი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'ბაჟე', category: 'sauce', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '25 წთ' }, tags: ['ცივი', 'ვეგანური', 'ნიგვზიანი'], ingredients: ['ნიგოზი', 'ნიორი'], image: 'https://images.unsplash.com/photo-1588168333986-50845fce0ba0?w=600' },
    { name: 'პესტო', category: 'sauce', difficulty: 'easy', price: '$$$', time: { active: '10 წთ', total: '10 წთ' }, tags: ['ცივი', 'ვეგეტარიანული', 'მწვანე'], ingredients: ['ნიორი', 'ყველი'], image: 'https://images.unsplash.com/photo-1588168333986-50845fce0ba0?w=600' },
    { name: 'ბეშამელი', category: 'sauce', difficulty: 'medium', price: '$', time: { active: '15 წთ', total: '15 წთ' }, tags: ['ცხელი', 'ვეგეტარიანული', 'კრემოვანი'], ingredients: [], image: 'https://images.unsplash.com/photo-1588168333986-50845fce0ba0?w=600' },
    { name: 'ყველის სოუსი', category: 'sauce', difficulty: 'easy', price: '$$', time: { active: '10 წთ', total: '15 წთ' }, tags: ['ცხელი', 'ვეგეტარიანული', 'ყველიანი'], ingredients: ['ყველი'], image: 'https://images.unsplash.com/photo-1588168333986-50845fce0ba0?w=600' },
    { name: 'ბეშამელი პასტა', category: 'sauce', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '30 წთ' }, tags: ['ცხელი', 'ვეგეტარიანული', 'ცომეული'], ingredients: ['მაკარონი'], image: 'https://images.unsplash.com/photo-1588168333986-50845fce0ba0?w=600' },
    { name: 'გუაკამოლე', category: 'sauce', difficulty: 'easy', price: '$$$', time: { active: '10 წთ', total: '10 წთ' }, tags: ['ცივი', 'ვეგანური', 'მსუბუქი'], ingredients: ['პომიდორი', 'ხახვი'], image: 'https://images.unsplash.com/photo-1588168333986-50845fce0ba0?w=600' },
    { name: 'სტეიკი', category: 'main', difficulty: 'hard', price: '$$$', time: { active: '15 წთ', total: '25 წთ' }, tags: ['ცხელი', 'ხორციანი', 'პრემიუმ'], ingredients: ['ხორცი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'რატატუი', category: 'main', difficulty: 'medium', price: '$$', time: { active: '25 წთ', total: '1 სთ' }, tags: ['ცხელი', 'ვეგანური', 'ბოსტნეული'], ingredients: ['ბადრიჯანი', 'პომიდორი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'კატლეტი', category: 'main', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '40 წთ' }, tags: ['ცხელი', 'ხორციანი', 'შემწვარი'], ingredients: ['ფარში', 'ხახვი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'ტირამისუ', category: 'dessert', difficulty: 'hard', price: '$$$', time: { active: '30 წთ', total: '4 სთ' }, tags: ['ცივი', 'ტკბილი', 'ყველიანი'], ingredients: ['კვერცხი'], image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600' },
    { name: 'ჩიზქეიქი', category: 'dessert', difficulty: 'hard', price: '$$$', time: { active: '30 წთ', total: '4 სთ' }, tags: ['ცივი', 'ტკბილი', 'ყველიანი'], ingredients: ['ყველი', 'ნაღები', 'კვერცხი'], image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600' },
    { name: 'ფახლავა', category: 'dessert', difficulty: 'hard', price: '$$$', time: { active: '40 წთ', total: '2 სთ' }, tags: ['ცხელი', 'ტკბილი', 'ნიგვზიანი'], ingredients: ['ცომი', 'ნიგოზი'], image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600' },
    { name: 'ტკბილი ღვეზელი', category: 'dessert', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '1 სთ' }, tags: ['ცხელი', 'ტკბილი', 'გამომცხვარი'], ingredients: ['ცომი'], image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600' },
    { name: 'ვაშლის ღვეზელი', category: 'dessert', difficulty: 'medium', price: '$$', time: { active: '20 წთ', total: '1 სთ' }, tags: ['ცხელი', 'ტკბილი', 'გამომცხვარი'], ingredients: ['ცომი'], image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600' },
    { name: 'გამომცხვარი გოგრა', category: 'dessert', difficulty: 'easy', price: '$', time: { active: '10 წთ', total: '45 წთ' }, tags: ['ცხელი', 'ტკბილი', 'ვეგანური'], ingredients: [], image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600' },
    { name: 'ვრაპი', category: 'main', difficulty: 'easy', price: '$$', time: { active: '10 წთ', total: '15 წთ' }, tags: ['ცხელი', 'ხორციანი', 'სწრაფი'], ingredients: ['ქათამი'], image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600' },
    { name: 'სინამონ როლს', category: 'dessert', difficulty: 'hard', price: '$$', time: { active: '30 წთ', total: '2 სთ' }, tags: ['ცხელი', 'ტკბილი', 'ცომეული'], ingredients: ['ცომი'], image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600' },
    { name: 'მწნილები', category: 'extra', difficulty: 'easy', price: '$', time: { active: '5 წთ', total: '5 წთ' }, tags: ['ცივი', 'ვეგანური', 'მჟავე'], ingredients: ['კიტრი', 'პომიდორი', 'კომბოსტო'], image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600' },
    { name: 'ყველები', category: 'extra', difficulty: 'easy', price: '$$$', time: { active: '5 წთ', total: '5 წთ' }, tags: ['ცივი', 'ყველიანი'], ingredients: ['ყველი', 'სულგუნი'], image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600' },
    { name: 'აჭარული ხაჭაპური', category: 'bakery', difficulty: 'hard', price: '$$', time: { active: '25 წთ', total: '45 წთ' }, tags: ['ცხელი', 'ყველიანი', 'ცომეული', 'მძიმე'], ingredients: ['ცომი', 'ყველი', 'კვერცხი'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'ხორციანი პერაშკი', category: 'bakery', difficulty: 'medium', price: '$', time: { active: '20 წთ', total: '40 წთ' }, tags: ['ცხელი', 'ხორციანი', 'ცომეული'], ingredients: ['ცომი', 'ფარში'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600' },
    { name: 'ტკბილი კრეპები', category: 'dessert', difficulty: 'medium', price: '$', time: { active: '20 წთ', total: '20 წთ' }, tags: ['ცხელი', 'ტკბილი', 'საუზმე'], ingredients: ['კვერცხი'], image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600' }
];

/* ==========================================================================
   3. აპლიკაციის ინიციალიზაცია 
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromFirebase();
    renderCategories();
    renderIngredients();
    renderCustomCheckboxes();
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
    for (const meal of INITIAL_MEALS) { await addDoc(mealsCollection, meal); }
}

/* ==========================================================================
   4. UI რენდერი
   ========================================================================== */
function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';
    for (const [key, data] of Object.entries(CATEGORIES)) {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="card-content-wrapper">
                <div class="card-header">
                    <h3>${data.icon} ${data.title}</h3>
                </div>
                <div class="card-body">
                    <div class="result-placeholder" id="res-${key}">დაატრიალე...</div>
                </div>
            </div>
            <button class="btn-spin-single" data-category="${key}"><i class="fa-solid fa-rotate-right"></i></button>
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

function renderCustomCheckboxes() {
    const container = document.getElementById('custom-checkboxes');
    if(!container) return;
    container.innerHTML = '';
    for (const [key, data] of Object.entries(CATEGORIES)) {
        const isChecked = (key === 'main' || key === 'salad') ? 'checked' : '';
        container.innerHTML += `
            <label class="chip ${isChecked ? 'active' : ''}" style="display:inline-flex; align-items:center; gap:8px;">
                <input type="checkbox" value="${key}" ${isChecked} style="display:none;" onchange="this.parentElement.classList.toggle('active')">
                ${data.icon} ${data.title}
            </label>
        `;
    }
}

/* ==========================================================================
   5. რენდომაიზერის ლოგიკა 
   ========================================================================== */
function spinSingle(category) {
    const resultDiv = document.getElementById(`res-${category}`);
    const card = resultDiv.closest('.category-card');
    const availableMeals = mealData.filter(m => m.category === category);
    
    if (availableMeals.length === 0) {
        resultDiv.textContent = 'კერძი არ მოიძებნა';
        card.style.backgroundImage = 'none';
        return;
    }

    resultDiv.style.opacity = '0.3';
    resultDiv.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
        const item = availableMeals[Math.floor(Math.random() * availableMeals.length)];
        displayResultObject(category, item);
    }, 300);
}

function spinCombo(preset) {
    Object.keys(CATEGORIES).forEach(k => {
        const div = document.getElementById(`res-${k}`);
        if(div) {
            div.innerHTML = 'დაატრიალე...';
            div.style.color = 'var(--accent-gold)';
            div.closest('.category-card').style.backgroundImage = 'none';
            div.closest('.category-card').onclick = null;
        }
    });

    let categoriesToSpin = [];
    if (preset === 'quick') categoriesToSpin = ['main', 'salad'];
    else if (preset === 'date') categoriesToSpin = ['main', 'salad', 'dessert', 'extra'];
    else if (preset === 'feast') categoriesToSpin = ['main', 'soup', 'salad', 'cold', 'garnish', 'sauce', 'dessert'];
    else if (preset === 'custom') {
        const checkedBoxes = document.querySelectorAll('#custom-checkboxes input:checked');
        categoriesToSpin = Array.from(checkedBoxes).map(cb => cb.value);
        if(categoriesToSpin.length === 0) {
            alert("გთხოვთ, აირჩიოთ მინიმუმ 1 კატეგორია მოსანიშნი პანელიდან!");
            return;
        }
    }

    let anchorTags = [];
    if (categoriesToSpin.includes('main')) {
        const mains = mealData.filter(m => m.category === 'main');
        if (mains.length > 0) {
            const anchor = mains[Math.floor(Math.random() * mains.length)];
            displayResultObject('main', anchor);
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
            for (let i = 0; i < weight; i++) { weightedItems.push(item); }
        });

        const randomPick = weightedItems[Math.floor(Math.random() * weightedItems.length)];
        displayResultObject(cat, randomPick);
    });
}

function displayResultObject(category, item) {
    const div = document.getElementById(`res-${category}`);
    const card = div.closest('.category-card');

    if(div && item) {
        div.innerHTML = `
            <strong>${item.name}</strong>
            <div class="meal-meta visible">
                <span><i class="fa-solid fa-clock"></i> ${item.time ? item.time.active : '15 წთ'}</span>
                <span><i class="fa-solid fa-wallet"></i> ${item.price || '$$'}</span>
            </div>
        `;
        div.style.color = '#fff';
        div.style.opacity = '1';
        div.style.transform = 'scale(1)';

        if(item.image) card.style.backgroundImage = `url('${item.image}')`;
        else card.style.backgroundImage = 'none';

        card.onclick = (e) => {
            if(!e.target.closest('.btn-spin-single')) openDetailModal(item);
        };
    }
}

/* ==========================================================================
   6. მოდალები და Event Listeners
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
    modal.classList.remove('hidden');
}

function setupEventListeners() {
    document.getElementById('categories-container').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-spin-single');
        if (btn) spinSingle(btn.dataset.category);
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const customPanel = document.getElementById('custom-combo-builder');
            if(e.target.dataset.preset === 'custom') {
                customPanel.classList.remove('hidden');
            } else {
                customPanel.classList.add('hidden');
            }
        });
    });

    document.getElementById('spin-combo-btn').addEventListener('click', () => {
        spinCombo(document.querySelector('.preset-btn.active').dataset.preset);
    });

    const adminModal = document.getElementById('admin-modal');
    document.getElementById('admin-btn').addEventListener('click', () => adminModal.classList.remove('hidden'));
    document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => adminModal.classList.add('hidden'));
    });
    
    document.querySelector('.close-detail-modal').addEventListener('click', () => {
        document.getElementById('meal-detail-modal').classList.add('hidden');
    });

    document.getElementById('admin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (document.getElementById('admin-pin').value !== ADMIN_PIN) return alert('❌ არასწორი PIN კოდი!');
        
        const newMeal = {
            name: document.getElementById('dish-name').value,
            category: document.getElementById('dish-category').value,
            difficulty: document.getElementById('dish-difficulty') ? document.getElementById('dish-difficulty').value : 'medium',
            price: document.getElementById('dish-price').value,
            image: document.getElementById('dish-image').value,
            time: {
                active: document.getElementById('dish-time-active').value,
                total: document.getElementById('dish-time-total').value
            },
            tags: [], 
            ingredients: document.getElementById('dish-ingredients').value.split(',').map(i => i.trim()),
        };

        try {
            await addDoc(mealsCollection, newMeal);
            alert('✅ კერძი წარმატებით დაემატა!');
            adminModal.classList.add('hidden');
            e.target.reset();
        } catch(err) { alert('❌ შეცდომა დამატებისას!'); }
    });
}
