-- Run this in your Supabase SQL editor at supabase.com
-- Creates the players table. Age is calculated live from dob — never goes stale.
-- rapid_id is the player's ID from the RapidAPI, used to fetch titles automatically.

create table if not exists players (
  id          serial primary key,
  name        text not null unique,
  nat         text not null,
  dob         date,                          -- date of birth — age calculated from this
  hand        text not null check (hand in ('Right','Left')),
  bh          text not null check (bh in ('1HBH','2HBH')),
  ranking     integer not null default 999,
  titles      integer not null default 0,
  active      boolean not null default true,
  rapid_id    integer,                       -- RapidAPI player ID for auto title updates
  updated_at  timestamptz default now()
);

alter table players enable row level security;
create policy "Public read" on players for select using (true);

-- Seed data
-- rapid_id values come from the singlesRanking API response (player.id field)
-- For retired players, rapid_id is null — their stats don't change
insert into players (name, nat, dob, hand, bh, ranking, titles, active, rapid_id) values
('Novak Djokovic','Serbia','1987-05-22','Right','1HBH',4,97,true,5992),
('Carlos Alcaraz','Spain','2003-05-05','Right','2HBH',1,27,true,68074),
('Jannik Sinner','Italy','2001-08-16','Right','2HBH',2,21,true,47275),
('Rafael Nadal','Spain','1986-06-03','Left','2HBH',999,92,false,null),
('Roger Federer','Switzerland','1981-08-08','Right','1HBH',999,103,false,null),
('Andy Murray','Britain','1987-05-15','Right','2HBH',999,46,false,null),
('Daniil Medvedev','Russia','1996-02-11','Right','2HBH',10,20,true,22807),
('Alexander Zverev','Germany','1997-04-20','Right','2HBH',3,23,true,24008),
('Andrey Rublev','Russia','1997-10-20','Right','2HBH',999,16,true,null),
('Stefanos Tsitsipas','Greece','1998-08-12','Right','1HBH',999,10,true,null),
('Casper Ruud','Norway','1998-12-22','Right','2HBH',999,9,true,null),
('Holger Rune','Denmark','2003-04-29','Right','2HBH',999,5,true,null),
('Taylor Fritz','USA','1997-10-28','Right','2HBH',9,7,true,29932),
('Tommy Paul','USA','1997-05-17','Right','2HBH',999,3,true,null),
('Ben Shelton','USA','2002-10-09','Left','2HBH',8,2,true,87562),
('Frances Tiafoe','USA','1998-01-20','Right','2HBH',999,2,true,null),
('Grigor Dimitrov','Bulgaria','1991-05-16','Right','1HBH',999,9,true,null),
('Hubert Hurkacz','Poland','1997-02-11','Right','2HBH',999,11,true,null),
('Felix Auger-Aliassime','Canada','2000-08-08','Right','2HBH',7,7,true,40434),
('Lorenzo Musetti','Italy','2002-03-03','Left','1HBH',5,4,true,63572),
('Jack Draper','Britain','2001-12-22','Left','2HBH',999,2,true,null),
('Ugo Humbert','France','1998-06-26','Left','2HBH',999,5,true,null),
('Karen Khachanov','Russia','1996-05-21','Right','2HBH',999,9,true,null),
('Alex de Minaur','Australia','1999-02-17','Right','2HBH',6,11,true,39309),
('Matteo Berrettini','Italy','1996-04-12','Right','1HBH',999,10,true,null),
('Nick Kyrgios','Australia','1995-04-27','Right','1HBH',999,7,false,null),
('Gael Monfils','France','1986-09-01','Right','2HBH',999,12,false,null),
('Marin Cilic','Croatia','1988-09-28','Right','2HBH',999,20,false,null),
('Stan Wawrinka','Switzerland','1985-03-28','Right','1HBH',999,16,false,null),
('Andre Agassi','USA','1970-04-29','Right','2HBH',999,60,false,null),
('Pete Sampras','USA','1971-08-12','Right','1HBH',999,64,false,null),
('John McEnroe','USA','1959-02-16','Left','1HBH',999,77,false,null),
('Ivan Lendl','Czech Republic','1960-03-07','Right','2HBH',999,94,false,null),
('Boris Becker','Germany','1967-11-22','Right','2HBH',999,49,false,null),
('Stefan Edberg','Sweden','1966-01-19','Right','1HBH',999,42,false,null),
('Jimmy Connors','USA','1952-09-02','Left','2HBH',999,109,false,null),
('Bjorn Borg','Sweden','1956-06-06','Right','2HBH',999,64,false,null),
('Lleyton Hewitt','Australia','1981-02-24','Right','2HBH',999,30,false,null),
('Marat Safin','Russia','1980-01-27','Right','2HBH',999,15,false,null),
('Andy Roddick','USA','1982-08-30','Right','2HBH',999,32,false,null),
('Goran Ivanisevic','Croatia','1971-09-13','Left','1HBH',999,22,false,null),
('Pat Rafter','Australia','1972-12-28','Right','1HBH',999,11,false,null),
('Gustavo Kuerten','Brazil','1976-09-10','Right','1HBH',999,20,false,null),
('Thomas Muster','Austria','1967-10-02','Left','2HBH',999,44,false,null),
('Jim Courier','USA','1970-08-17','Right','2HBH',999,23,false,null),
('Michael Chang','USA','1972-02-22','Right','2HBH',999,34,false,null),
('Yevgeny Kafelnikov','Russia','1974-02-18','Right','2HBH',999,26,false,null),
('David Nalbandian','Argentina','1982-01-01','Right','2HBH',999,11,false,null),
('Richard Gasquet','France','1986-06-18','Right','1HBH',999,15,false,null),
('Robin Soderling','Sweden','1984-08-14','Right','2HBH',999,10,false,null),
('David Ferrer','Spain','1982-04-02','Right','2HBH',999,27,false,null),
('Tomas Berdych','Czech Republic','1985-09-17','Right','2HBH',999,13,false,null),
('Milos Raonic','Canada','1990-12-27','Right','2HBH',999,8,false,null),
('Kei Nishikori','Japan','1989-12-29','Right','2HBH',999,12,false,null),
('Juan Martin del Potro','Argentina','1988-09-23','Right','2HBH',999,22,false,null),
('Dominic Thiem','Austria','1993-09-03','Right','1HBH',999,17,false,null),
('Diego Schwartzman','Argentina','1992-08-16','Right','2HBH',999,3,true,null),
('Pablo Carreno Busta','Spain','1991-07-12','Right','2HBH',999,7,true,null),
('Borna Coric','Croatia','1996-11-14','Right','2HBH',999,5,true,null),
('Sebastian Baez','Argentina','2001-01-08','Right','2HBH',999,4,true,null),
('Jiri Lehecka','Czech Republic','2001-07-01','Right','2HBH',999,3,true,null),
('Arthur Fils','France','2004-05-19','Right','2HBH',999,3,true,null),
('Nuno Borges','Portugal','1997-02-14','Right','2HBH',999,3,true,null),
('Alexei Popyrin','Australia','1999-05-05','Right','2HBH',999,2,true,null),
('Jan-Lennard Struff','Germany','1990-04-25','Right','2HBH',999,2,true,null),
('Jo-Wilfried Tsonga','France','1985-04-17','Right','2HBH',999,18,false,null),
('Corentin Moutet','France','1999-05-06','Left','1HBH',999,1,true,null),
('Brandon Nakashima','USA','2001-09-30','Right','2HBH',999,1,true,null),
('Alejandro Davidovich Fokina','Spain','1999-06-05','Right','2HBH',999,2,true,null),
('Giovanni Mpetshi Perricard','France','2003-07-05','Right','2HBH',999,2,true,null),
('Flavio Cobolli','Italy','2002-05-06','Right','2HBH',999,2,true,null),
('Jakub Mensik','Czech Republic','2005-06-27','Right','1HBH',999,1,true,null),
('Learner Tien','USA','2005-10-08','Right','2HBH',999,1,true,null),
('Alexandre Muller','France','1997-11-25','Right','2HBH',999,1,true,null),
('Sebastian Korda','USA','2000-07-05','Right','2HBH',999,2,true,null),
('Lorenzo Sonego','Italy','1995-05-11','Right','2HBH',999,4,true,null),
('Roman Safiullin','Russia','1997-10-28','Right','2HBH',999,1,true,null),
('Mariano Navone','Argentina','2001-09-08','Right','2HBH',999,2,true,null),
('Francisco Cerundolo','Argentina','1998-08-06','Right','2HBH',999,2,true,null),
('Marcos Giron','USA','1993-07-24','Right','2HBH',999,1,true,null),
('Luciano Darderi','Italy','2002-03-30','Right','2HBH',999,2,true,null),
('Hugo Gaston','France','2000-09-26','Right','1HBH',999,1,true,null),
('Facundo Diaz Acosta','Argentina','2000-11-13','Left','2HBH',999,2,true,null),
('Miomir Kecmanovic','Serbia','1999-08-01','Right','2HBH',999,2,true,null),
('Tallon Griekspoor','Netherlands','1996-08-04','Right','2HBH',999,3,true,null),
('Adrian Mannarino','France','1988-05-29','Left','1HBH',999,1,true,null),
('Laslo Djere','Serbia','1995-06-20','Right','2HBH',999,3,true,null),
('David Goffin','Belgium','1990-12-07','Right','1HBH',999,7,false,null),
('Alexander Bublik','Kazakhstan','1997-06-17','Right','1HBH',11,6,true,null),
('Hamad Medjedovic','Serbia','2004-04-16','Right','2HBH',999,1,true,null),
('Christopher Eubanks','USA','1996-05-12','Right','2HBH',999,1,true,null),
('Feliciano Lopez','Spain','1981-09-20','Left','1HBH',999,8,false,null),
('Tommy Haas','Germany','1978-04-03','Right','1HBH',999,15,false,null),
('Nikolay Davydenko','Russia','1981-06-02','Right','2HBH',999,21,false,null),
('Marcos Baghdatis','Cyprus','1985-05-17','Right','2HBH',999,4,false,null),
('Ernests Gulbis','Latvia','1988-08-30','Right','1HBH',999,6,false,null)
on conflict (name) do nothing;

-- ── ADD NEW COLUMNS (run these if your table already exists) ──────────────────
alter table players add column if not exists height_cm  integer;
alter table players add column if not exists turned_pro integer;

-- ── UPDATE PLAYER DATA WITH HEIGHT + TURNED PRO ───────────────────────────────
-- Heights in cm, turned_pro = year
update players set height_cm=182, turned_pro=2018 where name='Carlos Alcaraz';
update players set height_cm=188, turned_pro=2003 where name='Novak Djokovic';
update players set height_cm=188, turned_pro=2018 where name='Jannik Sinner';
update players set height_cm=185, turned_pro=2005 where name='Rafael Nadal';
update players set height_cm=185, turned_pro=1998 where name='Roger Federer';
update players set height_cm=190, turned_pro=2005 where name='Andy Murray';
update players set height_cm=198, turned_pro=2014 where name='Daniil Medvedev';
update players set height_cm=198, turned_pro=2013 where name='Alexander Zverev';
update players set height_cm=188, turned_pro=2014 where name='Andrey Rublev';
update players set height_cm=193, turned_pro=2016 where name='Stefanos Tsitsipas';
update players set height_cm=193, turned_pro=2016 where name='Casper Ruud';
update players set height_cm=188, turned_pro=2019 where name='Holger Rune';
update players set height_cm=196, turned_pro=2015 where name='Taylor Fritz';
update players set height_cm=193, turned_pro=2016 where name='Tommy Paul';
update players set height_cm=193, turned_pro=2021 where name='Ben Shelton';
update players set height_cm=193, turned_pro=2017 where name='Frances Tiafoe';
update players set height_cm=191, turned_pro=2008 where name='Grigor Dimitrov';
update players set height_cm=196, turned_pro=2016 where name='Hubert Hurkacz';
update players set height_cm=193, turned_pro=2017 where name='Felix Auger-Aliassime';
update players set height_cm=191, turned_pro=2019 where name='Lorenzo Musetti';
update players set height_cm=191, turned_pro=2020 where name='Jack Draper';
update players set height_cm=180, turned_pro=2016 where name='Ugo Humbert';
update players set height_cm=198, turned_pro=2013 where name='Karen Khachanov';
update players set height_cm=183, turned_pro=2015 where name='Alex de Minaur';
update players set height_cm=196, turned_pro=2013 where name='Matteo Berrettini';
update players set height_cm=193, turned_pro=2012 where name='Nick Kyrgios';
update players set height_cm=193, turned_pro=2004 where name='Gael Monfils';
update players set height_cm=198, turned_pro=2006 where name='Marin Cilic';
update players set height_cm=183, turned_pro=2002 where name='Stan Wawrinka';
update players set height_cm=180, turned_pro=1986 where name='Andre Agassi';
update players set height_cm=185, turned_pro=1988 where name='Pete Sampras';
update players set height_cm=180, turned_pro=1978 where name='John McEnroe';
update players set height_cm=188, turned_pro=1978 where name='Ivan Lendl';
update players set height_cm=190, turned_pro=1984 where name='Boris Becker';
update players set height_cm=188, turned_pro=1983 where name='Stefan Edberg';
update players set height_cm=180, turned_pro=1972 where name='Jimmy Connors';
update players set height_cm=180, turned_pro=1973 where name='Bjorn Borg';
update players set height_cm=180, turned_pro=1998 where name='Lleyton Hewitt';
update players set height_cm=193, turned_pro=1997 where name='Marat Safin';
update players set height_cm=188, turned_pro=2000 where name='Andy Roddick';
update players set height_cm=193, turned_pro=1990 where name='Goran Ivanisevic';
update players set height_cm=183, turned_pro=1991 where name='Pat Rafter';
update players set height_cm=183, turned_pro=1995 where name='Gustavo Kuerten';
-- Fix: Muster plays 1HBH not 2HBH
update players set bh='1HBH', height_cm=185, turned_pro=1983 where name='Thomas Muster';
update players set height_cm=183, turned_pro=1988 where name='Jim Courier';
update players set height_cm=175, turned_pro=1988 where name='Michael Chang';
update players set height_cm=182, turned_pro=1992 where name='Yevgeny Kafelnikov';
update players set height_cm=183, turned_pro=1999 where name='David Nalbandian';
update players set height_cm=185, turned_pro=2002 where name='Richard Gasquet';
update players set height_cm=193, turned_pro=2001 where name='Robin Soderling';
update players set height_cm=175, turned_pro=2000 where name='David Ferrer';
update players set height_cm=196, turned_pro=2002 where name='Tomas Berdych';
update players set height_cm=196, turned_pro=2007 where name='Milos Raonic';
update players set height_cm=178, turned_pro=2007 where name='Kei Nishikori';
update players set height_cm=198, turned_pro=2007 where name='Juan Martin del Potro';
update players set height_cm=193, turned_pro=2011 where name='Dominic Thiem';
update players set height_cm=170, turned_pro=2010 where name='Diego Schwartzman';
update players set height_cm=191, turned_pro=2009 where name='Pablo Carreno Busta';
update players set height_cm=188, turned_pro=2014 where name='Borna Coric';
update players set height_cm=185, turned_pro=2018 where name='Sebastian Baez';
update players set height_cm=193, turned_pro=2019 where name='Jiri Lehecka';
update players set height_cm=183, turned_pro=2022 where name='Arthur Fils';
update players set height_cm=185, turned_pro=2016 where name='Nuno Borges';
update players set height_cm=196, turned_pro=2017 where name='Alexei Popyrin';
update players set height_cm=196, turned_pro=2009 where name='Jan-Lennard Struff';
update players set height_cm=191, turned_pro=2004 where name='Jo-Wilfried Tsonga';
update players set height_cm=175, turned_pro=2017 where name='Corentin Moutet';
update players set height_cm=191, turned_pro=2020 where name='Brandon Nakashima';
update players set height_cm=188, turned_pro=2017 where name='Alejandro Davidovich Fokina';
update players set height_cm=204, turned_pro=2021 where name='Giovanni Mpetshi Perricard';
update players set height_cm=183, turned_pro=2020 where name='Flavio Cobolli';
update players set height_cm=190, turned_pro=2023 where name='Jakub Mensik';
update players set height_cm=188, turned_pro=2023 where name='Learner Tien';
update players set height_cm=196, turned_pro=2016 where name='Alexandre Muller';
update players set height_cm=193, turned_pro=2018 where name='Sebastian Korda';
update players set height_cm=191, turned_pro=2013 where name='Lorenzo Sonego';
update players set height_cm=191, turned_pro=2015 where name='Roman Safiullin';
update players set height_cm=188, turned_pro=2019 where name='Mariano Navone';
update players set height_cm=188, turned_pro=2016 where name='Francisco Cerundolo';
update players set height_cm=193, turned_pro=2011 where name='Marcos Giron';
update players set height_cm=178, turned_pro=2020 where name='Luciano Darderi';
update players set height_cm=175, turned_pro=2018 where name='Hugo Gaston';
update players set height_cm=185, turned_pro=2018 where name='Facundo Diaz Acosta';
update players set height_cm=191, turned_pro=2016 where name='Miomir Kecmanovic';
update players set height_cm=196, turned_pro=2013 where name='Tallon Griekspoor';
update players set height_cm=182, turned_pro=2005 where name='Adrian Mannarino';
update players set height_cm=188, turned_pro=2013 where name='Laslo Djere';
update players set height_cm=180, turned_pro=2007 where name='David Goffin';
update players set height_cm=191, turned_pro=2014 where name='Alexander Bublik';
update players set height_cm=193, turned_pro=2022 where name='Hamad Medjedovic';
update players set height_cm=203, turned_pro=2014 where name='Christopher Eubanks';
update players set height_cm=188, turned_pro=1997 where name='Feliciano Lopez';
update players set height_cm=193, turned_pro=1994 where name='Tommy Haas';
update players set height_cm=182, turned_pro=1999 where name='Nikolay Davydenko';
update players set height_cm=185, turned_pro=2003 where name='Marcos Baghdatis';
update players set height_cm=190, turned_pro=2004 where name='Ernests Gulbis';
