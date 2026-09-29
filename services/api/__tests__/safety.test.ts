import { api } from '@/services/api';
import { submitReport } from '../safety';

jest.mock('@/services/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockPost = api.post as jest.Mock;

describe('safety API client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({ data: { id: 'report-1', status: 'pending' } });
  });

  it('submits a valid report to the authenticated safety endpoint', async () => {
    await expect(submitReport({
      targetType: 'profile',
      targetId: 'user-2',
      category: 'harassment',
      description: 'Unwanted contact',
    })).resolves.toBeUndefined();

    expect(mockPost).toHaveBeenCalledWith('/safety/reports', {
      targetType: 'profile',
      targetId: 'user-2',
      category: 'harassment',
      description: 'Unwanted contact',
    });
  });

  it('rejects invalid input without calling the API', async () => {
    await expect(submitReport({
      targetType: 'profile',
      targetId: '',
      category: 'harassment',
    })).rejects.toThrow();

    expect(mockPost).not.toHaveBeenCalled();
  });
});
