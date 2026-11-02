-- ============================================================================
-- PLANIFY · esquema completo de la base de datos (PostgreSQL de Supabase)
-- Sirve para crear todo desde cero en un servidor nuevo (por ejemplo Supabase
-- autoalojado). Requiere el esquema "auth" de Supabase (usuarios y MFA).
--
-- CÓMO SE GUARDA UN HORARIO
--   schedule.dia   0..4  = lunes..viernes
--   schedule.hora  0..19 = turno * 10 + número de hora dentro del turno
--                          (0..9 matutino, 10..19 vespertino)
--   La hora real (07:00, receso, etc.) NO se guarda por clase: se calcula con
--   schools.horario (JSON): {"M":{"ini":"07:00","dur":50,"n":8,"rec":3,"recDur":30},
--                            "V":{...},"periodo":"texto del PDF"}
--   Una fila de schedule = una hora de clase de un grupo con un maestro.
-- ============================================================================

create table schools (
  id uuid primary key default gen_random_uuid(),
  cct text unique not null,                       -- clave del plantel
  nombre text not null,
  logo text,                                       -- imagen en base64
  ciclo text not null default 'impar' check (ciclo in ('impar','par')),
  horario jsonb                                    -- jornada y receso (ver arriba)
);

create table specialties (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  nombre text not null,
  unique (school_id, nombre)
);

create table teachers (                            -- maestros y administradores
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  nombre text not null,
  rol text not null default 'teacher' check (rol in ('teacher','admin')),
  turno text not null default 'Matutino' check (turno in ('Matutino','Vespertino','Ambos')),
  materias text[] not null default '{}',           -- asignaturas que puede impartir
  prefs text[] not null default '{}',              -- grupos que prefiere (opcional)
  nombramiento text check (nombramiento in ('medio','tres','tc','asig')),
  horas_base int check (horas_base between 1 and 60),
  max_frente int check (max_frente between 1 and 60),
  extra_solicitadas int not null default 0 check (extra_solicitadas between 0 and 20),
  extra_autorizadas int not null default 0 check (extra_autorizadas between 0 and 20)
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  nombre text not null,
  turno text not null default 'Matutino' check (turno in ('Matutino','Vespertino')),
  semestre int not null default 1 check (semestre between 1 and 6),
  specialty_id uuid references specialties(id) on delete set null,
  tutor_id uuid references teachers(id) on delete set null,
  unique (school_id, nombre)
);

create table schedule (                            -- EL HORARIO
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  grupo text not null,                             -- groups.nombre
  materia text not null,
  teacher_id uuid not null references teachers(id) on delete cascade,
  dia int not null check (dia between 0 and 4),
  hora int not null check (hora between 0 and 19)
);

create table status (                              -- "entro / junta / ausente" por hora
  teacher_id uuid not null references teachers(id) on delete cascade,
  dia int not null,
  hora int not null,
  estado text not null check (estado in ('ok','meeting','absent')),
  primary key (teacher_id, dia, hora)
);

create table submodules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  specialty_id uuid not null references specialties(id) on delete cascade,
  semestre int not null check (semestre between 1 and 6),
  nombre text not null,
  horas int not null default 4 check (horas between 1 and 10)
);

create table semester_subjects (                   -- asignaturas de cada semestre
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  semestre int not null check (semestre between 1 and 6),
  nombre text not null,
  horas int not null default 3 check (horas between 1 and 10)
);

create table group_subjects (                      -- lista propia de un grupo (opcional)
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  grupo text not null,
  nombre text not null,
  horas int not null default 3 check (horas between 1 and 10),
  unique (school_id, grupo, nombre)
);

create table access_requests (                     -- solicitudes que Dirección aprueba
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  nombre text not null,
  email text not null,
  turno text not null default 'Matutino' check (turno in ('Matutino','Vespertino','Ambos')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- funciones
create function my_school() returns uuid
language sql security definer stable set search_path = public as $$
  select school_id from teachers where user_id = auth.uid() $$;

-- Administrador; si tiene verificación en dos pasos activa, exige sesión aal2
create function is_admin() returns boolean
language sql security definer stable set search_path = public, auth as $$
  select exists (select 1 from teachers where user_id = auth.uid() and rol = 'admin')
     and (not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
          or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2') $$;

create function school_exists(p_cct text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from schools where cct = upper(trim(p_cct))) $$;

create function request_access(p_cct text, p_nombre text, p_turno text) returns text
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if auth.uid() is null then return 'Inicia sesión primero'; end if;
  if exists (select 1 from teachers where user_id = auth.uid()) then return 'ok'; end if;
  select id into sid from schools where cct = upper(trim(p_cct));
  if sid is null then return 'La clave del plantel no existe'; end if;
  if (select count(*) from access_requests where school_id = sid) >= 100 then
    return 'Hay demasiadas solicitudes pendientes. Avisa a Dirección.'; end if;
  insert into access_requests (user_id, school_id, nombre, email, turno)
  values (auth.uid(), sid, left(trim(p_nombre), 80), lower(auth.jwt()->>'email'), coalesce(p_turno, 'Matutino'))
  on conflict (user_id) do update set nombre = excluded.nombre, turno = excluded.turno, school_id = excluded.school_id;
  return 'ok';
end $$;

create function approve_request(p_id uuid, p_rol text, p_turno text) returns text
language plpgsql security definer set search_path = public as $$
declare q access_requests;
begin
  if not is_admin() then return 'Solo administradores'; end if;
  select * into q from access_requests where id = p_id and school_id = my_school();
  if q.id is null then return 'La solicitud ya no existe'; end if;
  if p_rol = 'admin' and (select count(*) from teachers where school_id = q.school_id and rol = 'admin') >= 5 then
    return 'Máximo 5 administradores'; end if;
  insert into teachers (user_id, nombre, materias, turno, rol, school_id)
  values (q.user_id, q.nombre, '{}', coalesce(p_turno, q.turno),
          case when p_rol = 'admin' then 'admin' else 'teacher' end, q.school_id);
  delete from access_requests where id = q.id;
  return 'ok';
end $$;

create function set_my_subjects(p_materias text[]) returns void
language sql security definer set search_path = public as $$
  update teachers set materias = p_materias where user_id = auth.uid() $$;

create function set_my_prefs(p_prefs text[]) returns void
language sql security definer set search_path = public as $$
  update teachers set prefs = p_prefs where user_id = auth.uid() $$;

create function request_extra_hours(p_n int) returns void
language sql security definer set search_path = public as $$
  update teachers set extra_solicitadas = least(greatest(coalesce(p_n,0),0),20) where user_id = auth.uid() $$;

create function set_my_tutor(p_group text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid; sid uuid;
begin
  select id, school_id into me, sid from teachers where user_id = auth.uid();
  update groups set tutor_id = null where school_id = sid and tutor_id = me;
  if p_group is not null and p_group <> '' then
    update groups set tutor_id = me where school_id = sid and nombre = p_group and tutor_id is null;
    if not found then raise exception 'Ese grupo ya tiene tutor'; end if;
  end if;
end $$;

-- ------------------------------------------- seguridad por fila (RLS), por escuela
alter table schools           enable row level security;
alter table specialties       enable row level security;
alter table teachers          enable row level security;
alter table groups            enable row level security;
alter table schedule          enable row level security;
alter table status            enable row level security;
alter table submodules        enable row level security;
alter table semester_subjects enable row level security;
alter table group_subjects    enable row level security;
alter table access_requests   enable row level security;

create policy "mi escuela" on schools for select to authenticated using (id = my_school());
create policy "admin escuela" on schools for update to authenticated using (is_admin() and id = my_school());

create policy "mi escuela" on teachers for select to authenticated using (school_id = my_school());
create policy "admin teachers" on teachers for all to authenticated
  using (is_admin() and school_id = my_school()) with check (is_admin() and school_id = my_school());

create policy "mi escuela" on groups for select to authenticated using (school_id = my_school());
create policy "admin groups" on groups for all to authenticated
  using (is_admin() and school_id = my_school()) with check (is_admin() and school_id = my_school());

create policy "mi escuela" on schedule for select to authenticated using (school_id = my_school());
create policy "admin schedule" on schedule for all to authenticated
  using (is_admin() and school_id = my_school()) with check (is_admin() and school_id = my_school());
create policy "cobertura mover" on schedule for update to authenticated
  using (school_id = my_school()) with check (school_id = my_school());
create policy "cobertura borrar" on schedule for delete to authenticated using (school_id = my_school());

create policy "leer status" on status for select to authenticated using (teacher_id in (select id from teachers));
create policy "mi estado" on status for all to authenticated
  using (teacher_id in (select id from teachers where user_id = auth.uid()))
  with check (teacher_id in (select id from teachers where user_id = auth.uid()));

create policy "mi escuela" on specialties for select to authenticated using (school_id = my_school());
create policy "admin especialidades" on specialties for all to authenticated
  using (is_admin() and school_id = my_school()) with check (is_admin() and school_id = my_school());
create policy "mi escuela" on submodules for select to authenticated using (school_id = my_school());
create policy "admin submodulos" on submodules for all to authenticated
  using (is_admin() and school_id = my_school()) with check (is_admin() and school_id = my_school());
create policy "mi escuela" on semester_subjects for select to authenticated using (school_id = my_school());
create policy "admin catalogo" on semester_subjects for all to authenticated
  using (is_admin() and school_id = my_school()) with check (is_admin() and school_id = my_school());
create policy "mi escuela" on group_subjects for select to authenticated using (school_id = my_school());
create policy "admin materias grupo" on group_subjects for all to authenticated
  using (is_admin() and school_id = my_school()) with check (is_admin() and school_id = my_school());

create policy "ver solicitudes" on access_requests for select to authenticated
  using ((is_admin() and school_id = my_school()) or user_id = auth.uid());
create policy "borrar solicitudes" on access_requests for delete to authenticated
  using (is_admin() and school_id = my_school());

-- --------------------------------------------------------- permisos y tiempo real
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke execute on all functions in schema public from public;
grant execute on function my_school(), is_admin(), request_access(text,text,text), approve_request(uuid,text,text),
  set_my_subjects(text[]), set_my_prefs(text[]), set_my_tutor(text), request_extra_hours(int) to authenticated;
grant execute on function school_exists(text) to anon, authenticated;

alter publication supabase_realtime add table status, schedule;   -- avisos en vivo

-- --------------------------------------------------------------- primer arranque
-- 1) insert into schools (cct, nombre) values ('SU-CLAVE', 'Nombre del plantel');
-- 2) Crear el usuario en Authentication → Users (Auto Confirm) y luego:
--    insert into teachers (user_id, nombre, rol, school_id)
--    select u.id, 'Dirección', 'admin', s.id from auth.users u, schools s
--    where u.email = 'correo@dominio.com' and s.cct = 'SU-CLAVE';
