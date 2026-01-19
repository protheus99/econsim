// js/core/GameClock.js
export class GameClock {
    constructor(startingYear = 2025) {
        this.year = startingYear;
        this.month = 1;
        this.day = 1;
        this.hour = 0;
        this.isPaused = false;
        this.startTime = Date.now();
    }

    tick() {
        if (this.isPaused) return;

        this.hour++;
        if (this.hour >= 24) {
            this.hour = 0;
            this.day++;
            this.emit('day-change');
        }
        if (this.day > 30) {
            this.day = 1;
            this.month++;
            this.emit('month-change');
        }
        if (this.month > 12) {
            this.month = 1;
            this.year++;
            this.emit('year-change');
        }
    }

    getFormatted() {
        return `${this.year}-${String(this.month).padStart(2, '0')}-${String(this.day).padStart(2, '0')} ${String(this.hour).padStart(2, '0')}:00`;
    }

    getGameTime() {
        return {
            year: this.year,
            month: this.month,
            day: this.day,
            hour: this.hour
        };
    }

    getElapsed() {
        const elapsed = Date.now() - this.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    emit(event) {
        window.dispatchEvent(new CustomEvent(`clock-${event}`, {
            detail: this.getGameTime()
        }));
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }
}
