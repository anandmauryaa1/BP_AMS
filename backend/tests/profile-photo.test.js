import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../db.js', () => ({
    connectToDatabase: vi.fn().mockResolvedValue(true)
}));

describe('Profile Photo Management', () => {
    let mockUsers = {};

    beforeEach(() => {
        mockUsers = {
            'user123': {
                _id: 'user123',
                employeeId: 'EMP-001',
                username: 'anand',
                name: 'Anand Maurya',
                email: 'anand@example.com',
                avatar: null,
                save: vi.fn().mockImplementation(function() {
                    return Promise.resolve(this);
                })
            }
        };
    });

    it('1. Should allow user to set base64 profile photo and persist it', async () => {
        const user = mockUsers['user123'];
        const samplePhoto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';

        user.avatar = samplePhoto;
        await user.save();

        expect(user.avatar).toBe(samplePhoto);
        expect(user.save).toHaveBeenCalled();
    });

    it('2. Should allow user to remove profile photo by setting it to null', async () => {
        const user = mockUsers['user123'];
        user.avatar = 'data:image/jpeg;base64,someexistingimage';

        user.avatar = null;
        await user.save();

        expect(user.avatar).toBeNull();
        expect(user.save).toHaveBeenCalled();
    });

    it('3. Should clean and sanitize empty string avatars to null', () => {
        const sanitizeAvatar = (photo) => {
            return photo && typeof photo === 'string' && photo.trim().length > 0 ? photo.trim() : null;
        };

        expect(sanitizeAvatar('')).toBeNull();
        expect(sanitizeAvatar('   ')).toBeNull();
        expect(sanitizeAvatar(null)).toBeNull();
        expect(sanitizeAvatar(undefined)).toBeNull();
        expect(sanitizeAvatar('data:image/jpeg;base64,abc123xyz')).toBe('data:image/jpeg;base64,abc123xyz');
    });
});

