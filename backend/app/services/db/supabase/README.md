# Supabase Database Setup

This directory contains SQL migration files for setting up the database schema.

## Setup Instructions

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the migration file `migrations/001_initial_schema.sql`

## Schema Overview

### Tables

- **conversations**: Stores chat conversations with user association
- **messages**: Stores individual messages within conversations

### Security

- Row Level Security (RLS) is enabled on both tables
- Users can only access their own conversations and messages
- All policies use `auth.uid()` to ensure user isolation

### Indexes

- Indexes are created on foreign keys and frequently queried columns for performance

## Migration File

- `001_initial_schema.sql`: Initial schema with tables, RLS policies, and indexes
