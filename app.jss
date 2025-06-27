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
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    if (task.completed) li.classList.add('completed');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        saveTasks();
        renderTasks();
    });

    const textSpan = document.createElement('span');
    textSpan.className = 'text';
    textSpan.textContent = task.text;
    textSpan.addEventListener('click', () => startEditing(task, textSpan));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', () => {
        tasks = tasks.filter(t => t !== task);
        saveTasks();
        renderTasks();
    });

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(deleteBtn);
    return li;
}

function startEditing(task, textSpan) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = task.text;
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            finishEditing();
        }
    });
    const finishEditing = () => {
        task.text = input.value.trim();
        saveTasks();
        renderTasks();
    };
    input.addEventListener('blur', finishEditing);
    textSpan.replaceWith(input);
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
}

addTaskBtn.addEventListener('click', () => {
    const text = taskInput.value.trim();
    if (text) {
        tasks.push({ text, completed: false });
        taskInput.value = '';
        saveTasks();
        renderTasks(currentFilter);
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
