-- ============================================================
-- Add missing indexes for query performance
-- ============================================================

-- feature_upvotes: speed up "has user upvoted?" and "upvotes by feature" lookups
create index if not exists idx_feature_upvotes_user_id on feature_upvotes(user_id);
create index if not exists idx_feature_upvotes_feature_id on feature_upvotes(feature_id);

-- feedback: speed up user's own feedback and admin chronological views
create index if not exists idx_feedback_user_id on feedback(user_id) where user_id is not null;
create index if not exists idx_feedback_created_at on feedback(created_at desc);

-- waitlist: speed up admin chronological listing
create index if not exists idx_waitlist_created_at on waitlist(created_at desc);

-- invite_links: speed up expiration queries
create index if not exists idx_invite_links_expires_at on invite_links(expires_at);

-- search_cache: speed up staleness checks
create index if not exists idx_search_cache_refreshed_at on search_cache(refreshed_at);
