const taskInput = document.getElementById('new-task');
const addTaskBtn = document.getElementById('add-task');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter');

let tasks = [];

// Load tasks from localStorage
function loadTasks() {
    const stored = localStorage.getItem('tasks');
    if (stored) {
        tasks = JSON.parse(stored);
    }
    tasks.forEach(t => {
        if (!t.tags) t.tags = [];
        if (!t.dueDate) t.dueDate = '';
        t.editing = false;
    });
}

function saveTasks() {
    const data = tasks.map(t => {
        const { editing, ...rest } = t;
        return rest;
    });
    localStorage.setItem('tasks', JSON.stringify(data));
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    if (task.completed) li.classList.add('completed');

    const header = document.createElement('div');
    header.className = 'task-header';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        saveTasks();
        renderTasks(currentFilter);
    });

    let textSpan;
    if (task.editing) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'edit-input';
        input.value = task.text;
        const finishEditing = () => {
            task.text = input.value.trim();
            task.editing = false;
            saveTasks();
            renderTasks(currentFilter);
        };
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                finishEditing();
            } else if (e.key === 'Escape') {
                task.editing = false;
                renderTasks(currentFilter);
            }
        });
        input.addEventListener('blur', finishEditing);
        textSpan = input;
    } else {
        textSpan = document.createElement('span');
        textSpan.className = 'text';
        textSpan.textContent = task.text;
        textSpan.addEventListener('click', e => {
            e.stopPropagation();
            startEditing(task);
        });
    }

    const dueSpan = document.createElement('span');
    dueSpan.className = 'due-date';
    updateDueDateSpan(dueSpan, task);

    header.append(checkbox, textSpan, dueSpan);

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'tags';
    task.tags.forEach(tag => addTagElement(tag, tagsDiv, task));

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', e => {
        e.stopPropagation();
        startEditing(task);
    });

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

    if (!task.editing) actions.append(editBtn);
    actions.append(tagBtn, dateBtn, deleteBtn);

    li.appendChild(header);
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
    const finish = () => {
        const label = input.value.trim();
        if (label) {
            task.tags.push({ label, color: color.value });
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
    wrapper.append(input, color, add);
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
        saveTasks();
        renderTasks(currentFilter);
    });
    input.addEventListener('blur', () => input.remove());
    span.appendChild(input);
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
    const text = taskInput.value.trim();
    if (text) {
        tasks.push({ text, completed: false, tags: [], dueDate: '', editing: false });
        taskInput.value = '';
        saveTasks();
        renderTasks(currentFilter);
    }
});

taskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const text = taskInput.value.trim();
        if (text) {
            tasks.push({ text, completed: false, tags: [], dueDate: '', editing: false });
            taskInput.value = '';
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

loadTasks();
renderTasks();
