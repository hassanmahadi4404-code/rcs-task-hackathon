-- Task platform: a Track is upcoming, running or finished.
--
-- The core gives a Track one switch, `archived`, which is "finished". A Track
-- that is planned but has not started needs a second one. The two together
-- are the three states; both on at once means nothing, so it cannot be saved.

alter table public.tracks
  add column upcoming boolean not null default false,
  add constraint tracks_one_status check (not (upcoming and archived));
