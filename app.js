const taskInput = document.getElementById('new-task');
const addTaskBtn = document.getElementById('add-task');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter');
const toggleOptionsBtn = document.getElementById('toggle-options');
const optionsDiv = document.getElementById('task-options');
const newDescription = document.getElementById('new-description');
const newPriority = document.getElementById('new-priority');
const newDueDate = document.getElementById('new-due-date');
const newTagsDiv = document.getElementById('new-tags');
const addNewTagBtn = document.getElementById('add-new-tag');

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
    await saveTasks();
    await signOut(auth);
    tasks = [];
    renderTasks(currentFilter);
    alert('Déconnecté !');
};

onAuthStateChanged(auth, async user => {
    if (user) {
        currentUser = user;
        await loadTasks();
        renderTasks(currentFilter);
    } else {
        currentUser = null;
        tasks = [];
        renderTasks(currentFilter);
    }
});

addNewTagBtn.addEventListener('click', e => {
    e.stopPropagation();
    openNewTagSelector();
});

let tasks = [];

function updateTimestamp(task) {
    task.updatedAt = new Date().toISOString();
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
    } else {
        tasks = [];
    }
    tasks.forEach(t => {
        if (!t.tags) t.tags = [];
        if (!t.dueDate) t.dueDate = '';
        if (!t.description) t.description = '';
        if (!t.priority) t.priority = 'low';
        if (!t.createdAt) t.createdAt = new Date().toISOString();
        if (!t.updatedAt) t.updatedAt = t.createdAt;
        t.editing = false;
    });
}

function saveTasks() {
    if (!currentUser) return Promise.resolve();
    const data = tasks.map(t => {
        const { editing, ...rest } = t;
        return rest;
    });
    return setDoc(doc(db, 'users', currentUser.uid), { items: data });
}

function getPriorityInfo(level) {
    switch (level) {
        case 'high':
            return { icon: '🚨', color: 'red' };
        case 'medium':
            return { icon: '⚠️', color: 'orange' };
        default:
            return { icon: '🟢', color: 'green' };
    }
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    if (task.completed) li.classList.add('completed');

    const header = document.createElement('div');
    header.className = 'task-header';

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
        renderTasks(currentFilter);
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
            renderTasks(currentFilter);
        };

        saveBtn.addEventListener('click', finishEditing);
        cancelBtn.addEventListener('click', () => {
            task.editing = false;
            renderTasks(currentFilter);
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                finishEditing();
            } else if (e.key === 'Escape') {
                task.editing = false;
                renderTasks(currentFilter);
            }
        });

        textSpan = input;
        priorityElement = select;
        descElement = descInput;
        header.append(checkbox, textSpan, priorityElement, dueSpan, saveBtn, cancelBtn);
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
        priorityElement.textContent = priInfo.icon;
        priorityElement.style.color = priInfo.color;

        descElement = document.createElement('div');
        descElement.className = 'description';
        descElement.textContent = task.description;

        header.append(checkbox, textSpan, priorityElement, dueSpan);
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
    tagBtn.textContent = '+ Tag';
    tagBtn.addEventListener('click', e => {
        e.stopPropagation();
        openTagSelector(task, tagsDiv);
    });

    const dateBtn = document.createElement('button');
    dateBtn.className = 'date-btn';
    dateBtn.textContent = '📅';
    dateBtn.addEventListener('click', e => {
        e.stopPropagation();
        openDatePicker(task, dueSpan);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        tasks = tasks.filter(t => t !== task);
        saveTasks();
        renderTasks(currentFilter);
    });

    actions.append(tagBtn, dateBtn, deleteBtn);

    li.appendChild(tagsDiv);
    li.appendChild(actions);

    li.addEventListener('click', () => {
        li.classList.toggle('expanded');
    });
    return li;
}

function startEditing(task) {
    tasks.forEach(t => t.editing = false);
    task.editing = true;
    renderTasks(currentFilter);
    const input = taskList.querySelector('.edit-input');
    if (input) input.focus();
}

function addTagElement(tag, container, task) {
    const span = document.createElement('span');
    span.className = 'tag';
    span.style.background = tag.color;
    span.textContent = tag.label;

    const remove = document.createElement('span');
    remove.className = 'remove-tag';
    remove.textContent = '×';
    remove.addEventListener('click', e => {
        e.stopPropagation();
        task.tags = task.tags.filter(t => t !== tag);
        updateTimestamp(task);
        saveTasks();
        renderTasks(currentFilter);
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
            renderTasks(currentFilter);
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
        renderTasks(currentFilter);
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
        remove.textContent = '×';
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

function renderTasks(filter = 'all') {
    taskList.innerHTML = '';
    tasks.forEach(task => {
        if (filter === 'active' && task.completed) return;
        if (filter === 'completed' && !task.completed) return;
        const li = createTaskElement(task);
        taskList.appendChild(li);
    });
    filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    const input = taskList.querySelector('.edit-input');
    if (input) input.focus();
}

addTaskBtn.addEventListener('click', () => {
    if (!currentUser) {
        alert('Please log in to add tasks');
        return;
    }
    const text = taskInput.value.trim();
    if (text) {
        tasks.push({
            text,
            completed: false,
            tags: [...newTags],
            dueDate: newDueDate.value,
            description: newDescription.value.trim(),
            priority: newPriority.value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            editing: false
        });
        taskInput.value = '';
        newDescription.value = '';
        newPriority.value = 'low';
        newDueDate.value = '';
        newTags = [];
        updateNewTagDisplay();
        saveTasks();
        renderTasks(currentFilter);
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
                text,
                completed: false,
                tags: [...newTags],
                dueDate: newDueDate.value,
                description: newDescription.value.trim(),
                priority: newPriority.value,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                editing: false
            });
            taskInput.value = '';
            newDescription.value = '';
            newPriority.value = 'low';
            newDueDate.value = '';
            newTags = [];
            updateNewTagDisplay();
            saveTasks();
            renderTasks(currentFilter);
        }
    }
});

let currentFilter = 'all';
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        renderTasks(currentFilter);
    });
});

