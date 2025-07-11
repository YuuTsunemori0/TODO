const taskInput = document.getElementById('new-task');
const addTaskBtn = document.getElementById('add-task');
const board = document.getElementById('board');
const addCategoryBtn = document.getElementById('add-category');
const filterButtons = document.querySelectorAll('.filter');
const toggleOptionsBtn = document.getElementById('toggle-options');
const optionsDiv = document.getElementById('task-options');
const newDescription = document.getElementById('new-description');
const newPriority = document.getElementById('new-priority');
const newDueDate = document.getElementById('new-due-date');
const newTagsDiv = document.getElementById('new-tags');
const addNewTagBtn = document.getElementById('add-new-tag');

const loginForm = document.getElementById('login-form');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const todoApp = document.getElementById('todo-app');

let newTags = [];

// Firebase
import { auth, db } from './firebaseConfig.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

let currentUser = null;

// Authentication
window.signUp = async function () {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Compte créé !');
    } catch (error) {
        alert(error.message);
    }
};

window.login = async function () {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert('Connecté !');
    } catch (error) {
        alert(error.message);
    }
};

window.logout = async function () {
    try {
        await saveTasks();
    } catch (error) {
        console.error('Failed to save tasks before logout:', error);
    }
    try {
        await signOut(auth);
        tasks = [];
        renderBoard(currentFilter);
        alert('Déconnecté !');
    } catch (error) {
        alert('Erreur lors de la déconnexion: ' + error.message);
    }
};

onAuthStateChanged(auth, async user => {
    if (user) {
        currentUser = user;
        userEmailSpan.textContent = user.email;
        loginForm.classList.add('hidden');
        userInfo.classList.remove('hidden');
        todoApp.classList.remove('hidden');
        await loadTasks();
        renderBoard(currentFilter);
    } else {
        currentUser = null;
        tasks = [];
        userEmailSpan.textContent = '';
        userInfo.classList.add('hidden');
        loginForm.classList.remove('hidden');
        todoApp.classList.add('hidden');
        renderBoard(currentFilter);
    }
});

addNewTagBtn.addEventListener('click', e => {
    e.stopPropagation();
    openNewTagSelector();
});

let tasks = [];
let categories = ['Uncategorized'];

function updateTimestamp(task) {
    task.updatedAt = new Date().toISOString();
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function deleteCategory(name) {
    categories = categories.filter(c => c !== name);
    tasks.forEach(t => {
        if (t.category === name) t.category = 'Uncategorized';
    });
    saveTasks();
    renderBoard(currentFilter);
}

function addCategory(name) {
    categories.push(name);
    saveTasks();
    renderBoard(currentFilter);
}

toggleOptionsBtn.addEventListener('click', () => {
    optionsDiv.classList.toggle('hidden');
});

// Load tasks for the current user from Firestore
async function loadTasks() {
    if (!currentUser) return;
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    if (snap.exists()) {
        tasks = snap.data().items || [];
        categories = snap.data().categories || ['Uncategorized'];
    } else {
        tasks = [];
        categories = ['Uncategorized'];
    }
    tasks.forEach(t => {
        if (!t.tags) t.tags = [];
        if (!t.dueDate) t.dueDate = '';
        if (!t.description) t.description = '';
        if (!t.priority) t.priority = 'low';
        if (!t.createdAt) t.createdAt = new Date().toISOString();
        if (!t.updatedAt) t.updatedAt = t.createdAt;
        if (!t.category) t.category = 'Uncategorized';
        if (!t.assignee) t.assignee = currentUser ? currentUser.email : '';
        if (!t.id) t.id = generateId();
        t.editing = false;
    });
}

function saveTasks() {
    if (!currentUser) return Promise.resolve();
    const data = tasks.map(t => {
        const { editing, ...rest } = t;
        return rest;
    });
    return setDoc(doc(db, 'users', currentUser.uid), { items: data, categories });
}

function getPriorityInfo(level) {
    switch (level) {
        case 'high':
            return { icon: 'alert-circle', color: 'red' };
        case 'medium':
            return { icon: 'alert-triangle', color: 'orange' };
        default:
            return { icon: 'check-circle', color: 'green' };
    }
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    if (task.completed) li.classList.add('completed');

    const header = document.createElement('div');
    header.className = 'task-header';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = task.assignee ? task.assignee[0].toUpperCase() : '?';

    const dueSpan = document.createElement('span');
    dueSpan.className = 'due-date';
    updateDueDateSpan(dueSpan, task);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        updateTimestamp(task);
        saveTasks();
        renderBoard(currentFilter);
    });

    let textSpan;
    let descElement;
    let priorityElement;
    if (task.editing) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'edit-input';
        input.value = task.text;

        const descInput = document.createElement('textarea');
        descInput.className = 'edit-description';
        descInput.value = task.description || '';

        const select = document.createElement('select');
        select.className = 'priority-select';
        ['low', 'medium', 'high'].forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p.charAt(0).toUpperCase() + p.slice(1);
            if (task.priority === p) opt.selected = true;
            select.appendChild(opt);
        });

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';

        const finishEditing = () => {
            task.text = input.value.trim();
            task.description = descInput.value.trim();
            task.priority = select.value;
            task.editing = false;
            updateTimestamp(task);
            saveTasks();
            renderBoard(currentFilter);
        };

        saveBtn.addEventListener('click', finishEditing);
        cancelBtn.addEventListener('click', () => {
            task.editing = false;
            renderBoard(currentFilter);
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                finishEditing();
            } else if (e.key === 'Escape') {
                task.editing = false;
                renderBoard(currentFilter);
            }
        });

        textSpan = input;
        priorityElement = select;
        descElement = descInput;
        header.append(checkbox, avatar, textSpan, priorityElement, saveBtn, cancelBtn);
        li.appendChild(header);
        li.appendChild(descElement);
    } else {
        textSpan = document.createElement('span');
        textSpan.className = 'text';
        textSpan.textContent = task.text;
        textSpan.addEventListener('click', e => {
            e.stopPropagation();
            startEditing(task);
        });

        const priInfo = getPriorityInfo(task.priority);
        priorityElement = document.createElement('span');
        priorityElement.className = 'priority';
        const priIcon = document.createElement('i');
        priIcon.setAttribute('data-feather', priInfo.icon);
        priIcon.style.color = priInfo.color;
        priorityElement.appendChild(priIcon);

        descElement = document.createElement('div');
        descElement.className = 'description';
        descElement.textContent = task.description;

        header.append(checkbox, avatar, textSpan, priorityElement);
        li.appendChild(header);
        if (task.description) li.appendChild(descElement);
    }
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'tags';
    task.tags.forEach(tag => addTagElement(tag, tagsDiv, task));

    const actions = document.createElement('div');
    actions.className = 'actions';

    const tagBtn = document.createElement('button');
    tagBtn.className = 'tag-btn';
    tagBtn.innerHTML = '<i data-feather="tag" class="button-icon"></i> Tag';
    tagBtn.addEventListener('click', e => {
        e.stopPropagation();
        openTagSelector(task, tagsDiv);
    });

    const dateBtn = document.createElement('button');
    dateBtn.className = 'date-btn';
    dateBtn.innerHTML = '<i data-feather="calendar" class="button-icon"></i>';
    dateBtn.addEventListener('click', e => {
        e.stopPropagation();
        openDatePicker(task, dueSpan);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<i data-feather="trash-2" class="button-icon"></i>';
    deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        tasks = tasks.filter(t => t !== task);
        saveTasks();
        renderBoard(currentFilter);
    });

    actions.append(tagBtn, dateBtn, deleteBtn);

    const meta = document.createElement('div');
    meta.className = 'metadata';
    meta.appendChild(dueSpan);

    li.appendChild(tagsDiv);
    li.appendChild(meta);
    li.appendChild(actions);

    li.addEventListener('click', () => {
        li.classList.toggle('expanded');
    });
    return li;
}

function startEditing(task) {
    tasks.forEach(t => t.editing = false);
    task.editing = true;
    renderBoard(currentFilter);
    const input = board.querySelector('.edit-input');
    if (input) input.focus();
}

function addTagElement(tag, container, task) {
    const span = document.createElement('span');
    span.className = 'tag';
    span.style.background = tag.color;
    span.textContent = tag.label;

    const remove = document.createElement('span');
    remove.className = 'remove-tag';
    remove.innerHTML = '<i data-feather="x" class="button-icon"></i>';
    remove.addEventListener('click', e => {
        e.stopPropagation();
        task.tags = task.tags.filter(t => t !== tag);
        updateTimestamp(task);
        saveTasks();
        renderBoard(currentFilter);
    });
    span.appendChild(remove);
    container.appendChild(span);
}

function openTagSelector(task, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tag-selector';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Tag';
    const color = document.createElement('input');
    color.type = 'color';
    const add = document.createElement('button');
    add.textContent = 'Add';
    const suggestions = document.createElement('div');
    suggestions.className = 'tag-suggestions';

    const usedTags = {};
    tasks.forEach(t => {
        t.tags.forEach(tag => {
            if (!usedTags[tag.label]) usedTags[tag.label] = tag.color;
        });
    });

    const finish = () => {
        const label = input.value.trim();
        if (label) {
            task.tags.push({ label, color: color.value });
            updateTimestamp(task);
            saveTasks();
            renderBoard(currentFilter);
        }
        wrapper.remove();
    };
    add.addEventListener('click', finish);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') finish();
        if (e.key === 'Escape') wrapper.remove();
    });

    function updateSuggestions() {
        suggestions.innerHTML = '';
        const text = input.value.trim().toLowerCase();
        if (!text) return;
        Object.entries(usedTags).forEach(([label, col]) => {
            if (label.toLowerCase().startsWith(text)) {
                const item = document.createElement('div');
                item.className = 'suggestion';
                item.textContent = label;
                item.style.background = col;
                item.addEventListener('click', () => {
                    input.value = label;
                    color.value = col;
                    finish();
                });
                suggestions.appendChild(item);
            }
        });
    }

    input.addEventListener('input', updateSuggestions);

    wrapper.append(input, color, add, suggestions);
    container.appendChild(wrapper);
    input.focus();
}

function updateDueDateSpan(span, task) {
    if (task.dueDate) {
        span.textContent = 'Due: ' + task.dueDate;
        const today = new Date();
        const due = new Date(task.dueDate);
        today.setHours(0, 0, 0, 0);
        span.classList.toggle('past-due', due < today);
    } else {
        span.textContent = '';
        span.classList.remove('past-due');
    }
}

function openDatePicker(task, span) {
    const input = document.createElement('input');
    input.type = 'date';
    input.value = task.dueDate || '';
    input.addEventListener('change', () => {
        task.dueDate = input.value;
        updateTimestamp(task);
        saveTasks();
        renderBoard(currentFilter);
    });
    input.addEventListener('blur', () => input.remove());
    span.appendChild(input);
    input.focus();
}

function updateNewTagDisplay() {
    newTagsDiv.innerHTML = '';
    newTags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.style.background = tag.color;
        span.textContent = tag.label;
        const remove = document.createElement('span');
        remove.className = 'remove-tag';
        remove.innerHTML = '<i data-feather="x" class="button-icon"></i>';
        remove.addEventListener('click', () => {
            newTags = newTags.filter(t => t !== tag);
            updateNewTagDisplay();
        });
        span.appendChild(remove);
        newTagsDiv.appendChild(span);
    });
}

function openNewTagSelector() {
    const wrapper = document.createElement('div');
    wrapper.className = 'tag-selector';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Tag';
    const color = document.createElement('input');
    color.type = 'color';
    const add = document.createElement('button');
    add.textContent = 'Add';
    const suggestions = document.createElement('div');
    suggestions.className = 'tag-suggestions';

    const usedTags = {};
    tasks.forEach(t => {
        t.tags.forEach(tag => {
            if (!usedTags[tag.label]) usedTags[tag.label] = tag.color;
        });
    });

    const finish = () => {
        const label = input.value.trim();
        if (label) {
            newTags.push({ label, color: color.value });
            updateNewTagDisplay();
        }
        wrapper.remove();
    };
    add.addEventListener('click', finish);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') finish();
        if (e.key === 'Escape') wrapper.remove();
    });

    function updateSuggestions() {
        suggestions.innerHTML = '';
        const text = input.value.trim().toLowerCase();
        if (!text) return;
        Object.entries(usedTags).forEach(([label, col]) => {
            if (label.toLowerCase().startsWith(text)) {
                const item = document.createElement('div');
                item.className = 'suggestion';
                item.textContent = label;
                item.style.background = col;
                item.addEventListener('click', () => {
                    input.value = label;
                    color.value = col;
                    finish();
                });
                suggestions.appendChild(item);
            }
        });
    }

    input.addEventListener('input', updateSuggestions);

    wrapper.append(input, color, add, suggestions);
    newTagsDiv.appendChild(wrapper);
    input.focus();
}

function renderBoard(filter = 'all') {
    board.innerHTML = '';
    categories.forEach(cat => {
        const column = document.createElement('div');
        column.className = 'category-column';
        column.dataset.category = cat;

        const header = document.createElement('h3');
        header.textContent = cat;
        if (cat !== 'Uncategorized') {
            const del = document.createElement('span');
            del.className = 'delete-category';
            const delIcon = document.createElement('i');
            delIcon.setAttribute('data-feather', 'x');
            del.appendChild(delIcon);
            del.addEventListener('click', e => {
                e.stopPropagation();
                deleteCategory(cat);
            });
            header.appendChild(del);
        }

        const addBtn = document.createElement('button');
        addBtn.className = 'add-task-column';
        addBtn.innerHTML = '<i data-feather="plus" class="button-icon"></i> Add task';
        addBtn.addEventListener('click', () => {
            const text = prompt('Task name');
            if (text) {
                tasks.push({
                    id: generateId(),
                    text,
                    completed: false,
                    tags: [],
                    dueDate: '',
                    description: '',
                    priority: 'low',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    editing: false,
                    category: cat,
                    assignee: currentUser ? currentUser.email : ''
                });
                saveTasks();
                renderBoard(currentFilter);
            }
        });

        const ul = document.createElement('ul');
        tasks.forEach(task => {
            if (task.category !== cat) return;
            if (filter === 'active' && task.completed) return;
            if (filter === 'completed' && !task.completed) return;
            const li = createTaskElement(task);
            li.draggable = true;
            li.dataset.id = task.id;
            li.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', task.id);
            });
            ul.appendChild(li);
        });

        column.addEventListener('dragover', e => e.preventDefault());
        column.addEventListener('drop', e => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            const t = tasks.find(tt => tt.id === id);
            if (t && t.category !== cat) {
                t.category = cat;
                updateTimestamp(t);
                saveTasks();
                renderBoard(currentFilter);
            }
        });

        column.appendChild(header);
        column.appendChild(ul);
        column.appendChild(addBtn);
        board.appendChild(column);
    });

    filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    const input = board.querySelector('.edit-input');
    if (input) input.focus();
    if (window.feather) feather.replace();
}

addTaskBtn.addEventListener('click', () => {
    if (!currentUser) {
        alert('Please log in to add tasks');
        return;
    }
    const text = taskInput.value.trim();
    if (text) {
        tasks.push({
            id: generateId(),
            text,
            completed: false,
            tags: [...newTags],
            dueDate: newDueDate.value,
            description: newDescription.value.trim(),
            priority: newPriority.value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            editing: false,
            category: 'Uncategorized',
            assignee: currentUser ? currentUser.email : ''
        });
        taskInput.value = '';
        newDescription.value = '';
        newPriority.value = 'low';
        newDueDate.value = '';
        newTags = [];
        updateNewTagDisplay();
        saveTasks();
        renderBoard(currentFilter);
    }
});

taskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        if (!currentUser) {
            alert('Please log in to add tasks');
            return;
        }
        const text = taskInput.value.trim();
        if (text) {
            tasks.push({
                id: generateId(),
                text,
                completed: false,
                tags: [...newTags],
                dueDate: newDueDate.value,
                description: newDescription.value.trim(),
                priority: newPriority.value,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                editing: false,
                category: 'Uncategorized',
                assignee: currentUser ? currentUser.email : ''
            });
            taskInput.value = '';
            newDescription.value = '';
            newPriority.value = 'low';
            newDueDate.value = '';
            newTags = [];
            updateNewTagDisplay();
            saveTasks();
            renderBoard(currentFilter);
        }
    }
});

let currentFilter = 'all';
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        renderBoard(currentFilter);
    });
});

addCategoryBtn.addEventListener('click', () => {
    const name = prompt('Category name');
    if (name && !categories.includes(name)) {
        addCategory(name);
    }
});

