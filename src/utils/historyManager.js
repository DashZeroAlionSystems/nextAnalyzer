import fs from 'fs';
import path from 'path';

class HistoryManager {
    constructor() {
        this.historyDir = path.join(process.cwd(), 'history');
        this.ensureHistoryDir();
        this.cache = new Map();
    }

    ensureHistoryDir() {
        if (!fs.existsSync(this.historyDir)) {
            fs.mkdirSync(this.historyDir, { recursive: true });
        }
    }

    generateKey(type, data) {
        // Create a unique key based on analysis type and data content
        const contentHash = Buffer.from(JSON.stringify(data)).toString('base64');
        return `${type}_${contentHash.substring(0, 10)}`;
    }

    async saveHistory(type, data, results) {
        const key = this.generateKey(type, data);
        const timestamp = new Date().toISOString();
        
        const historyEntry = {
            timestamp,
            type,
            data,
            results,
        };

        // Save to cache
        this.cache.set(key, historyEntry);

        // Save to disk
        const historyFile = path.join(this.historyDir, `${key}.json`);
        fs.writeFileSync(historyFile, JSON.stringify(historyEntry, null, 2));

        return key;
    }

    async getHistory(type, data) {
        const key = this.generateKey(type, data);

        // Check cache first
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        // Check disk
        const historyFile = path.join(this.historyDir, `${key}.json`);
        if (fs.existsSync(historyFile)) {
            const historyEntry = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
            this.cache.set(key, historyEntry); // Cache it for future use
            return historyEntry;
        }

        return null;
    }

    async compareWithHistory(type, data, currentResults) {
        const previousEntry = await this.getHistory(type, data);
        if (!previousEntry) return null;

        const changes = {
            metrics: this.compareMetrics(previousEntry.results.metrics, currentResults.metrics),
            newFindings: currentResults.findings.filter(f => 
                !previousEntry.results.findings.some(pf => 
                    JSON.stringify(pf) === JSON.stringify(f)
                )
            ),
            newRecommendations: currentResults.recommendations.filter(r =>
                !previousEntry.results.recommendations.includes(r)
            )
        };

        return {
            timestamp: previousEntry.timestamp,
            changes
        };
    }

    compareMetrics(previous, current) {
        const changes = {};
        
        for (const [key, value] of Object.entries(current)) {
            if (typeof value === 'object') {
                changes[key] = this.compareMetrics(previous[key] || {}, value);
            } else {
                const previousValue = previous[key] || 0;
                if (value !== previousValue) {
                    changes[key] = {
                        previous: previousValue,
                        current: value,
                        difference: value - previousValue
                    };
                }
            }
        }

        return changes;
    }

    async cleanupOldHistory(daysToKeep = 30) {
        const files = fs.readdirSync(this.historyDir);
        const now = new Date();

        for (const file of files) {
            const filePath = path.join(this.historyDir, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const entryDate = new Date(content.timestamp);
            
            const daysDifference = (now - entryDate) / (1000 * 60 * 60 * 24);
            
            if (daysDifference > daysToKeep) {
                fs.unlinkSync(filePath);
                // Remove from cache if exists
                const key = path.basename(file, '.json');
                this.cache.delete(key);
            }
        }
    }
}

export default new HistoryManager();
