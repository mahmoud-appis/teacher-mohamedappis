// Data Fetching
async function fetchLessons(grade, term) {
    const response = await fetch(`lessons_grade${grade}_term${term}.json`);
    return await response.json();
}

// Quiz Logic
let currentQuizIndex = 0;
let currentBranch = '';

function submitQuiz(quiz) {
    let score = 0;
    quiz.forEach((q, qIndex) => {
        const selected = document.querySelector(`input[name="q${qIndex}"]:checked`);
        if (selected && parseInt(selected.value) === q.answer) {
            score++;
        }
    });
    const percentage = (score / quiz.length) * 100;
    const result = document.getElementById('quiz-result');
    result.textContent = `نتيجتك: ${percentage}%`;
    if (percentage >= 60) {
        result.textContent += ' - نجحت! الدرس التالي مفتوح.';
        unlockNextLesson();
    } else {
        result.textContent += ' - حاول مجدداً.';
    }
}

function unlockNextLesson() {
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    const term = urlParams.get('term');
    localStorage.setItem(`completed_grade${grade}_term${term}_${currentBranch}_${currentQuizIndex}`, 'true');
    const completed = parseInt(localStorage.getItem(`progress_grade${grade}_term${term}_${currentBranch}`) || 0) + 1;
    localStorage.setItem(`progress_grade${grade}_term${term}_${currentBranch}`, completed);
    loadBranch(currentBranch); // Reload to unlock next
}

// Main Application Logic
// Loading Screen
window.addEventListener('load', () => {
    document.getElementById('loading-screen').style.display = 'none';
});

// Dark Mode Toggle
const toggleButton = document.getElementById('dark-mode-toggle');
if (toggleButton) {
    toggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });
}

// Load Dark Mode Preference
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

// Navigation Functions
function navigateToGrade(grade) {
    window.location.href = `grade.html?grade=${grade}`;
}

function navigateToLessons(term) {
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    window.location.href = `lessons.html?grade=${grade}&term=${term}`;
}

// Grade Page Logic
if (window.location.pathname.endsWith('grade.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    const titles = {1: 'الصف الأول الثانوي', 2: 'الصف الثاني الثانوي', 3: 'الصف الثالث الثانوي'};
    const gradeTitle = document.getElementById('grade-title');
    if (gradeTitle) {
        gradeTitle.textContent = titles[grade] || 'صف غير معروف';
    }
}

// Lessons Page Logic
if (window.location.pathname.endsWith('lessons.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    const term = urlParams.get('term');
    let lessonsData = {};

    // Load Data
    fetchLessons(grade, term).then(data => {
        lessonsData = data;
        loadBranch('نحو'); // Default branch
    });

    // Load Branch
    window.loadBranch = function(branch) {
        currentBranch = branch;
        const lessons = lessonsData[branch] || [];
        const cardsContainer = document.getElementById('lessons-cards');
        if (cardsContainer) {
            cardsContainer.innerHTML = '';

            // Progress Bar
            const progressContainer = document.getElementById('progress-bar-container');
            progressContainer.innerHTML = `<h3>تقدم في ${branch}</h3><div class="progress-bar"><div class="progress"></div></div>`;
            const progress = calculateProgress(branch, lessons.length);
            document.querySelector('.progress').style.width = `${progress}%`;

            lessons.forEach((lesson, index) => {
                const isUnlocked = isLessonUnlocked(grade, term, branch, index);
                const card = document.createElement('div');
                card.className = `card ${isUnlocked ? '' : 'locked'}`;
                card.style.animationDelay = `${index * 0.3}s`; // Staggered animation
                card.dataset.title = lesson.title.toLowerCase(); // For filtering
                card.innerHTML = `
                    <h3>${lesson.title}</h3>
                    <iframe src="${lesson.video}" frameborder="0" allowfullscreen></iframe>
                    <button onclick="startQuiz(${index})" ${isUnlocked ? '' : 'disabled'}>ابدأ الكويز</button>
                `;
                cardsContainer.appendChild(card);
            });
        }
    };

    // Lessons Filter
    const lessonsFilter = document.getElementById('lessons-filter');
    if (lessonsFilter) {
        lessonsFilter.addEventListener('input', () => {
            const filterValue = lessonsFilter.value.toLowerCase();
            const cards = document.querySelectorAll('#lessons-cards .card');
            cards.forEach(card => {
                const title = card.dataset.title;
                card.style.display = title.includes(filterValue) ? 'block' : 'none';
            });
        });
    }

    // Progress Calculation
    function calculateProgress(branch, total) {
        const completed = localStorage.getItem(`progress_grade${grade}_term${term}_${branch}`) || 0;
        return (completed / total) * 100;
    }

    // Check if Lesson Unlocked
    function isLessonUnlocked(grade, term, branch, index) {
        if (index === 0) return true;
        const prevCompleted = localStorage.getItem(`completed_grade${grade}_term${term}_${branch}_${index-1}`);
        return prevCompleted === 'true';
    }

    // Start Quiz
    window.startQuiz = function(index) {
        currentQuizIndex = index;
        const quiz = lessonsData[currentBranch][index].quiz;
        const questionsContainer = document.getElementById('quiz-questions');
        if (questionsContainer) {
            questionsContainer.innerHTML = '';
            document.getElementById('quiz-title').textContent = lessonsData[currentBranch][index].title;
            quiz.forEach((q, qIndex) => {
                const div = document.createElement('div');
                div.innerHTML = `<p>${q.question}</p>`;
                q.options.forEach((opt, optIndex) => {
                    div.innerHTML += `<label><input type="radio" name="q${qIndex}" value="${optIndex}">${opt}</label><br>`;
                });
                questionsContainer.appendChild(div);
            });
            document.getElementById('quiz-modal').style.display = 'flex';
            document.getElementById('submit-quiz').onclick = () => submitQuiz(quiz);
        }
    };

    window.closeQuiz = function() {
        document.getElementById('quiz-modal').style.display = 'none';
    };
}