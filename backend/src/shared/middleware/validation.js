const Joi = require('joi');

/**
 * Validation schemas for different endpoints
 */
const schemas = {
  // CS2 Authentication Token
  cs2AuthToken: Joi.object({
    authToken: Joi.string()
      .pattern(/^[A-Z0-9]{4}-[A-Z0-9]{5}-[A-Z0-9]{4}$/)
      .required()
      .messages({
        'string.pattern.base': 'Токен должен быть формата XXXX-XXXXX-XXXX (например: 9BK4-5Z9HP-A9KL)',
        'any.required': 'Authentication Token обязателен'
      })
  }),

  // CS2 Share Code
  shareCode: Joi.object({
    shareCode: Joi.string()
      .pattern(/^CSGO-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}$/)
      .required()
      .messages({
        'string.pattern.base': 'Share Code должен быть формата CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx',
        'any.required': 'Share Code обязателен'
      })
  }),

  // Meme Upload
  memeUpload: Joi.object({
    title: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Название должно содержать минимум 3 символа',
        'string.max': 'Название не должно превышать 100 символов',
        'any.required': 'Название обязательно'
      }),
    description: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Описание не должно превышать 500 символов'
      })
  }),

  // Steam Guard Code
  steamGuardCode: Joi.object({
    code: Joi.string()
      .length(5)
      .pattern(/^[A-Z0-9]{5}$/)
      .required()
      .messages({
        'string.length': 'Steam Guard код должен содержать 5 символов',
        'string.pattern.base': 'Steam Guard код должен содержать только буквы и цифры',
        'any.required': 'Steam Guard код обязателен'
      })
  }),

  // User Profile Update
  profileUpdate: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .optional()
      .messages({
        'string.min': 'Имя пользователя должно содержать минимум 3 символа',
        'string.max': 'Имя пользователя не должно превышать 30 символов',
        'string.pattern.base': 'Имя пользователя может содержать только буквы, цифры, дефис и подчеркивание'
      }),
    bio: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Биография не должна превышать 500 символов'
      })
  }),

  // Quest Claim
  questClaim: Joi.object({
    questId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'Quest ID должен быть числом',
        'number.integer': 'Quest ID должен быть целым числом',
        'number.positive': 'Quest ID должен быть положительным',
        'any.required': 'Quest ID обязателен'
      })
  }),

  // TeamSpeak Link Token
  teamspeakLink: Joi.object({
    token: Joi.string()
      .length(8)
      .pattern(/^[A-Z0-9]{8}$/)
      .required()
      .messages({
        'string.length': 'Токен должен содержать 8 символов',
        'string.pattern.base': 'Токен должен содержать только заглавные буквы и цифры',
        'any.required': 'Токен обязателен'
      })
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .optional()
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .optional()
      .default(20)
  }),

  // Date Range
  dateRange: Joi.object({
    startDate: Joi.date()
      .optional(),
    endDate: Joi.date()
      .greater(Joi.ref('startDate'))
      .optional()
      .messages({
        'date.greater': 'Дата окончания должна быть больше даты начала'
      })
  })
};

/**
 * Validation middleware factory
 * @param {string} schemaName - Name of the schema to validate against
 * @param {string} source - Where to find data: 'body', 'query', 'params'
 * @returns {Function} Express middleware
 */
const validate = (schemaName, source = 'body') => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      console.error(`Validation schema '${schemaName}' not found`);
      return res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }

    const dataToValidate = req[source];
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validate multiple sources
 */
const validateMultiple = (validations) => {
  return async (req, res, next) => {
    for (const { schema, source } of validations) {
      const { error, value } = schemas[schema].validate(req[source], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors
        });
      }

      req[source] = value;
    }
    next();
  };
};

module.exports = {
  validate,
  validateMultiple,
  schemas
};
