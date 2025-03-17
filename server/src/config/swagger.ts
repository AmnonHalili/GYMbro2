import swaggerJSDoc from 'swagger-jsdoc';

// Swagger Definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'GYMbro2 API Documentation',
    version: '1.0.0',
    description: 'This is the API documentation for the GYMbro2 application',
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC',
    },
    contact: {
      name: 'GYMbro2 Support',
      email: 'support@gymbro2.com',
    },
  },
  servers: [
    {
      url: 'https://gymbro2.com/api',
      description: 'Production Server',
    },
    {
      url: 'http://localhost:5000/api',
      description: 'Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['username', 'email'],
        properties: {
          _id: {
            type: 'string',
            description: 'Auto-generated MongoDB id',
          },
          username: {
            type: 'string',
            description: 'User\'s username',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User\'s email address',
          },
          password: {
            type: 'string',
            description: 'User\'s password (hashed)',
            format: 'password',
          },
          profilePicture: {
            type: 'string',
            description: 'URL to user\'s profile picture',
          },
          googleId: {
            type: 'string',
            description: 'Google OAuth ID (if registered via Google)',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date when user was created',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date when user was last updated',
          },
        },
      },
      Post: {
        type: 'object',
        required: ['content', 'user'],
        properties: {
          _id: {
            type: 'string',
            description: 'Auto-generated MongoDB id',
          },
          content: {
            type: 'string',
            description: 'Post content',
          },
          imageUrl: {
            type: 'string',
            description: 'URL to post image (if any)',
          },
          user: {
            type: 'string',
            description: 'ID of the user who created the post',
          },
          commentsCount: {
            type: 'integer',
            description: 'Number of comments on the post',
          },
          likesCount: {
            type: 'integer',
            description: 'Number of likes on the post',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date when post was created',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date when post was last updated',
          },
        },
      },
      Comment: {
        type: 'object',
        required: ['content', 'user', 'post'],
        properties: {
          _id: {
            type: 'string',
            description: 'Auto-generated MongoDB id',
          },
          content: {
            type: 'string',
            description: 'Comment content',
          },
          user: {
            type: 'string',
            description: 'ID of the user who created the comment',
          },
          post: {
            type: 'string',
            description: 'ID of the post the comment belongs to',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date when comment was created',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date when comment was last updated',
          },
        },
      },
      Like: {
        type: 'object',
        required: ['user', 'post'],
        properties: {
          _id: {
            type: 'string',
            description: 'Auto-generated MongoDB id',
          },
          user: {
            type: 'string',
            description: 'ID of the user who liked the post',
          },
          post: {
            type: 'string',
            description: 'ID of the post that was liked',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date when like was created',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Error message',
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                msg: {
                  type: 'string',
                  description: 'Error specific message',
                },
                param: {
                  type: 'string',
                  description: 'Parameter that caused the error',
                },
                location: {
                  type: 'string',
                  description: 'Location of the error (body, query, etc.)',
                },
              },
            },
            description: 'List of validation errors (if applicable)',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation errors in request data',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Requested resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'Posts',
      description: 'Post management endpoints',
    },
    {
      name: 'Comments',
      description: 'Comment management endpoints',
    },
    {
      name: 'Likes',
      description: 'Post likes endpoints',
    },
    {
      name: 'Users',
      description: 'User management endpoints',
    },
    {
      name: 'AI',
      description: 'AI-powered services endpoints',
    },
  ],
};

// Swagger options
const options: swaggerJSDoc.Options = {
  swaggerDefinition,
  // Path to the API docs
  apis: ['./src/routes/*.ts'],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec; 