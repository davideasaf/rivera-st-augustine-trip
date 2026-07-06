const STORAGE_KEY = 'stAugustineFamilySurveyOnly.v1';
const GROCERY_KEY = 'stAugustineGroceryChecklist.v1';
const PLACES_KEY = 'stAugustinePlacesToVisit.v1';
const makeId = () => (globalThis.crypto?.randomUUID?.() || `idea-${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Clear old prototype data so older versions with dates/lists do not reappear on refresh.
[
  'stAugustineMeals.v1',
  'stAugustineMeals.v2',
  'stAugustineDinnerSurvey.v1',
  'stAugustineMealIdeas.v1',
  'stAugustineMealIdeas.v2'
].forEach(key => localStorage.removeItem(key));

const grocerySections = [
  { id: 'day1-dinner', title: 'Day 1', meals: ['Dinner'] },
  { id: 'day2', title: 'Day 2', meals: ['Breakfast', 'Dinner'] },
  { id: 'day3', title: 'Day 3', meals: ['Breakfast', 'Dinner'] },
  { id: 'day4', title: 'Day 4', meals: ['Breakfast', 'Dinner'] },
  { id: 'day5-breakfast', title: 'Day 5', meals: ['Breakfast'] }
];

function normalize(text) {
  return String(text).trim().replace(/\s+/g, ' ');
}

function loadSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function loadGroceries() {
  try {
    return JSON.parse(localStorage.getItem(GROCERY_KEY)) || {};
  } catch {
    return {};
  }
}

function saveGroceries(data) {
  localStorage.setItem(GROCERY_KEY, JSON.stringify(data));
}

function loadPlaces() {
  try {
    return JSON.parse(localStorage.getItem(PLACES_KEY)) || [];
  } catch {
    return [];
  }
}

function savePlaces(data) {
  localStorage.setItem(PLACES_KEY, JSON.stringify(data));
}

function savePlaceSuggestions(event) {
  event.preventDefault();
  const person = normalize(document.querySelector('#placePersonName').value);
  const places = [
    normalize(document.querySelector('#placeOne').value),
    normalize(document.querySelector('#placeTwo').value)
  ].filter(Boolean).slice(0, 2);

  if (!person) return alert('Please add your name.');
  if (!places.length) return alert('Please add at least one place or activity.');

  const existing = loadPlaces();
  const updated = existing.filter(item => item.person.toLowerCase() !== person.toLowerCase());
  places.forEach(text => updated.push({ id: makeId(), person, text, submittedAt: new Date().toISOString() }));
  savePlaces(updated);

  ['placeOne', 'placeTwo'].forEach(id => document.querySelector(`#${id}`).value = '');
  document.querySelector('#placesSaveMessage').hidden = false;
  renderPlacesList();
}

function saveSubmission(event) {
  event.preventDefault();
  const person = normalize(document.querySelector('#personName').value);
  const dinners = [
    normalize(document.querySelector('#dinnerOne').value),
    normalize(document.querySelector('#dinnerTwo').value)
  ].filter(Boolean).slice(0, 2);
  const breakfasts = [
    normalize(document.querySelector('#breakfastOne').value),
    normalize(document.querySelector('#breakfastTwo').value)
  ].filter(Boolean).slice(0, 2);

  if (!person) return alert('Please add your name.');
  if (!dinners.length && !breakfasts.length) return alert('Please add at least one dinner or breakfast idea.');

  const submissions = loadSubmissions();
  const withoutThisPerson = submissions.filter(item => item.person.toLowerCase() !== person.toLowerCase());
  withoutThisPerson.push({ id: makeId(), person, dinners, breakfasts, submittedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutThisPerson));

  ['dinnerOne', 'dinnerTwo', 'breakfastOne', 'breakfastTwo'].forEach(id => document.querySelector(`#${id}`).value = '');
  const message = document.querySelector('#saveMessage');
  message.hidden = false;
}

function showTab(tabId) {
  document.querySelectorAll('.page').forEach(page => {
    const active = page.id === tabId;
    page.hidden = !active;
    page.classList.toggle('active-page', active);
  });
  document.querySelectorAll('.tab').forEach(tab => {
    const active = tab.dataset.tab === tabId;
    tab.classList.toggle('active', active);
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
}

function groceryKey(dayId, meal) {
  return `${dayId}:${meal}`;
}

function renderGroceryChecklist() {
  const container = document.querySelector('#groceryChecklist');
  if (!container) return;
  const groceries = loadGroceries();
  container.innerHTML = '';

  grocerySections.forEach(section => {
    const sectionEl = document.createElement('article');
    sectionEl.className = 'grocery-day';
    sectionEl.innerHTML = `<h2>${section.title}</h2>`;

    section.meals.forEach(meal => {
      const key = groceryKey(section.id, meal);
      const mealItems = groceries[key] || [];
      const mealEl = document.createElement('div');
      mealEl.className = 'grocery-meal';
      mealEl.innerHTML = `
        <div class="meal-head">
          <h3>${meal}</h3>
          <button type="button" class="add-item" data-key="${key}">Add item</button>
        </div>
        <div class="checklist" data-list="${key}"></div>
      `;
      const listEl = mealEl.querySelector('.checklist');
      if (!mealItems.length) {
        listEl.innerHTML = '<p class="empty-list">No items yet.</p>';
      } else {
        mealItems.forEach(item => {
          const row = document.createElement('label');
          row.className = 'check-row';
          row.innerHTML = `<input type="checkbox" ${item.done ? 'checked' : ''} data-check-id="${item.id}" data-key="${key}"><span>${escapeHtml(item.text)}</span><button type="button" class="icon" data-remove-id="${item.id}" data-key="${key}" aria-label="Remove item">×</button>`;
          listEl.appendChild(row);
        });
      }
      sectionEl.appendChild(mealEl);
    });

    container.appendChild(sectionEl);
  });

  container.querySelectorAll('.add-item').forEach(btn => btn.addEventListener('click', () => addGroceryItem(btn.dataset.key)));
  container.querySelectorAll('[data-check-id]').forEach(box => box.addEventListener('change', () => toggleGroceryItem(box.dataset.key, box.dataset.checkId, box.checked)));
  container.querySelectorAll('[data-remove-id]').forEach(btn => btn.addEventListener('click', () => removeGroceryItem(btn.dataset.key, btn.dataset.removeId)));
}

function addGroceryItem(key) {
  const text = normalize(prompt('Grocery item to add:') || '');
  if (!text) return;
  const groceries = loadGroceries();
  groceries[key] ||= [];
  groceries[key].push({ id: makeId(), text, done: false });
  saveGroceries(groceries);
  renderGroceryChecklist();
}

function toggleGroceryItem(key, id, done) {
  const groceries = loadGroceries();
  groceries[key] = (groceries[key] || []).map(item => item.id === id ? { ...item, done } : item);
  saveGroceries(groceries);
}

function removeGroceryItem(key, id) {
  const groceries = loadGroceries();
  groceries[key] = (groceries[key] || []).filter(item => item.id !== id);
  saveGroceries(groceries);
  renderGroceryChecklist();
}

function renderPlacesList() {
  const list = document.querySelector('#placesList');
  if (!list) return;
  const places = loadPlaces().sort((a, b) => a.text.localeCompare(b.text));
  document.querySelector('#placesCount').textContent = `${places.length} idea${places.length === 1 ? '' : 's'}`;
  list.innerHTML = '';

  if (!places.length) {
    list.innerHTML = '<p class="empty-list">No places suggested yet.</p>';
    return;
  }

  places.forEach(place => {
    const row = document.createElement('article');
    row.className = 'place-row';
    row.innerHTML = `<div><strong>${escapeHtml(place.text)}</strong><span>Suggested by ${escapeHtml(place.person)}</span></div><button type="button" class="icon" data-remove-place="${place.id}" aria-label="Remove place">×</button>`;
    list.appendChild(row);
  });

  list.querySelectorAll('[data-remove-place]').forEach(btn => btn.addEventListener('click', () => removePlace(btn.dataset.removePlace)));
}

function removePlace(id) {
  savePlaces(loadPlaces().filter(place => place.id !== id));
  renderPlacesList();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
}

document.querySelector('#ideaForm').addEventListener('submit', saveSubmission);
document.querySelector('#placesForm').addEventListener('submit', savePlaceSuggestions);
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.tab)));
renderGroceryChecklist();
renderPlacesList();
const initialTab = new URLSearchParams(location.search).get('tab');
if (['grocery-list', 'places-to-visit'].includes(initialTab)) showTab(initialTab);
