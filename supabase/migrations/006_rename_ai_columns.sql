-- Rename AI columns for consistent ai_ prefix, drop ai_tags (redundant with OpenAlex topics/keywords)
alter table works rename column summary to ai_summary;
alter table works rename column summary_generated to ai_summary_generated;
alter table works drop column ai_tags;
