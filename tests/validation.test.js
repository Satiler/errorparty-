/**
 * Unit Tests for Validation Middleware
 * npm test tests/middleware/validation.test.js
 */

const { validate, validateMultiple } = require('../../src/middleware/validation');

describe('Validation Middleware', () => {
  describe('cs2AuthToken schema', () => {
    it('should accept valid auth token format', () => {
      const req = { body: { authToken: '9BK4-5Z9HP-A9KL' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('cs2AuthToken')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', () => {
      const req = { body: { authToken: 'invalid-token' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('cs2AuthToken')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject missing authToken field', () => {
      const req = { body: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('cs2AuthToken')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('shareCode schema', () => {
    it('should accept valid CS2 share code', () => {
      const req = { body: { shareCode: 'CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('shareCode')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid share code format', () => {
      const req = { body: { shareCode: 'INVALID-CODE' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('shareCode')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject share code without CSGO prefix', () => {
      const req = { body: { shareCode: 'DOTA-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('shareCode')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('steamGuardCode schema', () => {
    it('should accept valid Steam Guard code', () => {
      const req = { body: { code: 'ABCDE' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('steamGuardCode')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject lowercase Steam Guard code', () => {
      const req = { body: { code: 'abcde' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('steamGuardCode')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject code with wrong length', () => {
      const req = { body: { code: 'ABC' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('steamGuardCode')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('pagination schema', () => {
    it('should accept valid page and limit', () => {
      const req = { query: { page: '2', limit: '20' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('pagination', 'query')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(2);
      expect(req.query.limit).toBe(20);
    });

    it('should apply default values when missing', () => {
      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('pagination', 'query')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(20); // Default is 20, not 10
    });

    it('should reject negative page numbers', () => {
      const req = { query: { page: '-1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('pagination', 'query')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject limit over 100', () => {
      const req = { query: { limit: '200' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate('pagination', 'query')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateMultiple', () => {
    it('should validate multiple fields successfully', () => {
      const req = {
        body: { authToken: '9BK4-5Z9HP-A9KL' },
        query: { page: '1', limit: '10' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validateMultiple([
        { schema: 'cs2AuthToken', source: 'body' },
        { schema: 'pagination', source: 'query' }
      ])(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail if any validation fails', () => {
      const req = {
        body: { authToken: 'invalid' },
        query: { page: '1' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validateMultiple([
        { schema: 'cs2AuthToken', source: 'body' },
        { schema: 'pagination', source: 'query' }
      ])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('Logger Utility', () => {
  const logger = require('../../src/utils/logger');

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  it('should mask tokens in log messages', () => {
    logger.log('User token: ABCD-EFGH-IJKL');
    
    expect(console.log).toHaveBeenCalledWith('User token: ABCD****');
  });

  it('should mask passwords in log messages', () => {
    logger.log('Login with password: secretpass123');
    
    expect(console.log).toHaveBeenCalledWith('Login with password: ****');
  });

  it('should mask Bearer tokens', () => {
    logger.log('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Bearer eyJh****'));
  });

  it('should mask email addresses', () => {
    logger.log('Email sent to user@example.com');
    
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('u***@e***.***'));
  });

  it('should handle non-string arguments', () => {
    const obj = { token: 'ABCD-EFGH', user: 'test' };
    logger.log('Data:', obj);
    
    expect(console.log).toHaveBeenCalledWith('Data:', obj);
  });
});
