CREATE TABLE `inquiries` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `project_type` text NOT NULL,
  `budget` text NOT NULL,
  `message` text NOT NULL,
  `created_at` integer NOT NULL
);
