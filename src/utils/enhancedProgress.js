const ora = require('ora');
const cliProgress = require('cli-progress');
const chalk = require('chalk');

class EnhancedProgress {
    constructor() {
        this.spinner = null;
        this.progressBar = null;
        this.startTime = null;
        this.steps = new Map();
        this.currentStep = '';
    }

    createMultiBar() {
        return new cliProgress.MultiBar({
            format: `${chalk.cyan('{bar}')} | ${chalk.yellow('{percentage}%')} | ${chalk.blue('{step}')} | {status} | {duration}`,
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true,
            clearOnComplete: false,
            stopOnComplete: true
        });
    }

    start(stepName, totalSteps = 100) {
        this.startTime = Date.now();
        this.currentStep = stepName;
        
        if (this.spinner) {
            this.spinner.stop();
        }

        this.spinner = ora({
            text: stepName,
            spinner: {
                frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
            }
        }).start();

        // Create a new progress bar
        this.progressBar = this.createMultiBar();
        
        // Add initial step
        this.steps.set(stepName, {
            bar: this.progressBar.create(totalSteps, 0, {
                step: stepName,
                status: 'Starting...',
                duration: '0s'
            }),
            startTime: Date.now()
        });
    }

    update(progress, status) {
        const step = this.steps.get(this.currentStep);
        if (step && step.bar) {
            const duration = this.formatDuration(Date.now() - step.startTime);
            step.bar.update(progress, {
                status,
                duration
            });
        }

        if (this.spinner) {
            this.spinner.text = `${this.currentStep}: ${status} (${this.formatDuration(Date.now() - this.startTime)})`;
        }
    }

    addStep(stepName, totalSteps = 100) {
        if (!this.progressBar) return;

        this.steps.set(stepName, {
            bar: this.progressBar.create(totalSteps, 0, {
                step: stepName,
                status: 'Waiting...',
                duration: '0s'
            }),
            startTime: Date.now()
        });
    }

    updateStep(stepName, progress, status) {
        const step = this.steps.get(stepName);
        if (step && step.bar) {
            const duration = this.formatDuration(Date.now() - step.startTime);
            step.bar.update(progress, {
                status,
                duration
            });
        }
    }

    succeed(message) {
        if (this.spinner) {
            this.spinner.succeed(message);
        }

        const step = this.steps.get(this.currentStep);
        if (step && step.bar) {
            step.bar.update(100, {
                status: 'Complete',
                duration: this.formatDuration(Date.now() - step.startTime)
            });
        }
    }

    fail(message) {
        if (this.spinner) {
            this.spinner.fail(message);
        }

        const step = this.steps.get(this.currentStep);
        if (step && step.bar) {
            step.bar.update(0, {
                status: 'Failed',
                duration: this.formatDuration(Date.now() - step.startTime)
            });
        }
    }

    warn(message) {
        if (this.spinner) {
            this.spinner.warn(message);
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    }

    stop() {
        if (this.progressBar) {
            this.progressBar.stop();
        }
        if (this.spinner) {
            this.spinner.stop();
        }
    }
}

module.exports = new EnhancedProgress();
