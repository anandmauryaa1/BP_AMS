import { describe, it, expect, vi, beforeEach } from 'vitest';
import { realTimeService } from '../services/RealTimeService.js';

describe('RealTimeService SSE Hub', () => {
  beforeEach(() => {
    // Clear clients map
    realTimeService.clients.clear();
  });

  it('should register and remove SSE clients cleanly', () => {
    const mockRes = {
      write: vi.fn(),
    };

    realTimeService.addClient('client-1', {
      id: 'client-1',
      userId: 'user-123',
      role: 'ADMIN',
      res: mockRes,
    });

    expect(realTimeService.getActiveCount()).toBe(1);

    realTimeService.removeClient('client-1');
    expect(realTimeService.getActiveCount()).toBe(0);
  });

  it('should broadcast event to all connected clients', () => {
    const mockRes1 = { write: vi.fn() };
    const mockRes2 = { write: vi.fn() };

    realTimeService.addClient('c1', { id: 'c1', userId: 'u1', role: 'EMPLOYEE', res: mockRes1 });
    realTimeService.addClient('c2', { id: 'c2', userId: 'u2', role: 'ADMIN', res: mockRes2 });

    const sentCount = realTimeService.broadcast('TASK_UPDATED', { taskId: 't-99', status: 'COMPLETED' });

    expect(sentCount).toBe(2);
    expect(mockRes1.write).toHaveBeenCalled();
    expect(mockRes2.write).toHaveBeenCalled();
    expect(mockRes1.write.mock.calls[0][0]).toContain('event: TASK_UPDATED');
    expect(mockRes1.write.mock.calls[0][0]).toContain('TASK_UPDATED');
  });

  it('should send events targeted to a specific userId or role', () => {
    const mockResAdmin = { write: vi.fn() };
    const mockResEmp = { write: vi.fn() };

    realTimeService.addClient('c-admin', { id: 'c-admin', userId: 'admin-1', role: 'ADMIN', res: mockResAdmin });
    realTimeService.addClient('c-emp', { id: 'c-emp', userId: 'emp-1', role: 'EMPLOYEE', res: mockResEmp });

    // Send specifically to emp-1
    const userSent = realTimeService.sendToUser('emp-1', 'TASK_ASSIGNED', { taskId: 't-1' });
    expect(userSent).toBe(1);
    expect(mockResEmp.write).toHaveBeenCalled();
    expect(mockResAdmin.write).not.toHaveBeenCalled();

    // Send to roles
    const roleSent = realTimeService.sendToRoles(['ADMIN'], 'PROJECT_CREATED', { projectId: 'p-1' });
    expect(roleSent).toBe(1);
    expect(mockResAdmin.write).toHaveBeenCalled();
  });
});
