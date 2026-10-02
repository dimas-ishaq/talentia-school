CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`target` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `forum_discussions` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`title` text NOT NULL,
	`question` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `forum_discussions_activity_idx` ON `forum_discussions` (`activity_id`);--> statement-breakpoint
CREATE TABLE `forum_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`discussion_id` text,
	`user_id` text NOT NULL,
	`student_id` text,
	`parent_id` text,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`discussion_id`) REFERENCES `forum_discussions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `forum_posts_activity_idx` ON `forum_posts` (`activity_id`);--> statement-breakpoint
CREATE INDEX `forum_posts_discussion_idx` ON `forum_posts` (`discussion_id`);--> statement-breakpoint
CREATE INDEX `forum_posts_parent_idx` ON `forum_posts` (`parent_id`);--> statement-breakpoint
CREATE TABLE `organization_invites` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `organization_invites_email_idx` ON `organization_invites` (`organization_id`,`email`);--> statement-breakpoint
CREATE TABLE `organization_members` (
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_members_pk` ON `organization_members` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'trial' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP INDEX `categories_name_unique`;--> statement-breakpoint
ALTER TABLE `categories` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_org_name_idx` ON `categories` (`organization_id`,`name`);--> statement-breakpoint
DROP INDEX `courses_name_unique`;--> statement-breakpoint
ALTER TABLE `courses` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
CREATE UNIQUE INDEX `courses_org_name_idx` ON `courses` (`organization_id`,`name`);--> statement-breakpoint
DROP INDEX `students_nis_unique`;--> statement-breakpoint
ALTER TABLE `students` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
CREATE UNIQUE INDEX `students_org_nis_idx` ON `students` (`organization_id`,`nis`);--> statement-breakpoint
DROP INDEX `subjects_code_unique`;--> statement-breakpoint
DROP INDEX `subjects_name_unique`;--> statement-breakpoint
ALTER TABLE `subjects` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_org_code_idx` ON `subjects` (`organization_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_org_name_idx` ON `subjects` (`organization_id`,`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`key` text NOT NULL,
	`organization_id` text,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`organization_id`, `key`),
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_settings`("key", "organization_id", "value", "updated_at") SELECT "key", "organization_id", "value", "updated_at" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `settings_org_key_idx` ON `settings` (`organization_id`,`key`);--> statement-breakpoint
ALTER TABLE `activities` ADD `passing_score` real;--> statement-breakpoint
ALTER TABLE `activities` ADD `allow_late_submission` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `forum_require_post` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `forum_require_reply` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `forum_completion_rule` text DEFAULT 'view' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `link_completion_rule` text DEFAULT 'view' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `link_open_in_new_tab` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `presentation_source` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `presentation_file_url` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `presentation_original_url` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `presentation_page_count` integer;--> statement-breakpoint
ALTER TABLE `activity_progress` ADD `submission_files` text;--> statement-breakpoint
ALTER TABLE `activity_progress` ADD `submission_link` text;--> statement-breakpoint
ALTER TABLE `activity_progress` ADD `is_late` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_progress` ADD `returned_at` integer;--> statement-breakpoint
ALTER TABLE `activity_progress` ADD `return_reason` text;--> statement-breakpoint
ALTER TABLE `activity_progress` ADD `score_published_at` integer;--> statement-breakpoint
ALTER TABLE `announcements` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
ALTER TABLE `attendance` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
ALTER TABLE `attendance` ADD `course_id` text REFERENCES courses(id);--> statement-breakpoint
ALTER TABLE `attendance` ADD `activity_note` text;--> statement-breakpoint
ALTER TABLE `attendance` ADD `learning_note` text;--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_student_course_date_idx` ON `attendance` (`student_id`,`course_id`,`date`);--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
ALTER TABLE `classes` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
ALTER TABLE `exam_events` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
ALTER TABLE `final_grades` ADD `published_at` integer;--> statement-breakpoint
ALTER TABLE `parents` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
ALTER TABLE `schedule_entries` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
ALTER TABLE `teachers` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_org_code_idx` ON `teachers` (`organization_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_org_nip_idx` ON `teachers` (`organization_id`,`nip`);--> statement-breakpoint
ALTER TABLE `users` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
ALTER TABLE `users` ADD `platform_role` text;--> statement-breakpoint
ALTER TABLE `users` ADD `must_change_password` integer DEFAULT false NOT NULL;