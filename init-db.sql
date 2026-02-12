-- Create the Strapi content database (already created as default)
-- CREATE DATABASE asylguiden; -- created by POSTGRES_DB env var

-- Create the user accounts database for Auth.js/Prisma
CREATE DATABASE asylguiden_users;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE asylguiden TO asylguiden;
GRANT ALL PRIVILEGES ON DATABASE asylguiden_users TO asylguiden;
