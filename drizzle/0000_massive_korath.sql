CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`url` text,
	`objectives` text,
	`reading_minutes` integer,
	`attachments` text,
	`points` integer,
	`max_point` real DEFAULT 100 NOT NULL,
	`duration_minutes` integer,
	`open_at` text,
	`close_at` text,
	`max_attempts` integer,
	`exam_mode` integer DEFAULT false NOT NULL,
	`fullscreen_mode` integer DEFAULT false NOT NULL,
	`quiz_password` text,
	`quiz_instructions` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`score_visibility` text DEFAULT 'immediate' NOT NULL,
	`review_mode` text DEFAULT 'immediate' NOT NULL,
	`due_date` text,
	`position` integer NOT NULL,
	`is_required` integer DEFAULT true NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `activity_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`student_id` text NOT NULL,
	`submission` text,
	`score` real,
	`feedback` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`best_score` real,
	`last_score` real,
	`best_attempt_id` text,
	`last_attempt_id` text,
	`viewed_at` integer,
	`completed_at` integer,
	`submitted_at` integer,
	`graded_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ap_as_idx` ON `activity_progress` (`activity_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`author_id` text NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`class_id` text NOT NULL,
	`subject_id` text,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`recorded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_student_subject_date_idx` ON `attendance` (`student_id`,`subject_id`,`date`);--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`location` text,
	`type` text DEFAULT 'other' NOT NULL,
	`category` text,
	`is_holiday` integer DEFAULT false NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`color` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`level` integer NOT NULL,
	`teacher_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `course_classes` (
	`course_id` text NOT NULL,
	`class_id` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cc_pk` ON `course_classes` (`course_id`,`class_id`);--> statement-breakpoint
CREATE TABLE `course_grade_weights` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`weights_json` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `course_teachers` (
	`course_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ct_pk` ON `course_teachers` (`course_id`,`teacher_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`cover_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`category_id` text,
	`subject_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_name_unique` ON `courses` (`name`);--> statement-breakpoint
CREATE TABLE `exam_event_classes` (
	`event_id` text NOT NULL,
	`class_id` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `exam_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_event_class_idx` ON `exam_event_classes` (`event_id`,`class_id`);--> statement-breakpoint
CREATE TABLE `exam_event_subject_classes` (
	`event_subject_id` text NOT NULL,
	`class_id` text NOT NULL,
	FOREIGN KEY (`event_subject_id`) REFERENCES `exam_event_subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_subject_class_idx` ON `exam_event_subject_classes` (`event_subject_id`,`class_id`);--> statement-breakpoint
CREATE TABLE `exam_event_subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`exam_course_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`sesi_id` text,
	`passing_grade` real DEFAULT 75 NOT NULL,
	`shuffle_questions` integer DEFAULT false NOT NULL,
	`shuffle_options` integer DEFAULT false NOT NULL,
	`max_attempts` integer DEFAULT 1 NOT NULL,
	`duration_minutes` integer NOT NULL,
	`token_hash` text NOT NULL,
	`token_plain` text,
	`token_previous_plain` text,
	`token_rotation_minutes` integer,
	`token_next_rotation_at` integer,
	`token_grace_minutes` integer DEFAULT 2 NOT NULL,
	`lock_enabled` integer DEFAULT true NOT NULL,
	`max_violations` integer DEFAULT 3 NOT NULL,
	`lock_on_clipboard` integer DEFAULT true NOT NULL,
	`lock_on_fullscreen_exit` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `exam_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`exam_course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`sesi_id`) REFERENCES `exam_sesi`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_event_subject_idx` ON `exam_event_subjects` (`event_id`,`subject_id`);--> statement-breakpoint
CREATE TABLE `exam_events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`academic_year` text NOT NULL,
	`semester` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `exam_sesi` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`open_at` text NOT NULL,
	`close_at` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`proctor_token_hash` text,
	`proctor_token_plain` text,
	`proctor_token_previous_plain` text,
	`proctor_token_next_rotation_at` integer,
	`proctor_token_grace_minutes` integer DEFAULT 2 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `exam_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `exam_sesi_event_idx` ON `exam_sesi` (`event_id`);--> statement-breakpoint
CREATE TABLE `exam_session_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`open_at` text NOT NULL,
	`close_at` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`reason` text NOT NULL,
	`granted_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_override_student_idx` ON `exam_session_overrides` (`session_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `exam_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`event_subject_id` text NOT NULL,
	`sesi_id` text,
	`class_id` text NOT NULL,
	`open_at` text NOT NULL,
	`close_at` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `exam_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_subject_id`) REFERENCES `exam_event_subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sesi_id`) REFERENCES `exam_sesi`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_session_class_idx` ON `exam_sessions` (`event_subject_id`,`class_id`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subject_id` text NOT NULL,
	`class_id` text NOT NULL,
	`exam_date` text NOT NULL,
	`description` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `final_grades` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`student_id` text NOT NULL,
	`score` real NOT NULL,
	`grade` text NOT NULL,
	`feedback` text,
	`components_json` text,
	`calculated_at` integer NOT NULL,
	`calculated_by` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`calculated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`student_id` text NOT NULL,
	`score` real NOT NULL,
	`note` text,
	`recorded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grades_exam_student_idx` ON `grades` (`exam_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `parents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`phone` text NOT NULL,
	`address` text,
	`occupation` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parents_user_id_unique` ON `parents` (`user_id`);--> statement-breakpoint
CREATE TABLE `question_bank` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text,
	`scope` text NOT NULL,
	`category_id` text,
	`course_id` text,
	`quiz_activity_id` text,
	`created_by` text NOT NULL,
	`type` text NOT NULL,
	`question` text NOT NULL,
	`explanation` text,
	`default_points` real DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `question_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`quiz_activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `question_options` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`label` text NOT NULL,
	`text` text NOT NULL,
	`is_correct` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `question_bank`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `question_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_by` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_packages_course_name_idx` ON `question_packages` (`course_id`,`name`);--> statement-breakpoint
CREATE TABLE `quiz_attempt_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`quiz_question_id` text NOT NULL,
	`selected_option_id` text,
	`answer_text` text,
	`is_correct` integer,
	`points_earned` real,
	`graded_by` text,
	`graded_at` integer,
	`feedback` text,
	FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`quiz_question_id`) REFERENCES `quiz_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`graded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`student_id` text NOT NULL,
	`attempt_number` integer NOT NULL,
	`started_at` integer NOT NULL,
	`submitted_at` integer,
	`auto_submitted` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`score` real,
	`session_id` text,
	`lock_status` text DEFAULT 'ok' NOT NULL,
	`locked_at` integer,
	`lock_reason` text,
	`unlocked_by` text,
	`shuffle_seed` integer DEFAULT 0 NOT NULL,
	`violation_count` integer DEFAULT 0 NOT NULL,
	`last_unlocked_at` integer,
	`last_unlock_method` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`unlocked_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `quiz_events` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text,
	`activity_id` text,
	`student_id` text,
	`user_id` text,
	`type` text NOT NULL,
	`detail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `quiz_events_attempt_idx` ON `quiz_events` (`attempt_id`);--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`bank_question_id` text,
	`position` integer NOT NULL,
	`points` real DEFAULT 1 NOT NULL,
	`type` text NOT NULL,
	`question` text NOT NULL,
	`explanation` text,
	`options_json` text,
	`target_class_ids` text,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bank_question_id`) REFERENCES `question_bank`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `schedule_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`subject_id` text NOT NULL,
	`class_id` text NOT NULL,
	`teacher_id` text,
	`room` text,
	`note` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`position` integer NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`nis` text,
	`class_id` text,
	`parent_id` text,
	`gender` text,
	`is_active` integer DEFAULT true NOT NULL,
	`birth_date` text,
	`phone` text,
	`address` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `parents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_user_id_unique` ON `students` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `students_nis_unique` ON `students` (`nis`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_code_unique` ON `subjects` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_name_unique` ON `subjects` (`name`);--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code` text,
	`nip` text,
	`phone` text,
	`address` text,
	`subject` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_user_id_unique` ON `teachers` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_code_unique` ON `teachers` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_nip_unique` ON `teachers` (`nip`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`password` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);