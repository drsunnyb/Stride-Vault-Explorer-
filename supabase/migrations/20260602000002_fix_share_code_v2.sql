-- =====================================================================
-- Stride Quest — Fix player_share_code (round 2).
--
-- Previous attempt wrapped h to int32 after every iteration. JS doesn't.
-- JS's `<<` operator coerces its LEFT operand to int32 in place, but the
-- subsequent `+` operations are plain Number addition (53-bit safe).
-- So per iteration:
--   1. Coerce h → int32
--   2. shifted = (h_i32 * 32) coerced to int32 (the actual <<5 result)
--   3. h_new = shifted + h_i32 + charCode   (plain addition, no wrap)
-- The wrap only happens implicitly when the NEXT iteration does <<.
-- =====================================================================

begin;

create or replace function public.player_share_code(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_email text   := lower(trim(p_email));
  v_h     bigint := 5381;
  v_i32   bigint;            -- h coerced to int32 for the shift step
  v_shift bigint;            -- (i32 << 5) result, also int32
  v_i     int;
  v_b36   text;
  v_mask  constant bigint := 4294967295;     -- 2^32 - 1
  v_sign  constant bigint := 2147483648;     -- 2^31
  v_neg   constant bigint := 4294967296;     -- 2^32
begin
  for v_i in 1..length(v_email) loop
    -- Step 1: ToInt32(h) — wrap h into [-2^31, 2^31-1]
    v_i32 := v_h & v_mask;
    if v_i32 >= v_sign then v_i32 := v_i32 - v_neg; end if;

    -- Step 2: v_i32 << 5, coerced to int32
    v_shift := (v_i32 * 32) & v_mask;
    if v_shift >= v_sign then v_shift := v_shift - v_neg; end if;

    -- Step 3: ((h<<5) + h) + charCode — plain JS Number addition, no wrap
    v_h := v_shift + v_i32 + ascii(substr(v_email, v_i, 1));
  end loop;

  -- JS Math.abs on the final Number (no further coercion)
  v_h := abs(v_h);

  -- base36 conversion, lowercase, first 6 chars
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

-- Re-backfill profiles with corrected codes
update public.profiles
   set referral_code = public.player_share_code(email)
 where email is not null;

commit;
