-- Migration: Add push_subscription field to users table
-- Date: 2025-11-25
-- Description: Add support for PWA push notifications

-- Add push_subscription column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS push_subscription TEXT;

-- Add comment
COMMENT ON COLUMN users.push_subscription IS 'Web Push subscription JSON for PWA notifications';

-- Create index for querying users with push subscriptions
CREATE INDEX IF NOT EXISTS idx_users_push_subscription 
ON users (push_subscription) 
WHERE push_subscription IS NOT NULL;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added push_subscription to users table';
END $$;
