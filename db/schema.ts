import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const inquiries = sqliteTable('inquiries', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull(),
  projectType: text('project_type').notNull(), budget: text('budget').notNull(), message: text('message').notNull(),
  createdAt: integer('created_at').notNull(),
  emailStatus: text('email_status').notNull().default('not_requested'),
  emailProviderId: text('email_provider_id'),
});
