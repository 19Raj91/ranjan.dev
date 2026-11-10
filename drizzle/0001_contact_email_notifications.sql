ALTER TABLE `inquiries` ADD `email_status` text DEFAULT 'not_requested' NOT NULL;
--> statement-breakpoint
ALTER TABLE `inquiries` ADD `email_provider_id` text;
