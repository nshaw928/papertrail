-- Prevent owner role escalation AND demotion via direct DB access
create or replace function prevent_owner_escalation() returns trigger as $$
begin
  -- Skip for service_role (server-side operations)
  if auth.role() = 'service_role' then
    return NEW;
  end if;

  -- Prevent promoting to owner unless the current user is already the owner
  if NEW.role = 'owner' and OLD.role != 'owner' then
    if not exists (
      select 1 from public.lab_members
      where lab_id = NEW.lab_id and user_id = auth.uid() and role = 'owner'
    ) then
      raise exception 'Only the lab owner can transfer ownership';
    end if;
  end if;

  -- Prevent demoting the owner unless they are demoting themselves
  if OLD.role = 'owner' and NEW.role != 'owner' then
    if auth.uid() != OLD.user_id then
      raise exception 'Only the owner can relinquish ownership';
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer set search_path = '';

create trigger trg_prevent_owner_escalation
  before update on lab_members
  for each row execute function prevent_owner_escalation();
