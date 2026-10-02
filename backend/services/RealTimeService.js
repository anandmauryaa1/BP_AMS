/**
 * RealTimeService - Server-Sent Events (SSE) Hub
 * Enables instant multi-client bi-directional synchronous updates across:
 * - Tasks (created, assigned, updated, completed, deleted)
 * - Projects (stage changes, lead assignments, metadata updates)
 * - Deliverables (Drive / Doc links attached, status transitions)
 * - Attendance (clock-in, clock-out, breaks)
 * - Leaves & Approvals
 * - Notifications
 */

class RealTimeService {
    constructor() {
        this.clients = new Map(); // clientId -> { id, userId, employeeId, role, res }
        this.pingInterval = null;
        this.startHeartbeat();
    }

    startHeartbeat() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 20000); // 20s keep-alive ping
    }

    sendHeartbeat() {
        const payload = `event: ping\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`;
        for (const [clientId, client] of this.clients.entries()) {
            try {
                client.res.write(payload);
            } catch (err) {
                console.warn(`[RealTime] Heartbeat failed for ${clientId}, removing client.`);
                this.removeClient(clientId);
            }
        }
    }

    addClient(clientId, clientData) {
        this.clients.set(clientId, clientData);
        console.log(`[RealTime] Client connected: ${clientId} (${clientData.role || 'GUEST'}, user: ${clientData.userId || 'anon'}). Total active: ${this.clients.size}`);
    }

    removeClient(clientId) {
        if (this.clients.has(clientId)) {
            this.clients.delete(clientId);
            console.log(`[RealTime] Client disconnected: ${clientId}. Total active: ${this.clients.size}`);
        }
    }

    /**
     * Broadcast an event to ALL active connected users
     * @param {string} event - Event name (e.g. 'TASK_UPDATED', 'PROJECT_UPDATED')
     * @param {object} data - Payload data
     */
    broadcast(event, data = {}) {
        const message = `event: ${event}\ndata: ${JSON.stringify({ event, data, timestamp: Date.now() })}\n\n`;
        let sentCount = 0;
        for (const [clientId, client] of this.clients.entries()) {
            try {
                client.res.write(message);
                sentCount++;
            } catch (err) {
                this.removeClient(clientId);
            }
        }
        return sentCount;
    }

    /**
     * Send event to a specific user (by userId or employeeId)
     * @param {string} userIdOrEmployeeId
     * @param {string} event
     * @param {object} data
     */
    sendToUser(userIdOrEmployeeId, event, data = {}) {
        if (!userIdOrEmployeeId) return 0;
        const target = String(userIdOrEmployeeId);
        const message = `event: ${event}\ndata: ${JSON.stringify({ event, data, timestamp: Date.now() })}\n\n`;
        let sentCount = 0;

        for (const [clientId, client] of this.clients.entries()) {
            if (
                client.userId === target ||
                client.employeeId === target ||
                String(client.userId) === target ||
                String(client.employeeId) === target
            ) {
                try {
                    client.res.write(message);
                    sentCount++;
                } catch (err) {
                    this.removeClient(clientId);
                }
            }
        }
        return sentCount;
    }

    /**
     * Send event to all users matching specific roles
     * @param {string[]} roles
     * @param {string} event
     * @param {object} data
     */
    sendToRoles(roles, event, data = {}) {
        if (!Array.isArray(roles) || roles.length === 0) return 0;
        const message = `event: ${event}\ndata: ${JSON.stringify({ event, data, timestamp: Date.now() })}\n\n`;
        let sentCount = 0;

        for (const [clientId, client] of this.clients.entries()) {
            if (roles.includes(client.role)) {
                try {
                    client.res.write(message);
                    sentCount++;
                } catch (err) {
                    this.removeClient(clientId);
                }
            }
        }
        return sentCount;
    }

    getActiveCount() {
        return this.clients.size;
    }
}

export const realTimeService = new RealTimeService();
export default realTimeService;
