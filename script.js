class RoutineTracker {
	constructor() {
		this.routines = [];
		this.completions = [];
		this.currentSection = 'dashboard';
		this.init()
	}
	async init() {
		await this.loadData();
		this.setupEventListeners();
		this.setupNavigation();
		this.updateCurrentDate();
		// this.requestNotificationPermission();
		// this.renderDashboard();
		this.renderRoutinesList();
		// this.renderStats();
		// setInterval(() => {
		// 	this.updateCurrentDate();
		// 	this.renderDashboard();
		// 	this.checkUpcomingRoutines()
		// }, 60000)
	}
	async loadData() {
		try {
			const routinesData = localStorage.getItem('routineTracker_routines');
			const completionsData = localStorage.getItem('routineTracker_completions');
			this.routines = routinesData ? JSON.parse(routinesData) : [];
			this.completions = completionsData ? JSON.parse(completionsData) : []
		} catch (e) {
			console.error('Error loading data:', e)
		}
	}
	async saveData() {
		try {
			localStorage.setItem('routineTracker_routines', JSON.stringify(this.routines));
			localStorage.setItem('routineTracker_completions', JSON.stringify(this.completions))
		} catch (e) {
			console.error('Error saving data:', e)
		}
	}
	setupEventListeners() {
		document.getElementById('saveRoutine').onclick = () => this.saveRoutine();
		document.getElementById('clearForm').onclick = () => this.clearForm();
		document.getElementById('routineFrequency').onchange = () => this.handleFrequencyChange();
		document.getElementById('enableNotifications').onclick = () => this.requestNotificationPermission();
		document.getElementById('testNotification').onclick = () => this.testNotification();
		document.getElementById('exportData').onclick = () => this.exportData();
		document.getElementById('clearAllData').onclick = () => this.clearAllData();
		document.getElementById('allowNotifications').onclick = () => this.allowNotifications();
		document.getElementById('denyNotifications').onclick = () => this.hideModal('notificationModal');
		document.getElementById('markComplete').onclick = () => this.markRoutine('complete');
		document.getElementById('markFailed').onclick = () => this.markRoutine('failed');
		document.getElementById('markSkip').onclick = () => this.markRoutine('skip');
		document.getElementById('closeModal').onclick = () => this.hideModal('routineModal');
		document.querySelectorAll('.period-btn').forEach(btn => {
			btn.onclick = () => this.changePeriod(btn.dataset.period)
		})
	}
	setupNavigation() {
		document.querySelectorAll('.nav-btn').forEach(btn => {
			btn.onclick = () => this.showSection(btn.dataset.section)
		})
	}
	showSection(section) {
		document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
		document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
		document.querySelector(`[data-section="${section}"]`).classList.add('active');
		document.getElementById(section).classList.add('active');
		this.currentSection = section;
		if (section === 'stats') this.renderStats()
	}
	updateCurrentDate() {
		const now = new Date();
		document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		})
	}
	handleFrequencyChange() {
		const frequency = document.getElementById('routineFrequency').value;
		document.querySelectorAll('.frequency-options').forEach(opt => opt.style.display = 'none');
		if (frequency) document.getElementById(`${frequency}Options`).style.display = 'block'
	}
	saveRoutine() {
		const name = document.getElementById('routineName').value.trim();
		const description = document.getElementById('routineDescription').value.trim();
		const frequency = document.getElementById('routineFrequency').value;
		if (!name || !frequency) {
			this.showMessage('Please fill in routine name and frequency', 'error');
			return
		}
		const routine = {
			id: Date.now().toString(),
			name,
			description,
			frequency,
			createdAt: new Date().toISOString()
		};
		if (frequency === 'daily') {
			routine.time = document.getElementById('dailyTime').value;
			if (!routine.time) {
				this.showMessage('Please set a time for daily routine', 'error');
				return
			}
		} else if (frequency === 'weekly') {
			const days = Array.from(document.querySelectorAll('#weeklyOptions input[type="checkbox"]:checked')).map(cb => parseInt(cb.value));
			routine.days = days;
			routine.time = document.getElementById('weeklyTime').value;
			if (days.length === 0 || !routine.time) {
				this.showMessage('Please select days and time for weekly routine', 'error');
				return
			}
		} else if (frequency === 'monthly') {
			routine.dayOfMonth = parseInt(document.getElementById('monthlyDate').value);
			routine.time = document.getElementById('monthlyTime').value;
			if (!routine.dayOfMonth || !routine.time) {
				this.showMessage('Please set day and time for monthly routine', 'error');
				return
			}
		} else if (frequency === 'yearly') {
			routine.month = parseInt(document.getElementById('yearlyMonth').value);
			routine.dayOfMonth = parseInt(document.getElementById('yearlyDate').value);
			routine.time = document.getElementById('yearlyTime').value;
			if (routine.month === undefined || !routine.dayOfMonth || !routine.time) {
				this.showMessage('Please set month, day and time for yearly routine', 'error');
				return
			}
		} else if (frequency === 'infinite') {
			routine.startDate = document.getElementById('infiniteStartDate').value;
			routine.time = document.getElementById('infiniteTime').value;
			if (!routine.startDate || !routine.time) {
				this.showMessage('Please set start date and time for infinite routine', 'error');
				return
			}
		}
		this.routines.push(routine);
		this.saveData();
		this.clearForm();
		this.renderRoutinesList();
		this.renderDashboard();
		this.showMessage('Routine saved successfully!', 'success')
	}
	clearForm() {
		document.getElementById('routineName').value = '';
		document.getElementById('routineDescription').value = '';
		document.getElementById('routineFrequency').value = '';
		document.querySelectorAll('.frequency-options').forEach(opt => opt.style.display = 'none');
		document.querySelectorAll('input[type="time"], input[type="number"], input[type="date"]').forEach(input => input.value = '');
		document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false)
	}
	renderDashboard() {
		const today = new Date();
		const todayRoutines = this.getTodayRoutines(today);
		const container = document.getElementById('todayRoutines');
		if (todayRoutines.length === 0) {
			container.innerHTML = '<div class="empty-state"><h3>No routines for today</h3><p>Add some routines to get started!</p></div>';
			return
		}
		container.innerHTML = todayRoutines.map(routine => {
			const completion = this.getCompletionForDate(routine.id, today);
			const status = completion ? completion.status : 'pending';
			const timeStr = this.formatTime(routine.time);
			return `<div class="routine-item ${status}"><div class="routine-header"><div><div class="routine-name">${routine.name}</div><div class="routine-time">${timeStr}</div></div></div>${routine.description?`<div class="routine-description">${routine.description}</div>`:''}${status==='pending'?`<div class="routine-actions"><button class="action-btn-small btn-success" onclick="app.markRoutineFromDashboard('${routine.id}','complete')">✅ Done</button><button class="action-btn-small btn-danger" onclick="app.markRoutineFromDashboard('${routine.id}','failed')">❌ Failed</button></div>`:`<div class="routine-status">${status==='complete'?'✅ Completed':status==='failed'?'❌ Failed':'⏭️ Skipped'}</div>`}</div>`
		}).join('');
		this.renderUpcomingRoutines()
	}
	renderUpcomingRoutines() {
		const upcoming = this.getUpcomingRoutines();
		const container = document.getElementById('upcomingRoutines');
		if (upcoming.length === 0) {
			container.innerHTML = '<div class="empty-state"><p>No upcoming routines in the next 2 hours</p></div>';
			return
		}
		container.innerHTML = upcoming.map(item => `<div class="upcoming-item"><div class="upcoming-info"><h4>${item.routine.name}</h4><span>${this.formatTime(item.routine.time)}</span></div><div class="time-until">${item.timeUntil}</div></div>`).join('')
	}
	getTodayRoutines(date) {
		return this.routines.filter(routine => {
			if (routine.frequency === 'daily') return true;
			if (routine.frequency === 'weekly') return routine.days.includes(date.getDay());
			if (routine.frequency === 'monthly') return date.getDate() === routine.dayOfMonth;
			if (routine.frequency === 'yearly') return date.getMonth() === routine.month && date.getDate() === routine.dayOfMonth;
			if (routine.frequency === 'infinite') {
				const startDate = new Date(routine.startDate);
				return date >= startDate
			}
			return false
		})
	}
	getUpcomingRoutines() {
		const now = new Date();
		const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
		const upcoming = [];
		const todayRoutines = this.getTodayRoutines(now);
		todayRoutines.forEach(routine => {
			const [hours, minutes] = routine.time.split(':').map(Number);
			const routineTime = new Date(now);
			routineTime.setHours(hours, minutes, 0, 0);
			if (routineTime > now && routineTime <= twoHoursLater) {
				const completion = this.getCompletionForDate(routine.id, now);
				if (!completion || completion.status === 'pending') {
					const timeUntil = Math.round((routineTime - now) / 60000);
					upcoming.push({
						routine,
						timeUntil: `${timeUntil}m`
					})
				}
			}
		});
		return upcoming.sort((a, b) => a.timeUntil - b.timeUntil)
	}
	markRoutineFromDashboard(routineId, status) {
		const today = new Date();
		this.markCompletion(routineId, today, status);
		this.renderDashboard();
		this.renderStats()
	}
	markCompletion(routineId, date, status) {
		const dateStr = date.toDateString();
		const existingIndex = this.completions.findIndex(c => c.routineId === routineId && c.date === dateStr);
		const completion = {
			routineId,
			date: dateStr,
			status,
			timestamp: new Date().toISOString()
		};
		if (existingIndex >= 0) this.completions[existingIndex] = completion;
		else this.completions.push(completion);
		this.saveData()
	}
	getCompletionForDate(routineId, date) {
		const dateStr = date.toDateString();
		return this.completions.find(c => c.routineId === routineId && c.date === dateStr)
	}
	renderRoutinesList() {
		const container = document.getElementById('routinesList');
		if (this.routines.length === 0) {
			container.innerHTML = '<div class="empty-state"><h3>No routines yet</h3><p>Create your first routine above!</p></div>';
			return
		}
		container.innerHTML = this.routines.map(routine => `<div class="routine-list-item"><div class="routine-list-header"><div><div class="routine-list-name">${routine.name}</div>${routine.description?`<div class="routine-description">${routine.description}</div>`:''}</div><div class="routine-frequency">${routine.frequency}</div></div><button class="routine-delete" onclick="app.deleteRoutine('${routine.id}')" title="Delete routine">🗑️</button></div>`).join('')
	}
	deleteRoutine(routineId) {
		if (confirm('Are you sure you want to delete this routine? This will also remove all completion history.')) {
			this.routines = this.routines.filter(r => r.id !== routineId);
			this.completions = this.completions.filter(c => c.routineId !== routineId);
			this.saveData();
			this.renderRoutinesList();
			this.renderDashboard();
			this.renderStats();
			this.showMessage('Routine deleted successfully', 'success')
		}
	}
	renderStats() {
		this.updateOverallStats();
		this.updateDetailedStats();
		this.updateProgressChart()
	}
	updateOverallStats() {
		document.getElementById('totalRoutines').textContent = this.routines.length;
		const completions = this.completions.filter(c => c.status === 'complete');
		const totalAttempts = this.completions.length;
		const overallRate = totalAttempts > 0 ? Math.round((completions.length / totalAttempts) * 100) : 0;
		document.getElementById('overallCompletion').textContent = `${overallRate}%`;
		document.getElementById('totalCompleted').textContent = completions.length;
		document.getElementById('currentStreak').textContent = this.calculateCurrentStreak()
	}
	calculateCurrentStreak() {
		let streak = 0;
		const today = new Date();
		let currentDate = new Date(today);
		while (true) {
			const dayRoutines = this.getTodayRoutines(currentDate);
			if (dayRoutines.length === 0) {
				currentDate.setDate(currentDate.getDate() - 1);
				continue
			}
			const dayCompletions = dayRoutines.filter(routine => {
				const completion = this.getCompletionForDate(routine.id, currentDate);
				return completion && completion.status === 'complete'
			});
			if (dayCompletions.length === dayRoutines.length) {
				streak++;
				currentDate.setDate(currentDate.getDate() - 1)
			} else break
		}
		return streak
	}
	updateDetailedStats() {
		const container = document.getElementById('detailedStats');
		if (this.routines.length === 0) {
			container.innerHTML = '<div class="empty-state"><p>No routine statistics available</p></div>';
			return
		}
		const stats = this.routines.map(routine => {
			const routineCompletions = this.completions.filter(c => c.routineId === routine.id);
			const completed = routineCompletions.filter(c => c.status === 'complete').length;
			const total = routineCompletions.length;
			const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
			return {
				name: routine.name,
				percentage,
				completed,
				total
			}
		});
		container.innerHTML = stats.map(stat => `<div class="routine-stat"><div class="routine-stat-name">${stat.name}</div><div class="routine-stat-percentage">${stat.percentage}% (${stat.completed}/${stat.total})</div></div>`).join('')
	}
	updateProgressChart() {
		const container = document.getElementById('progressChart');
		const last7Days = [];
		const today = new Date();
		for (let i = 6; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			last7Days.push(date)
		}
		const chartData = last7Days.map(date => {
			const dayRoutines = this.getTodayRoutines(date);
			const completed = dayRoutines.filter(routine => {
				const completion = this.getCompletionForDate(routine.id, date);
				return completion && completion.status === 'complete'
			}).length;
			const total = dayRoutines.length;
			return {
				date: date.toLocaleDateString('en-US', {
					weekday: 'short'
				}),
				percentage: total > 0 ? Math.round((completed / total) * 100) : 0
			}
		});
		container.innerHTML = `<div style="width:100%">${chartData.map(day=>`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span style="font-size:12px;opacity:0.8;">${day.date}</span><div style="flex:1;margin:0 10px;"><div class="progress-bar"><div class="progress-fill" style="width:${day.percentage}%"></div></div></div><span style="font-size:12px;font-weight:600;">${day.percentage}%</span></div>`).join('')}</div>`
	}
	changePeriod(period) {
		document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
		document.querySelector(`[data-period="${period}"]`).classList.add('active')
	}
	async requestNotificationPermission() {
		if ('Notification' in window) {
			if (Notification.permission === 'default') {
				document.getElementById('notificationModal').style.display = 'flex'
			} else if (Notification.permission === 'granted') {
				this.scheduleNotifications()
			}
		}
	}
	async allowNotifications() {
		const permission = await Notification.requestPermission();
		if (permission === 'granted') {
			this.showMessage('Notifications enabled! You\'ll get reminders 10 minutes before each routine.', 'success');
			this.scheduleNotifications()
		} else {
			this.showMessage('Notifications denied. You can enable them later in your browser settings.', 'error')
		}
		this.hideModal('notificationModal')
	}
	scheduleNotifications() {
		if (Notification.permission !== 'granted') return;
		this.clearScheduledNotifications();
		const today = new Date();
		const todayRoutines = this.getTodayRoutines(today);
		todayRoutines.forEach(routine => {
			const completion = this.getCompletionForDate(routine.id, today);
			if (!completion || completion.status === 'pending') {
				const [hours, minutes] = routine.time.split(':').map(Number);
				const routineTime = new Date(today);
				routineTime.setHours(hours, minutes, 0, 0);
				const notificationTime = new Date(routineTime.getTime() - 10 * 60 * 1000);
				if (notificationTime > new Date()) {
					const timeoutId = setTimeout(() => {
						new Notification(`Routine Reminder: ${routine.name}`, {
							body: `Your routine "${routine.name}" is starting in 10 minutes!`,
							icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%234f79a4"/><text x="50" y="55" font-size="40" text-anchor="middle" fill="white">📅</text></svg>',
							badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%234f79a4"/><text x="50" y="55" font-size="40" text-anchor="middle" fill="white">📅</text></svg>'
						})
					}, notificationTime.getTime() - Date.now());
					this.notifications.push(timeoutId)
				}
			}
		})
	}
	clearScheduledNotifications() {
		this.notifications.forEach(id => clearTimeout(id));
		this.notifications = []
	}
	testNotification() {
		if (Notification.permission === 'granted') {
			new Notification('Test Notification', {
				body: 'Notifications are working correctly!',
				icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%234f79a4"/><text x="50" y="55" font-size="40" text-anchor="middle" fill="white">📅</text></svg>'
			})
		} else {
			this.showMessage('Please enable notifications first', 'error')
		}
	}
	checkUpcomingRoutines() {
		this.renderUpcomingRoutines()
	}
	exportData() {
		const data = {
			routines: this.routines,
			completions: this.completions,
			exportDate: new Date().toISOString()
		};
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `routine-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		this.showMessage('Data exported successfully!', 'success')
	}
	clearAllData() {
		if (confirm('Are you sure you want to clear all data? This cannot be undone!')) {
			this.routines = [];
			this.completions = [];
			this.clearScheduledNotifications();
			localStorage.removeItem('routineTracker_routines');
			localStorage.removeItem('routineTracker_completions');
			this.renderDashboard();
			this.renderRoutinesList();
			this.renderStats();
			this.showMessage('All data cleared successfully', 'success')
		}
	}
	formatTime(timeStr) {
		if (!timeStr) return '';
		const [hours, minutes] = timeStr.split(':');
		const hour12 = hours % 12 || 12;
		const ampm = hours >= 12 ? 'PM' : 'AM';
		return `${hour12}:${minutes} ${ampm}`
	}
	showMessage(text, type = 'info') {
		const existing = document.querySelector('.message');
		if (existing) existing.remove();
		const msg = document.createElement('div');
		msg.className = `message ${type}`;
		msg.textContent = text;
		document.querySelector('.container').insertBefore(msg, document.querySelector('.container').firstChild);
		setTimeout(() => msg.remove(), 3000)
	}
	showModal(modalId, data = {}) {
		document.getElementById(modalId).style.display = 'flex';
		if (modalId === 'routineModal' && data.routine) {
			document.getElementById('routineModalTitle').textContent = `Mark: ${data.routine.name}`;
			document.getElementById('routineModalDescription').textContent = `Time: ${this.formatTime(data.routine.time)}`
		}
	}
	hideModal(modalId) {
		document.getElementById(modalId).style.display = 'none'
	}
	markRoutine(status) {
		this.hideModal('routineModal')
	}
}
const app = new RoutineTracker();
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('sw.js').catch(() => console.log('SW registration failed'))
}