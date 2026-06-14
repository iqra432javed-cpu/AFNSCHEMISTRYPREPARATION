/* =====================================================
   IMORIA LEARNING — MAIN JS
   localStorage-backed progress tracking + quiz logic
   ===================================================== */

const STORAGE_KEYS = {
    READ_CHAPTERS: 'imoria_read_chapters',      // array of chapter numbers marked read
    QUIZ_SCORES: 'imoria_quiz_scores',          // { "1": {score, total, date}, ... }
    MOCK_HISTORY: 'imoria_mock_history'         // array of {date, score, total, percent, passed}
};

const TOTAL_CHAPTERS = 13;
const QUESTIONS_PER_CHAPTER = 20;
const MOCK_TOTAL_QUESTIONS = 50;
const MOCK_PASS_SCORE = 40;

/* ===================== STORAGE HELPERS ===================== */

function safeGet(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function safeSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}

function getReadChapters() {
    return safeGet(STORAGE_KEYS.READ_CHAPTERS, []);
}

function getQuizScores() {
    return safeGet(STORAGE_KEYS.QUIZ_SCORES, {});
}

function getMockHistory() {
    return safeGet(STORAGE_KEYS.MOCK_HISTORY, []);
}

/* ===================== CHAPTER QUIZ CHECKER (mcqs.html) ===================== */

function checkChapterQuiz(chapterNum) {
    const form = document.querySelector(`form[data-chapter="${chapterNum}"]`);
    if (!form) return;

    let score = 0;
    let unanswered = 0;

    form.querySelectorAll('.option-label').forEach(label => {
        label.classList.remove('correct-answer', 'wrong-answer');
    });

    for (let i = 1; i <= QUESTIONS_PER_CHAPTER; i++) {
        const name = `ch${chapterNum}q${i}`;
        const options = form.querySelectorAll(`input[name="${name}"]`);
        if (options.length === 0) continue;

        const selected = form.querySelector(`input[name="${name}"]:checked`);

        options.forEach(opt => {
            const label = opt.parentElement;
            if (opt.value === 'correct') {
                label.classList.add('correct-answer');
            } else if (selected && opt === selected && opt.value !== 'correct') {
                label.classList.add('wrong-answer');
            }
        });

        if (!selected) {
            unanswered++;
        } else if (selected.value === 'correct') {
            score++;
        }
    }

    const feedback = document.getElementById(`feedback-ch${chapterNum}`);
    const percentage = Math.round((score / QUESTIONS_PER_CHAPTER) * 100);
    const passed = score >= (QUESTIONS_PER_CHAPTER * 0.6);

    feedback.textContent = `Score: ${score}/${QUESTIONS_PER_CHAPTER} (${percentage}%)` +
        (unanswered > 0 ? ` — ${unanswered} unanswered` : '') +
        (passed ? ' — Great job!' : ' — Review this chapter again.');

    feedback.className = 'feedback ' + (passed ? 'pass' : 'fail');
    feedback.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Save best score to localStorage
    const scores = getQuizScores();
    const existing = scores[chapterNum];
    if (!existing || score > existing.score) {
        scores[chapterNum] = { score, total: QUESTIONS_PER_CHAPTER, date: new Date().toISOString() };
        safeSet(STORAGE_KEYS.QUIZ_SCORES, scores);
    }

    updateBestScoreBadge(chapterNum);
}

function updateBestScoreBadge(chapterNum) {
    const badge = document.getElementById(`best-score-ch${chapterNum}`);
    if (!badge) return;
    const scores = getQuizScores();
    const record = scores[chapterNum];
    if (record) {
        badge.textContent = `Best: ${record.score}/${record.total}`;
        badge.classList.remove('empty');
    } else {
        badge.textContent = 'Not attempted';
        badge.classList.add('empty');
    }
}

function initQuizBadges() {
    for (let i = 1; i <= TOTAL_CHAPTERS; i++) {
        updateBestScoreBadge(i);
    }
}

/* ===================== MOCK TEST (practice-test.html) ===================== */

let timerInterval = null;
let secondsLeft = 1800;
let testStarted = false;

function startTest() {
    document.getElementById('test-intro').style.display = 'none';
    document.getElementById('test-area').style.display = 'block';
    window.scrollTo(0, 0);
    testStarted = true;
    timerInterval = setInterval(tickTimer, 1000);
}

function tickTimer() {
    secondsLeft--;
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const display = document.getElementById('timer-display');
    display.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

    const answered = document.querySelectorAll('#mock-test-form input[type="radio"]:checked').length;
    document.getElementById('progress-text').textContent = `${answered} of ${MOCK_TOTAL_QUESTIONS} answered`;

    if (secondsLeft <= 60) {
        display.style.color = '#C0392B';
    }
    if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        submitTest(true);
    }
}

function submitTest(timeUp = false) {
    if (!testStarted) return;
    clearInterval(timerInterval);

    const form = document.getElementById('mock-test-form');
    const allQuestions = form.querySelectorAll('.question-block');
    let score = 0;
    let unanswered = 0;
    let breakdownHTML = '';

    allQuestions.forEach((block, idx) => {
        const qNum = idx + 1;
        const selected = block.querySelector('input[type="radio"]:checked');

        if (!selected) {
            unanswered++;
            breakdownHTML += `<div class="breakdown-item incorrect">Q${qNum}: Not answered</div>`;
        } else if (selected.value === 'correct') {
            score++;
            breakdownHTML += `<div class="breakdown-item correct">Q${qNum}: Correct</div>`;
        } else {
            const correctOption = block.querySelector('input[value="correct"]');
            const correctText = correctOption ? correctOption.parentElement.textContent.trim() : '';
            breakdownHTML += `<div class="breakdown-item incorrect">Q${qNum}: Incorrect — Correct: ${correctText}</div>`;
        }
    });

    const percentage = Math.round((score / MOCK_TOTAL_QUESTIONS) * 100);
    const passed = score >= MOCK_PASS_SCORE;

    document.getElementById('test-area').style.display = 'none';
    const resultPanel = document.getElementById('result-panel');
    resultPanel.style.display = 'block';

    document.getElementById('result-title').textContent = timeUp ? 'Time Up!' : 'Test Complete';
    document.getElementById('score-value').textContent = score;
    document.getElementById('result-percentage').textContent = `${percentage}% accuracy · ${unanswered} unanswered`;
    document.getElementById('result-verdict').textContent = passed
        ? 'PASS — Excellent work! You are well prepared for AFNS.'
        : 'RETAIN & REVISE — Review the chapters where you made errors, then retake.';
    document.getElementById('result-verdict').className = passed ? 'verdict-text pass' : 'verdict-text fail';
    document.getElementById('result-breakdown').innerHTML = breakdownHTML;
    window.scrollTo(0, 0);

    // Save attempt to history
    const history = getMockHistory();
    history.unshift({
        date: new Date().toISOString(),
        score,
        total: MOCK_TOTAL_QUESTIONS,
        percent: percentage,
        passed
    });
    safeSet(STORAGE_KEYS.MOCK_HISTORY, history.slice(0, 10)); // keep last 10
}

function restartTest() {
    clearInterval(timerInterval);
    secondsLeft = 1800;
    testStarted = false;
    document.getElementById('mock-test-form').reset();
    document.getElementById('result-panel').style.display = 'none';
    document.getElementById('timer-display').textContent = '30:00';
    document.getElementById('timer-display').style.color = '';
    document.getElementById('progress-text').textContent = `0 of ${MOCK_TOTAL_QUESTIONS} answered`;
    document.getElementById('test-intro').style.display = 'block';
    renderMockHistory();
    window.scrollTo(0, 0);
}

function renderMockHistory() {
    const container = document.getElementById('mock-history-list');
    if (!container) return;
    const history = getMockHistory();

    if (history.length === 0) {
        container.innerHTML = '<p class="history-empty">No attempts yet — your results will appear here.</p>';
        return;
    }

    container.innerHTML = history.map(item => {
        const date = new Date(item.date);
        const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return `<div class="history-item">
            <span class="h-date">${dateStr}</span>
            <span class="h-score">${item.score}/${item.total} (${item.percent}%)</span>
            <span class="h-verdict ${item.passed ? 'pass' : 'fail'}">${item.passed ? 'PASS' : 'RETAIN'}</span>
        </div>`;
    }).join('');
}

/* ===================== NOTES PAGE — MARK AS READ ===================== */

function toggleChapterRead(chapterNum) {
    let read = getReadChapters();
    const idx = read.indexOf(chapterNum);
    if (idx === -1) {
        read.push(chapterNum);
    } else {
        read.splice(idx, 1);
    }
    safeSet(STORAGE_KEYS.READ_CHAPTERS, read);
    updateReadUI(chapterNum);
}

function updateReadUI(chapterNum) {
    const read = getReadChapters();
    const isRead = read.includes(chapterNum);

    const btn = document.getElementById(`mark-read-ch${chapterNum}`);
    if (btn) {
        btn.textContent = isRead ? 'Read ✓' : 'Mark as read';
        btn.classList.toggle('is-read', isRead);
    }

    const check = document.getElementById(`sidebar-check-${chapterNum}`);
    if (check) {
        check.classList.toggle('done', isRead);
        check.textContent = isRead ? '✓' : '';
    }
}

function initNotesProgress() {
    for (let i = 1; i <= TOTAL_CHAPTERS; i++) {
        updateReadUI(i);
    }
}

/* ===================== HOMEPAGE — ATOM PROGRESS DASHBOARD ===================== */

function initHomeDashboard() {
    const atomWrap = document.getElementById('atom-diagram');
    if (!atomWrap) return; // not on homepage

    const readChapters = getReadChapters();
    const quizScores = getQuizScores();
    const mockHistory = getMockHistory();

    // 1. Notes read progress
    const notesRead = readChapters.length;
    const notesPercent = Math.round((notesRead / TOTAL_CHAPTERS) * 100);

    // 2. Quiz progress (chapters attempted + average %)
    const quizChapterKeys = Object.keys(quizScores);
    const quizAttempted = quizChapterKeys.length;
    let quizTotalPercent = 0;
    quizChapterKeys.forEach(ch => {
        const rec = quizScores[ch];
        quizTotalPercent += (rec.score / rec.total) * 100;
    });
    const quizAvgPercent = quizAttempted > 0 ? Math.round(quizTotalPercent / quizAttempted) : 0;
    const quizCoveragePercent = Math.round((quizAttempted / TOTAL_CHAPTERS) * 100);

    // 3. Mock test best score
    let mockBestPercent = 0;
    let mockAttempts = mockHistory.length;
    if (mockHistory.length > 0) {
        mockBestPercent = Math.max(...mockHistory.map(h => h.percent));
    }

    // Overall combined readiness score (weighted average)
    const overall = Math.round((notesPercent * 0.3) + (quizCoveragePercent * 0.3) + (mockBestPercent * 0.4));

    // Update center label
    document.getElementById('atom-overall-pct').textContent = `${overall}%`;

    // Update stat bars
    setBar('bar-notes', notesPercent, `${notesRead}/${TOTAL_CHAPTERS}`);
    setBar('bar-quizzes', quizCoveragePercent, `${quizAttempted}/${TOTAL_CHAPTERS}`, quizAvgPercent > 0 ? ` (avg ${quizAvgPercent}%)` : '');
    setBar('bar-mock', mockBestPercent, mockAttempts > 0 ? `${mockBestPercent}%` : '—');

    // Render the orbital rings filled proportionally
    renderAtomRings(notesPercent, quizCoveragePercent, mockBestPercent);
}

function setBar(id, percent, valueText, suffix = '') {
    const fill = document.getElementById(id);
    const val = document.getElementById(id + '-val');
    if (fill) fill.style.width = `${percent}%`;
    if (val) val.textContent = valueText + suffix;
}

function renderAtomRings(notesPercent, quizPercent, mockPercent) {
    // Each ring is a circle; we use stroke-dasharray to show "fill" proportionally
    const rings = [
        { id: 'ring-1', percent: notesPercent, radius: 50 },
        { id: 'ring-2', percent: quizPercent, radius: 75 },
        { id: 'ring-3', percent: mockPercent, radius: 100 }
    ];

    rings.forEach(ring => {
        const circle = document.getElementById(ring.id);
        if (!circle) return;
        const circumference = 2 * Math.PI * ring.radius;
        const offset = circumference - (ring.percent / 100) * circumference;
        circle.style.strokeDasharray = `${circumference}`;
        circle.style.strokeDashoffset = `${offset}`;
    });
}

function resetAllProgress() {
    if (!confirm('This will erase all saved progress (notes read, quiz scores, mock test history) on this device. Continue?')) {
        return;
    }
    localStorage.removeItem(STORAGE_KEYS.READ_CHAPTERS);
    localStorage.removeItem(STORAGE_KEYS.QUIZ_SCORES);
    localStorage.removeItem(STORAGE_KEYS.MOCK_HISTORY);
    initHomeDashboard();
}

/* ===================== SHARED INIT ===================== */

document.addEventListener('DOMContentLoaded', () => {
    // Homepage dashboard
    initHomeDashboard();

    // Notes page
    initNotesProgress();

    // Quiz page badges
    initQuizBadges();

    // Mock test history
    renderMockHistory();

    // Smooth scroll + active highlight for notes sidebar
    const sidebarLinks = document.querySelectorAll('.notes-sidebar a[href^="#"]');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    const chapters = document.querySelectorAll('.chapter-block');
    if (chapters.length > 0 && sidebarLinks.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    sidebarLinks.forEach(link => link.classList.remove('active'));
                    const activeLink = document.querySelector(`.notes-sidebar a[href="#${entry.target.id}"]`);
                    if (activeLink) activeLink.classList.add('active');
                }
            });
        }, { rootMargin: '-20% 0px -70% 0px' });

        chapters.forEach(chapter => observer.observe(chapter));
    }
});
