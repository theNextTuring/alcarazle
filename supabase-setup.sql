-- =============================================================================
-- Alcarazle — Supabase setup (run entire file in SQL Editor)
-- =============================================================================
-- What this does:
--   1. Creates `players` with RLS + public read policy
--   2. Seeds all roster rows (height_cm in cm; age is computed in the API from dob)
--
-- After first deploy: run your Vercel cron or `/api/update-stats` so `ranking` and
-- `titles` stay current for players who have `rapid_id`.
--
-- If you already have an older table: Section 3 adds `height_cm` and drops legacy
-- `turned_pro` if present; Section 4 upsert fills height/bh without overwriting
-- ranking or titles from your live API.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. TABLE
-- -----------------------------------------------------------------------------
create table if not exists players (
  id          serial primary key,
  name        text not null unique,
  nat         text not null,
  dob         date,
  hand        text not null check (hand in ('Right', 'Left')),
  bh          text not null check (bh in ('1HBH', '2HBH')),
  ranking     integer not null default 999,
  titles      integer not null default 0,
  active      boolean not null default true,
  rapid_id    integer,
  height_cm   integer,
  updated_at  timestamptz default now()
);


-- -----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table players enable row level security;

drop policy if exists "Public read" on players;
create policy "Public read" on players for select using (true);


-- -----------------------------------------------------------------------------
-- 3. MIGRATION (existing DBs created before height_cm / turned_pro changes)
-- Safe on fresh DBs: add column is no-op if present; drop legacy column if it existed.
-- -----------------------------------------------------------------------------
alter table players add column if not exists height_cm integer;
alter table players drop column if exists turned_pro;


-- -----------------------------------------------------------------------------
-- 4. SEED (new rows: full data. Existing names: bio + rapid_id + active only.)
-- -----------------------------------------------------------------------------
-- Columns: name, nat, dob, hand, bh, ranking, titles, active, rapid_id, height_cm
insert into players (name, nat, dob, hand, bh, ranking, titles, active, rapid_id, height_cm) values
 ('Novak Djokovic', 'Serbia', '1987-05-22', 'Right', '2HBH', 4, 101, true, 5992, 188),
  ('Carlos Alcaraz', 'Spain', '2003-05-05', 'Right', '2HBH', 1, 27, true, 68074, 182),
  ('Jannik Sinner', 'Italy', '2001-08-16', 'Right', '2HBH', 2, 21, true, 47275, 188),
  ('Rafael Nadal', 'Spain', '1986-06-03', 'Left', '2HBH', 999, 92, false, null, 185),
  ('Roger Federer', 'Switzerland', '1981-08-08', 'Right', '1HBH', 999, 103, false, null, 185),
  ('Andy Murray', 'Britain', '1987-05-15', 'Right', '2HBH', 999, 46, false, null, 190),
  ('Daniil Medvedev', 'Russia', '1996-02-11', 'Right', '2HBH', 10, 20, true, 22807, 198),
  ('Alexander Zverev', 'Germany', '1997-04-20', 'Right', '2HBH', 3, 23, true, 24008, 198),
  ('Andrey Rublev', 'Russia', '1997-10-20', 'Right', '2HBH', 999, 16, true, null, 188),
  ('Stefanos Tsitsipas', 'Greece', '1998-08-12', 'Right', '1HBH', 999, 10, true, null, 193),
  ('Casper Ruud', 'Norway', '1998-12-22', 'Right', '2HBH', 999, 9, true, null, 193),
  ('Holger Rune', 'Denmark', '2003-04-29', 'Right', '2HBH', 999, 5, true, null, 188),
  ('Taylor Fritz', 'USA', '1997-10-28', 'Right', '2HBH', 9, 7, true, 29932, 196),
  ('Tommy Paul', 'USA', '1997-05-17', 'Right', '2HBH', 999, 3, true, null, 193),
  ('Ben Shelton', 'USA', '2002-10-09', 'Left', '2HBH', 8, 2, true, 87562, 193),
  ('Frances Tiafoe', 'USA', '1998-01-20', 'Right', '2HBH', 999, 2, true, null, 193),
  ('Grigor Dimitrov', 'Bulgaria', '1991-05-16', 'Right', '1HBH', 999, 9, true, null, 191),
  ('Hubert Hurkacz', 'Poland', '1997-02-11', 'Right', '2HBH', 999, 11, true, null, 196),
  ('Felix Auger-Aliassime', 'Canada', '2000-08-08', 'Right', '2HBH', 7, 7, true, 40434, 193),
  ('Lorenzo Musetti', 'Italy', '2002-03-03', 'Left', '1HBH', 5, 4, true, 63572, 191),
  ('Jack Draper', 'Britain', '2001-12-22', 'Left', '2HBH', 999, 2, true, null, 191),
  ('Ugo Humbert', 'France', '1998-06-26', 'Left', '2HBH', 999, 5, true, null, 180),
  ('Karen Khachanov', 'Russia', '1996-05-21', 'Right', '2HBH', 999, 9, true, null, 198),
  ('Alex de Minaur', 'Australia', '1999-02-17', 'Right', '2HBH', 6, 11, true, 39309, 183),
  ('Matteo Berrettini', 'Italy', '1996-04-12', 'Right', '1HBH', 999, 10, true, null, 196),
  ('Nick Kyrgios', 'Australia', '1995-04-27', 'Right', '1HBH', 999, 7, false, null, 193),
  ('Gael Monfils', 'France', '1986-09-01', 'Right', '2HBH', 999, 12, false, null, 193),
  ('Marin Cilic', 'Croatia', '1988-09-28', 'Right', '2HBH', 999, 20, false, null, 198),
  ('Stan Wawrinka', 'Switzerland', '1985-03-28', 'Right', '1HBH', 999, 16, false, null, 183),
  ('Andre Agassi', 'USA', '1970-04-29', 'Right', '2HBH', 999, 60, false, null, 180),
  ('Pete Sampras', 'USA', '1971-08-12', 'Right', '1HBH', 999, 64, false, null, 185),
  ('John McEnroe', 'USA', '1959-02-16', 'Left', '1HBH', 999, 77, false, null, 180),
  ('Ivan Lendl', 'Czech Republic', '1960-03-07', 'Right', '2HBH', 999, 94, false, null, 188),
  ('Boris Becker', 'Germany', '1967-11-22', 'Right', '2HBH', 999, 49, false, null, 190),
  ('Stefan Edberg', 'Sweden', '1966-01-19', 'Right', '1HBH', 999, 42, false, null, 188),
  ('Jimmy Connors', 'USA', '1952-09-02', 'Left', '2HBH', 999, 109, false, null, 180),
  ('Bjorn Borg', 'Sweden', '1956-06-06', 'Right', '2HBH', 999, 64, false, null, 180),
  ('Lleyton Hewitt', 'Australia', '1981-02-24', 'Right', '2HBH', 999, 30, false, null, 180),
  ('Marat Safin', 'Russia', '1980-01-27', 'Right', '2HBH', 999, 15, false, null, 193),
  ('Andy Roddick', 'USA', '1982-08-30', 'Right', '2HBH', 999, 32, false, null, 188),
  ('Goran Ivanisevic', 'Croatia', '1971-09-13', 'Left', '1HBH', 999, 22, false, null, 193),
  ('Pat Rafter', 'Australia', '1972-12-28', 'Right', '1HBH', 999, 11, false, null, 183),
  ('Gustavo Kuerten', 'Brazil', '1976-09-10', 'Right', '1HBH', 999, 20, false, null, 183),
  ('Thomas Muster', 'Austria', '1967-10-02', 'Left', '1HBH', 999, 44, false, null, 185),
  ('Jim Courier', 'USA', '1970-08-17', 'Right', '2HBH', 999, 23, false, null, 183),
  ('Michael Chang', 'USA', '1972-02-22', 'Right', '2HBH', 999, 34, false, null, 175),
  ('Yevgeny Kafelnikov', 'Russia', '1974-02-18', 'Right', '2HBH', 999, 26, false, null, 182),
  ('David Nalbandian', 'Argentina', '1982-01-01', 'Right', '2HBH', 999, 11, false, null, 183),
  ('Richard Gasquet', 'France', '1986-06-18', 'Right', '1HBH', 999, 15, false, null, 185),
  ('Robin Soderling', 'Sweden', '1984-08-14', 'Right', '2HBH', 999, 10, false, null, 193),
  ('David Ferrer', 'Spain', '1982-04-02', 'Right', '2HBH', 999, 27, false, null, 175),
  ('Tomas Berdych', 'Czech Republic', '1985-09-17', 'Right', '2HBH', 999, 13, false, null, 196),
  ('Milos Raonic', 'Canada', '1990-12-27', 'Right', '2HBH', 999, 8, false, null, 196),
  ('Kei Nishikori', 'Japan', '1989-12-29', 'Right', '2HBH', 999, 12, false, null, 178),
  ('Juan Martin del Potro', 'Argentina', '1988-09-23', 'Right', '2HBH', 999, 22, false, null, 198),
  ('Dominic Thiem', 'Austria', '1993-09-03', 'Right', '1HBH', 999, 17, false, null, 193),
  ('Diego Schwartzman', 'Argentina', '1992-08-16', 'Right', '2HBH', 999, 3, true, null, 170),
  ('Pablo Carreno Busta', 'Spain', '1991-07-12', 'Right', '2HBH', 999, 7, true, null, 191),
  ('Borna Coric', 'Croatia', '1996-11-14', 'Right', '2HBH', 999, 5, true, null, 188),
  ('Sebastian Baez', 'Argentina', '2001-01-08', 'Right', '2HBH', 999, 4, true, null, 185),
  ('Jiri Lehecka', 'Czech Republic', '2001-07-01', 'Right', '2HBH', 999, 3, true, null, 193),
  ('Arthur Fils', 'France', '2004-05-19', 'Right', '2HBH', 999, 3, true, null, 183),
  ('Nuno Borges', 'Portugal', '1997-02-14', 'Right', '2HBH', 999, 3, true, null, 185),
  ('Alexei Popyrin', 'Australia', '1999-05-05', 'Right', '2HBH', 999, 2, true, null, 196),
  ('Jan-Lennard Struff', 'Germany', '1990-04-25', 'Right', '2HBH', 999, 2, true, null, 196),
  ('Jo-Wilfried Tsonga', 'France', '1985-04-17', 'Right', '2HBH', 999, 18, false, null, 191),
  ('Corentin Moutet', 'France', '1999-05-06', 'Left', '1HBH', 999, 1, true, null, 175),
  ('Brandon Nakashima', 'USA', '2001-09-30', 'Right', '2HBH', 999, 1, true, null, 191),
  ('Alejandro Davidovich Fokina', 'Spain', '1999-06-05', 'Right', '2HBH', 999, 2, true, null, 188),
  ('Giovanni Mpetshi Perricard', 'France', '2003-07-05', 'Right', '2HBH', 999, 2, true, null, 204),
  ('Flavio Cobolli', 'Italy', '2002-05-06', 'Right', '2HBH', 999, 2, true, null, 183),
  ('Jakub Mensik', 'Czech Republic', '2005-06-27', 'Right', '1HBH', 999, 1, true, null, 190),
  ('Learner Tien', 'USA', '2005-10-08', 'Right', '2HBH', 999, 1, true, null, 188),
  ('Alexandre Muller', 'France', '1997-11-25', 'Right', '2HBH', 999, 1, true, null, 196),
  ('Sebastian Korda', 'USA', '2000-07-05', 'Right', '2HBH', 999, 2, true, null, 193),
  ('Lorenzo Sonego', 'Italy', '1995-05-11', 'Right', '2HBH', 999, 4, true, null, 191),
  ('Roman Safiullin', 'Russia', '1997-10-28', 'Right', '2HBH', 999, 1, true, null, 191),
  ('Mariano Navone', 'Argentina', '2001-09-08', 'Right', '2HBH', 999, 2, true, null, 188),
  ('Francisco Cerundolo', 'Argentina', '1998-08-06', 'Right', '2HBH', 999, 2, true, null, 188),
  ('Marcos Giron', 'USA', '1993-07-24', 'Right', '2HBH', 999, 1, true, null, 193),
  ('Luciano Darderi', 'Italy', '2002-03-30', 'Right', '2HBH', 999, 2, true, null, 178),
  ('Hugo Gaston', 'France', '2000-09-26', 'Right', '1HBH', 999, 1, true, null, 175),
  ('Facundo Diaz Acosta', 'Argentina', '2000-11-13', 'Left', '2HBH', 999, 2, true, null, 185),
  ('Miomir Kecmanovic', 'Serbia', '1999-08-01', 'Right', '2HBH', 999, 2, true, null, 191),
  ('Tallon Griekspoor', 'Netherlands', '1996-08-04', 'Right', '2HBH', 999, 3, true, null, 196),
  ('Adrian Mannarino', 'France', '1988-05-29', 'Left', '1HBH', 999, 1, true, null, 182),
  ('Laslo Djere', 'Serbia', '1995-06-20', 'Right', '2HBH', 999, 3, true, null, 188),
  ('David Goffin', 'Belgium', '1990-12-07', 'Right', '1HBH', 999, 7, false, null, 180),
  ('Alexander Bublik', 'Kazakhstan', '1997-06-17', 'Right', '1HBH', 11, 6, true, null, 191),
  ('Hamad Medjedovic', 'Serbia', '2004-04-16', 'Right', '2HBH', 999, 1, true, null, 193),
  ('Christopher Eubanks', 'USA', '1996-05-12', 'Right', '2HBH', 999, 1, true, null, 203),
  ('Feliciano Lopez', 'Spain', '1981-09-20', 'Left', '1HBH', 999, 8, false, null, 188),
  ('Tommy Haas', 'Germany', '1978-04-03', 'Right', '1HBH', 999, 15, false, null, 193),
  ('Nikolay Davydenko', 'Russia', '1981-06-02', 'Right', '2HBH', 999, 21, false, null, 182),
  ('Marcos Baghdatis', 'Cyprus', '1985-05-17', 'Right', '2HBH', 999, 4, false, null, 185),
  ('Ernests Gulbis', 'Latvia', '1988-08-30', 'Right', '1HBH', 999, 6, false, null, 190)
-- On conflict: refresh static/bio fields only — do not overwrite ranking/titles
-- (those are maintained by `/api/update-stats` in production).
on conflict (name) do update set
  nat         = excluded.nat,
  dob         = excluded.dob,
  hand        = excluded.hand,
  bh          = excluded.bh,
  height_cm   = excluded.height_cm,
  active      = excluded.active,
  rapid_id    = excluded.rapid_id,
  updated_at  = now();
