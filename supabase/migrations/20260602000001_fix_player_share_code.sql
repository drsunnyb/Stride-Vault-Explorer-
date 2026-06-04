-- =====================================================================
-- Stride Quest — Fix player_share_code (20260602 migration had a bigint
-- overflow because we let h grow unbounded instead of wrapping every
-- iteration like JS's bitwise <<= forces).
--
-- Verified test vectors (vs landing/index.html hashCode in browser):
--   sandeep@officiallyinvested.com  → 2uzbgc
--   a@b.co                          → 4r1wxk
--   hermes-livetest+verify@stridequest.dev → qfxucw
-- =====================================================================

begin;

create or replace function public.player_share_code(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_email text := lower(trim(p_email));
  -- JS: `let h=5381; for (i){ h = ((h<<5)+h) + str.charCodeAt(i) }`
  -- JS's `<<` coerces h to a 32-bit signed int after every op. Mirror
  -- that exactly by masking + sign-correcting after every loop step.
  v_h     bigint := 5381;
  v_mask  bigint := 4294967295;            -- 2^32 - 1
  v_sign  bigint := 2147483648;            -- 2^31
  v_i     int;
  v_b36   text;
begin
  for v_i in 1..length(v_email) loop
    -- (h * 32) is identical to (h << 5) when h is in 32-bit signed range
    v_h := (v_h * 32) + v_h + ascii(substr(v_email, v_i, 1));
    -- wrap to uint32 first (force into [0, 2^32))
    v_h := v_h & v_mask;
    -- then reinterpret as int32 signed: high bit set ⇒ negative
    if v_h >= v_sign then
      v_h := v_h - 4294967296;
    end if;
  end loop;
  -- JS Math.abs
  v_h := abs(v_h);
  -- base36 conversion, lowercase, first 6 chars (left-padded with zeros
  -- if the number is short — matches JS toString(36).slice(0,6))
  declare
    v_chars text   := '0123456789abcdefghijklmnopqrstuvwxyz';
    v_out   text   := '';
    v_n     bigint := v_h;
  begin
    if v_n = 0 then return '000000'; end if;
    while v_n > 0 loop
      v_out := substr(v_chars, (v_n % 36)::int + 1, 1) || v_out;
      v_n := v_n / 36;
    end loop;
    v_b36 := v_out;
  end;
  return substr(v_b36, 1, 6);
end;
$$;

-- Re-backfill any rows where the broken function may have failed
update public.profiles
   set referral_code = public.player_share_code(email)
 where email is not null;

commit;
